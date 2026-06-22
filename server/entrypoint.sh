#!/bin/sh
mkdir -p /root/.config/higgsfield
printf '{"access_token":"%s","refresh_token":"%s"}' "$HF_ACCESS_TOKEN" "$HF_REFRESH_TOKEN" \
  > /root/.config/higgsfield/credentials.json
exec node index.js
