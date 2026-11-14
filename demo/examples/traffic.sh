#!/bin/sh
# Sends demo messages without end in weighted round-robin rounds (using counts
# in messages.txt), spaced by TRAFFIC_INTERVAL seconds, skipping paused/stopped.
# Started automatically by compose once oie-init completes (docker compose up -d).
set -eu
DATA_DIR="${DATA_DIR:-/oie-init/data}"
API="${OIE_URL:-https://oie-app:8443/api}"
INTERVAL="${TRAFFIC_INTERVAL:-0.2}"
BODY=/tmp/message

grep -v '^$' "$DATA_DIR/messages.txt" > /tmp/plan
if [ -f "$DATA_DIR/states.txt" ]; then
  cut -d'|' -f1 "$DATA_DIR/states.txt" | grep -v '^$' > /tmp/skip || : > /tmp/skip
else
  : > /tmp/skip
fi
echo "Traffic: weighted round-robin every ${INTERVAL}s to $API"
n=1
while true; do
  r=1
  while true; do
    sent=0
    while IFS='|' read -r id file times destinations name; do
      [ -s /tmp/skip ] && grep -qxF "$id" /tmp/skip && continue
      [ "$r" -le "$times" ] || continue
      sent=1
      query=$(echo "$destinations" | sed 's/^/destinationMetaDataId=/; s/,/\&destinationMetaDataId=/g')
      sed -e "s/{{n}}/T$(printf '%05d' "$n")/g" -e "s/{{ts}}/$(date +%Y%m%d%H%M%S)/g" "$DATA_DIR/messages/$file" > "$BODY"
      curl --insecure --noproxy '*' --silent --output /dev/null --max-time 60 \
        --user "admin:${OIE_PASSWORD:-demo-oie-password}" \
        --header 'X-Requested-With: OpenAPI' --header 'Content-Type: text/plain; charset=UTF-8' \
        --data-binary "@$BODY" "$API/channels/$id/messages?$query" || echo "not sent: $name"
      n=$((n + 1))
      sleep "$INTERVAL"
    done < /tmp/plan
    [ "$sent" -eq 1 ] || break
    r=$((r + 1))
  done
done
