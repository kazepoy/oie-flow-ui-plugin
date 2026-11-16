#!/bin/sh
# Initializes OIE via its REST API from demo/oie-init/data:
#   1. Creates demo user accounts and sets firstlogin=false.
#   2. Restores base server configuration (channelTags + Flow UI defaults).
#   3. Imports channels and channel groups (standard OIE XML).
#   4. Imports RBAC roles (via native _import API) and assigns user roles.
#   5. Deploys all channels, seeds sample messages, sets initial states.
set -eu

OIE_URL="${OIE_URL:-https://oie-app:8443}"
OIE_USER="${OIE_USER:-admin}"
OIE_PASSWORD="${OIE_PASSWORD:-admin}"
USER_PASSWORD="${OIE_DEMO_USER_PASSWORD:-$OIE_PASSWORD}"
OIE_SKIP_FIRST_LOGIN="${OIE_SKIP_FIRST_LOGIN:-true}"
INIT_DIR="${OIE_INIT_DIR:-/oie-init}"
DATA_DIR="$INIT_DIR/data"
CONFIG_FILE="$DATA_DIR/configuration.xml"
RESPONSE_FILE=/tmp/oie-response.txt

cleanup() {
  rm -rf "$RESPONSE_FILE" /tmp/oie-deploy-ids.xml /tmp/oie-groups-bulk.xml \
    /tmp/oie-empty-set.xml /tmp/oie-rbac-roles.xml /tmp/oie-user-roles.txt \
    /tmp/oie-user.xml /tmp/oie-user-pass.txt /tmp/oie-firstlogin.txt /tmp/oie-msg
}
trap cleanup EXIT

fail() {
  echo "  -> ERROR: $*" >&2
  exit 1
}

# request METHOD PATH [FILE [CONTENT_TYPE [ACCEPT]]]
request() {
  method=$1 path=$2 file=${3:-} content_type=${4:-application/xml} accept=${5:-*/*}
  if [ -n "$file" ]; then
    curl --insecure --noproxy '*' --silent --show-error --max-time 300 \
      --user "$OIE_USER:$OIE_PASSWORD" --header 'X-Requested-With: OpenAPI' \
      --header "Accept: $accept" --header "Content-Type: $content_type" \
      --data-binary "@$file" --request "$method" --output "$RESPONSE_FILE" \
      --write-out '%{http_code}' "$OIE_URL/api$path" || fail "unreachable: $method $path"
  else
    curl --insecure --noproxy '*' --silent --show-error --max-time 300 \
      --user "$OIE_USER:$OIE_PASSWORD" --header 'X-Requested-With: OpenAPI' \
      --header "Accept: $accept" --request "$method" --output "$RESPONSE_FILE" \
      --write-out '%{http_code}' "$OIE_URL/api$path" || fail "unreachable: $method $path"
  fi
}

# api METHOD PATH [FILE [CONTENT_TYPE [ACCEPT]]]
api() {
  status=$(request "$@")
  case "$status" in
    2??) ;;
    *) fail "HTTP $status on $1 $2: $(cat "$RESPONSE_FILE")" ;;
  esac
  if grep -qE '<boolean>false</boolean>|"boolean" *: *false|^false$' "$RESPONSE_FILE"; then
    fail "OIE rejected $1 $2: $(cat "$RESPONSE_FILE")"
  fi
}

xml_value() {
  sed -n "s:.*<$1>\([^<]*\)</$1>.*:\1:p" "$2" | head -n 1
}

role_id() {
  awk -v target="$1" '
    /<com\.diridium\.rbac\.Role>/ { id=""; matched=0 }
    /<id>/ { s=$0; sub(/.*<id>/, "", s); sub(/<\/id>.*/, "", s); id=s }
    /<name>/ { s=$0; sub(/.*<name>/, "", s); sub(/<\/name>.*/, "", s); if (s == target) matched=1 }
    /<\/com\.diridium\.rbac\.Role>/ { if (matched) { print id; exit } }
  ' /tmp/oie-rbac-roles.xml
}

now_ms() {
  if [ -r /proc/uptime ]; then
    awk '{printf "%.0f", $1 * 1000}' /proc/uptime
  else
    echo $(( $(date +%s) * 1000 ))
  fi
}

format_ms() {
  awk -v ms="$1" 'BEGIN { printf "%.2fs", ms / 1000 }'
}

log_step() {
  now=$(now_ms)
  dur=$((now - step_t0))
  step_t0=$now
  printf '%s (%s)\n' "$1" "$(format_ms "$dur")"
}

init_t0=$(now_ms)
step_t0=$init_t0
echo "=== OIE Demo Init ($OIE_URL) ==="

