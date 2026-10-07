#!/bin/sh
# Container entrypoint on Railway (Dockerfile): the Astro Node server on
# localhost and Caddy in front of it on $PORT (Caddyfile). If either one
# exits, the other is stopped and the container exits, so Railway restarts
# it instead of leaving half a site running.
set -u

NODE_PORT="${NODE_PORT:-4321}"
export NODE_PORT

HOST=127.0.0.1 PORT="$NODE_PORT" node dist/server/entry.mjs &
node_pid=$!

caddy run --config "${CADDYFILE:-/etc/caddy/Caddyfile}" --adapter caddyfile &
caddy_pid=$!

stop() {
  kill -TERM "$node_pid" "$caddy_pid" 2>/dev/null
  wait
}
trap 'stop; exit 0' TERM INT

while kill -0 "$node_pid" 2>/dev/null && kill -0 "$caddy_pid" 2>/dev/null; do
  sleep 1
done
echo "start.sh: a server exited; stopping the container" >&2
stop
exit 1
