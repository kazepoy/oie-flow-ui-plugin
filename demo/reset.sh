#!/bin/sh
# Puts the demo back in its initial state: the database is reloaded from
# db/oie-demo.sql.gz, every change made since is lost.
set -eu
cd "$(dirname "$0")"
docker compose down --volumes
docker compose up --detach --wait oie-app
echo "Demo reset: https://localhost:${OIE_HTTPS_PORT:-8444}/oie-webadmin/"