# 1. Users (admin firstlogin + demo accounts created with passwords before config/channels).
printf 'false' > /tmp/oie-firstlogin.txt
if [ "$OIE_SKIP_FIRST_LOGIN" = true ]; then
  api GET "/users/$OIE_USER" "" application/xml application/xml
  admin_id=$(xml_value id "$RESPONSE_FILE")
  [ -n "$admin_id" ] || fail "User id not found for $OIE_USER"
  api PUT "/users/$admin_id/preferences/firstlogin" /tmp/oie-firstlogin.txt text/plain '*/*'
  log_step "Marked firstlogin=false for $OIE_USER"
fi

: > /tmp/oie-user-roles.txt
while IFS='|' read -r username first last role; do
  [ -n "$username" ] || continue
  status=$(request GET "/users/$username" "" application/xml application/xml)
  if [ "$status" != "200" ]; then
    cat > /tmp/oie-user.xml <<EOF
<user>
  <username>$username</username>
  <email>${username}@hospital.example</email>
  <firstName>$first</firstName>
  <lastName>$last</lastName>
  <organization>North Hospital</organization>
</user>
EOF
    api POST /users /tmp/oie-user.xml
    api GET "/users/$username" "" application/xml application/xml
  fi
  user_id=$(xml_value id "$RESPONSE_FILE")
  [ -n "$user_id" ] || fail "User id not found for $username"
  printf '%s' "$USER_PASSWORD" > /tmp/oie-user-pass.txt
  api PUT "/users/$user_id/password" /tmp/oie-user-pass.txt text/plain '*/*'
  api PUT "/users/$user_id/preferences/firstlogin" /tmp/oie-firstlogin.txt text/plain '*/*'
  printf '%s|%s\n' "$user_id" "$role" >> /tmp/oie-user-roles.txt
done < "$DATA_DIR/users.txt"
log_step "Configured demo users"

# 2. Base server configuration (resets channels, groups, keeps tags and Flow UI defaults).
[ -f "$CONFIG_FILE" ] || fail "Missing configuration file: $CONFIG_FILE"
echo "Restoring base server configuration..."
api PUT "/server/configuration?deploy=true&overwriteConfigMap=true" "$CONFIG_FILE" application/xml application/json
log_step "Restored base server configuration"

# 3. Channels.
count=0
printf '<set>\n' > /tmp/oie-deploy-ids.xml
for file in "$DATA_DIR"/channels/*.xml; do
  [ -f "$file" ] || continue
  id=$(xml_value id "$file")
  [ -n "$id" ] || fail "Channel id not found in $file"
  api PUT "/channels/$id?override=true" "$file"
  printf '  <string>%s</string>\n' "$id" >> /tmp/oie-deploy-ids.xml
  count=$((count + 1))
done
printf '</set>\n' >> /tmp/oie-deploy-ids.xml
log_step "Imported $count channels"

api GET /channels "" application/xml application/json
if grep -Fq "This channel is invalid." "$RESPONSE_FILE"; then
  fail "At least one channel is invalid after import"
fi

# 4. Channel groups.
printf '<set>\n' > /tmp/oie-groups-bulk.xml
group_count=0
for file in "$DATA_DIR"/groups/*.xml; do
  [ -f "$file" ] || continue
  awk '$0 !~ /^<\/?set[^>]*>/ { print }' "$file" >> /tmp/oie-groups-bulk.xml
  group_count=$((group_count + 1))
done
printf '</set>\n' >> /tmp/oie-groups-bulk.xml
if [ "$group_count" -gt 0 ]; then
  printf '<set/>\n' > /tmp/oie-empty-set.xml
  status=$(curl --insecure --noproxy '*' --silent --show-error --max-time 300 \
    --user "$OIE_USER:$OIE_PASSWORD" --header 'X-Requested-With: OpenAPI' \
    --form "channelGroups=@/tmp/oie-groups-bulk.xml;type=application/xml" \
    --form "removedChannelGroupIds=@/tmp/oie-empty-set.xml;type=application/xml" \
    --output "$RESPONSE_FILE" --write-out '%{http_code}' \
    "$OIE_URL/api/channelgroups/_bulkUpdate?override=true") || fail "channelgroups update failed"
  case "$status" in
    2??) ;;
    *) fail "HTTP $status on /channelgroups/_bulkUpdate: $(cat "$RESPONSE_FILE")" ;;
  esac
  log_step "Imported $group_count channel groups"
fi

# 5. RBAC roles (native RBAC _import API after channels exist so channel restrictions match) and assignments.
api POST "/extensions/rbac/roles/_import?dryRun=true&applyChannels=true" "$DATA_DIR/roles.xml" text/plain application/xml
if grep -Fq "<importable>false</importable>" "$RESPONSE_FILE"; then
  fail "RBAC role import refused: $(cat "$RESPONSE_FILE")"
fi
token=$(xml_value planToken "$RESPONSE_FILE")
[ -n "$token" ] || fail "RBAC import did not return a planToken: $(cat "$RESPONSE_FILE")"
picks=$(awk '
  /<com\.diridium\.rbac\.RoleImportRow>/ { idx=""; action="" }
  /<index>/ { s=$0; sub(/.*<index>/, "", s); sub(/<\/index>.*/, "", s); idx=s }
  /<action>/ { s=$0; sub(/.*<action>/, "", s); sub(/<\/action>.*/, "", s); action=s }
  /<\/com\.diridium\.rbac\.RoleImportRow>/ {
    if (action == "CREATE" || action == "OVERWRITE") printf "&pick=%s", idx
    if (action == "SKIP") exit 2
  }
