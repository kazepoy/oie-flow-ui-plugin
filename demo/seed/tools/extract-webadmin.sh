#!/bin/sh
# Extracts the web administrator of the demo image into seed/.webadmin/, for
# tools/generate.mjs. Build the image first: docker compose build oie-app
set -eu
cd "$(dirname "$0")/.."
IMAGE="${OIE_DEMO_IMAGE:-oie-flow-ui-demo-oie:4.7.0}"
TARGET=.webadmin

container=$(docker create "$IMAGE")
trap 'docker rm "$container" > /dev/null' EXIT
rm -rf "$TARGET" && mkdir -p "$TARGET"
docker cp "$container:/opt/engine/extensions/websupport/oie-webadmin.war" "$TARGET/oie-webadmin.war"
(cd "$TARGET" && unzip -q oie-webadmin.war && rm oie-webadmin.war)
echo "Web Admin extracted to demo/seed/$TARGET"
