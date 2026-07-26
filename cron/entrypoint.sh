#!/bin/sh
set -e

env | grep -E '^(CRON_SECRET|APP_INTERNAL_URL)=' > /etc/environment

touch /var/log/cron.log
crond -f -l 2
