#!/bin/sh
# Sends a demo message to a channel of the running demo, through its real
# listener, so counters move in Flows Monitoring.
#
#   ./send.sh adt          admission to ADT · HIS inbound (MLLP 8181)
#   ./send.sh result       laboratory result to LAB · Results from LIS (MLLP 8184)
#   ./send.sh critical     critical result (MLLP 8184): pages the biologist
#   ./send.sh incomplete   incomplete result (MLLP 8184): fails validation
#   ./send.sh claim        insurance claim to BILL · Claims to insurer (HTTP 8189): queued
#   ./send.sh hie          patient summary request to HIE · Regional exchange API (HTTP 8190)
#
# Needs nc (MLLP) and curl (HTTP). DEMO_HOST defaults to localhost.
set -eu
cd "$(dirname "$0")/../seed/messages"
HOST="${DEMO_HOST:-localhost}"
n=$(date +%H%M%S)
stamp=$(date +%Y%m%d%H%M%S)

fill() {
  sed -e "s/{{n}}/$n/g" -e "s/{{ts}}/$stamp/g" "$1"
}

# MLLP frame: <VT> message (segments ended by CR) <FS><CR>; prints the acknowledgement.
mllp() {
  { printf '\013'; fill "$2" | tr '\n' '\r'; printf '\034\015'; } | nc -w 3 "$HOST" "$1" | tr '\r\013\034' '\n  '
  echo
}

http() {
  fill "$3" | curl --silent --show-error --header "Content-Type: $4" --data-binary @- "http://$HOST:$1$2"
  echo
}

case "${1:-}" in
  adt) mllp 8181 adt-a01.hl7 ;;
  result) mllp 8184 oru-r01.hl7 ;;
  critical) mllp 8184 oru-r01-critical.hl7 ;;
  incomplete) mllp 8184 oru-r01-incomplete.hl7 ;;
  claim) http 8189 /claims/ claim.json application/json ;;
  hie) http 8190 /hie/ hie-request.json application/json ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
