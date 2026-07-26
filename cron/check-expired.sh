#!/bin/sh
. /etc/environment

curl -sf -X POST \
  -H "X-Cron-Secret: ${CRON_SECRET}" \
  "${APP_INTERNAL_URL:-http://web:3000}/api/cron/check-expired"
