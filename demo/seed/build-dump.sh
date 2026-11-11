#!/bin/sh
# Rebuilds db/oie-demo.sql.gz, the database the demo starts from.
#
# Starts an empty OIE in a separate compose project (other ports, the running demo
# is not touched), loads seed/generated/ through the REST API, plays the demo
# messages, puts the channels in their demo state, stops OIE and dumps the
# database. For maintainers: run it after changing seed/ (see seed/README.md).
#
# Needs: docker compose, curl. Run from anywhere.
set -eu

SEED_DIR="$(cd "$(dirname "$0")" && pwd)"
DEMO_DIR="$(dirname "$SEED_DIR")"
GENERATED="$SEED_DIR/generated"
MESSAGES="$SEED_DIR/messages"

PROJECT=oie-flow-ui-seed
PORT=${SEED_HTTPS_PORT:-8454}
API="https://localhost:$PORT/api"
ADMIN_PASSWORD="${OIE_PASSWORD:-demo-oie-password}"
USER_PASSWORD="${OIE_DEMO_PASSWORD:-demo-oie-password}"
RESPONSE=$(mktemp)
EMPTY_DB=$(mktemp -d)
trap 'rm -rf "$RESPONSE" "$EMPTY_DB"' EXIT

compose() {
  OIE_DEMO_DB_DIR="$EMPTY_DB" OIE_HTTPS_PORT="$PORT" OIE_CHANNEL_PORTS="18181-18199" \
    docker compose --project-directory "$DEMO_DIR" -f "$DEMO_DIR/compose.yaml" -p "$PROJECT" "$@"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# call METHOD PATH [CURL OPTIONS...]: authenticated REST call, body in $RESPONSE,
# fails unless HTTP 2xx.
call() {
  method=$1 path=$2
  shift 2
  status=$(curl --insecure --silent --show-error --max-time 300 --user "admin:$ADMIN_PASSWORD" \
    --header 'X-Requested-With: OpenAPI' --request "$method" --output "$RESPONSE" \
    --write-out '%{http_code}' "$@" "$API$path") || fail "$method $path: no answer"
  case "$status" in
    2??) ;;
    *) fail "$method $path: HTTP $status $(head -c 600 "$RESPONSE")" ;;
  esac
}

xml_value() {
  sed -n "s:.*<$1>\([^<]*\)</$1>.*:\1:p" "$RESPONSE" | head -n 1
}

echo "=== Empty OIE ($PROJECT, port $PORT)"
compose down --volumes --remove-orphans > /dev/null 2>&1 || true
compose up --detach --build --wait oie-app

echo "=== Accounts"
call PUT /users/1/preferences/firstlogin --header 'Content-Type: text/plain' --data false

echo "=== Channels"
for file in "$GENERATED"/channels/*.json; do
  id=$(sed -n 's/^    "id": "\(.*\)",$/\1/p' "$file" | head -n 1)
  echo "  $(basename "$file" .json)"
  call PUT "/channels/$id?override=true" --header 'Content-Type: application/json' --data-binary "@$file"
done

echo "=== Groups"
printf '{"set":{"string":[]}}' > "$EMPTY_DB/removed.json"
call POST "/channelgroups/_bulkUpdate?override=true" \
  --form "channelGroups=@$GENERATED/groups.json;type=application/json" \
  --form "removedChannelGroupIds=@$EMPTY_DB/removed.json;type=application/json"

echo "=== Deployment"
for file in "$GENERATED"/channels/*.json; do
  id=$(sed -n 's/^    "id": "\(.*\)",$/\1/p' "$file" | head -n 1)
  call POST "/channels/$id/_deploy?returnErrors=true"
  [ -s "$RESPONSE" ] && fail "deployment of $(basename "$file"): $(head -c 600 "$RESPONSE")"
done

echo "=== Roles and users"
role_id() {
  grep -l "<name>$1</name>" "$GENERATED"/roles/*.xml > /dev/null || fail "unknown role $1"
  cat "$EMPTY_DB/role-$(echo "$1" | tr ' ' '_')"
}
for file in "$GENERATED"/roles/*.xml; do
  call POST /extensions/rbac/roles --header "Content-Type: application/xml" --header "Accept: application/xml" --data-binary "@$file"
  name=$(sed -n 's:.*<name>\([^<]*\)</name>.*:\1:p' "$file")
  xml_value id > "$EMPTY_DB/role-$(echo "$name" | tr ' ' '_')"
  echo "  role $name"
done
while IFS='|' read -r username first last role; do
  [ -n "$username" ] || continue
  call POST /users --header 'Content-Type: application/json' \
    --data "{\"user\":{\"username\":\"$username\",\"firstName\":\"$first\",\"lastName\":\"$last\",\"organization\":\"North Hospital\",\"email\":\"$username@hospital.example\"}}"
  call GET "/users/$username" --header 'Accept: application/xml'
  user_id=$(xml_value id)
  call PUT "/users/$user_id/password" --header 'Content-Type: text/plain' --data "$USER_PASSWORD"
  call PUT "/users/$user_id/preferences/firstlogin" --header 'Content-Type: text/plain' --data false
  call POST "/extensions/rbac/users/$user_id/role/$(role_id "$role")"
  echo "  user $username ($role)"
done < "$GENERATED/users.txt"

echo "=== Messages"
while IFS='|' read -r id file times destinations name; do
  [ -n "$id" ] || continue
  query=$(echo "$destinations" | sed 's/^/destinationMetaDataId=/; s/,/\&destinationMetaDataId=/g')
  n=1
  while [ "$n" -le "$times" ]; do
    stamp=$(date +%Y%m%d%H%M%S)
    sed -e "s/{{n}}/$(printf '%05d' "$n")/g" -e "s/{{ts}}/$stamp/g" "$MESSAGES/$file" > "$EMPTY_DB/message"
    call POST "/channels/$id/messages?$query" --header 'Content-Type: text/plain; charset=UTF-8' --data-binary "@$EMPTY_DB/message"
    n=$((n + 1))
  done
  echo "  $name: $times × $file"
done < "$GENERATED/messages.txt"

echo "=== Channel states"
sleep 15  # let queued and chained messages settle
while IFS='|' read -r id state name; do
  [ -n "$id" ] || continue
  case "$state" in
    PAUSED) call POST "/channels/$id/_pause" ;;
    STOPPED) call POST "/channels/$id/_stop" ;;
    *) fail "unknown state $state" ;;
  esac
  call POST "/channels/$id/initialState/$state"
  echo "  $name: $state"
done < "$GENERATED/states.txt"

echo "=== Dump"
compose stop oie-app
mkdir -p "$DEMO_DIR/db"
compose exec -T oie-db pg_dump --username=oie --no-owner --no-privileges oie | gzip -9 > "$DEMO_DIR/db/oie-demo.sql.gz"
compose down --volumes --remove-orphans
echo "=== Done: demo/db/oie-demo.sql.gz ($(du -h "$DEMO_DIR/db/oie-demo.sql.gz" | cut -f1))"