' "$RESPONSE_FILE") || fail "RBAC role import skipped a role: $(cat "$RESPONSE_FILE")"
if [ -n "$picks" ]; then
  api POST "/extensions/rbac/roles/_import?dryRun=false&applyChannels=true&planToken=${token}${picks}" "$DATA_DIR/roles.xml" text/plain application/xml
fi
api GET /extensions/rbac/roles "" application/xml application/xml
cp "$RESPONSE_FILE" /tmp/oie-rbac-roles.xml
while IFS='|' read -r user_id role; do
  [ -n "$user_id" ] || continue
  r_id=$(role_id "$role")
  [ -n "$r_id" ] || fail "RBAC role id not found for $role"
  api POST "/extensions/rbac/users/$user_id/role/$r_id"
done < /tmp/oie-user-roles.txt
log_step "Configured RBAC roles"

# 6. Deploy all channels.
if [ "$count" -gt 0 ]; then
  echo "Deploying $count channels..."
  api POST "/channels/_deploy?returnErrors=true" /tmp/oie-deploy-ids.xml
  [ -s "$RESPONSE_FILE" ] && fail "Deploy rejected: $(cat "$RESPONSE_FILE")"
  log_step "Deployed $count channels"
fi

pre_msg_ms=$(( $(now_ms) - init_t0 ))
printf 'Pre-message setup elapsed: %s\n' "$(format_ms "$pre_msg_ms")"

# 7. Send initial sample messages via REST API so counters and states are populated.
total_msgs=0
while IFS='|' read -r id file times destinations name; do
  [ -n "$id" ] || continue
  query=$(echo "$destinations" | sed 's/^/destinationMetaDataId=/; s/,/\&destinationMetaDataId=/g')
  n=1
  while [ "$n" -le "$times" ]; do
    stamp=$(date +%Y%m%d%H%M%S)
    sed -e "s/{{n}}/$(printf '%05d' "$n")/g" -e "s/{{ts}}/$stamp/g" "$DATA_DIR/messages/$file" > /tmp/oie-msg
    api POST "/channels/$id/messages?$query" /tmp/oie-msg 'text/plain; charset=UTF-8'
    n=$((n + 1))
    total_msgs=$((total_msgs + 1))
  done
done < "$DATA_DIR/messages.txt"
log_step "Seeded $total_msgs sample messages"

# 8. Let queued/chained messages settle, then apply optional initial channel states.
sleep 5
if [ -f "$DATA_DIR/states.txt" ]; then
  while IFS='|' read -r id state name; do
    [ -n "$id" ] || continue
    case "$state" in
      PAUSED) api POST "/channels/$id/_pause" ;;
      STOPPED) api POST "/channels/$id/_stop" ;;
      *) fail "Unknown channel state $state" ;;
    esac
    api POST "/channels/$id/initialState/$state"
    echo "Set state $name -> $state"
  done < "$DATA_DIR/states.txt"
fi
if [ -f "$DATA_DIR/connector-states.txt" ]; then
  while IFS='|' read -r id meta state name; do
    [ -n "$id" ] || continue
    case "$state" in
      STOPPED) api POST "/channels/$id/connector/$meta/_stop" ;;
      STARTED) api POST "/channels/$id/connector/$meta/_start" ;;
      *) fail "Unknown connector state $state" ;;
    esac
    echo "Set connector state $name -> $state"
  done < "$DATA_DIR/connector-states.txt"
fi
log_step "Settled queued/chained messages"

total_ms=$(( $(now_ms) - init_t0 ))
printf '=== Done: %s channels ready (total %s) ===\n' "$count" "$(format_ms "$total_ms")"
