#!/bin/sh
# Sends demo messages without end, one every TRAFFIC_INTERVAL seconds, so the
# counters of Flows Monitoring keep moving. Started by the "traffic" profile:
#   docker compose --profile traffic up -d
# Uses the REST API (seed/generated/messages.txt), skipping paused and stopped channels.
set -eu
SEED="${SEED_DIR:-/seed}"
API="${OIE_URL:-https://oie-app:8443/api}"
INTERVAL="${TRAFFIC_INTERVAL:-3}"
BODY=/tmp/message

grep -v '^$' "$SEED/generated/messages.txt" > /tmp/plan
cut -d'|' -f1 "$SEED/generated/states.txt" > /tmp/skip
echo "Traffic: one message every ${INTERVAL}s to $API"
n=1
while true; do
  while IFS='|' read -r id file times destinations name; do
    grep -q "$id" /tmp/skip && continue
    query=$(echo "$destinations" | sed 's/^/destinationMetaDataId=/; s/,/\&destinationMetaDataId=/g')
    sed -e "s/{{n}}/T$(printf '%05d' "$n")/g" -e "s/{{ts}}/$(date +%Y%m%d%H%M%S)/g" "$SEED/messages/$file" > "$BODY"
    curl --insecure --silent --output /dev/null --max-time 60 --user "admin:${OIE_PASSWORD:-demo-flow-ui-admin}" \
      --header 'X-Requested-With: OpenAPI' --header 'Content-Type: text/plain; charset=UTF-8' \
      --data-binary "@$BODY" "$API/channels/$id/messages?$query" || echo "not sent: $name"
    n=$((n + 1))
    sleep "$INTERVAL"
  done < /tmp/plan
done
