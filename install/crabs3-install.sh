#!/usr/bin/env bash

# Copyright (c) 2021-2026 community-scripts ORG
# Author: DoctorPok42
# License: MIT | https://github.com/community-scripts/ProxmoxVED/raw/main/LICENSE
# Source: https://github.com/DoctorPok42/CrabS3

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Dependencies"
$STD apt install -y \
  build-essential \
  python3 \
  openssl \
  clamav-daemon \
  clamav-freshclam
msg_ok "Installed Dependencies"

NODE_VERSION="22" setup_nodejs
PG_VERSION="17" setup_postgresql
PG_DB_NAME="crabs3" PG_DB_USER="crabs3" setup_postgresql_db

msg_info "Configuring ClamAV"
# The app talks to clamd over TCP (INSTREAM), Debian only ships the Unix socket by default.
cat <<EOF >>/etc/clamav/clamd.conf
TCPSocket 3310
TCPAddr 127.0.0.1
EOF
# Defaults are far too small for a file-transfer app (25M); raise them to match
# what CrabS3 is actually designed to move.
sed -i \
  -e 's/^MaxFileSize .*/MaxFileSize 100M/' \
  -e 's/^MaxScanSize .*/MaxScanSize 400M/' \
  -e 's/^StreamMaxLength .*/StreamMaxLength 400M/' \
  /etc/clamav/clamd.conf
systemctl stop clamav-freshclam 2>/dev/null || true
# clamav-daemon.socket refuses to start until a virus database exists, so fetch
# one now instead of racing the background updater.
if $STD freshclam; then
  systemctl enable -q --now clamav-freshclam
  systemctl enable -q --now clamav-daemon
else
  msg_warn "ClamAV database download failed - it will retry in the background; uploads will skip scanning until it succeeds"
  systemctl enable -q clamav-freshclam
  systemctl start clamav-freshclam 2>/dev/null || true
fi
msg_ok "Configured ClamAV"

if [[ -z "${var_s3_endpoint:-}" ]]; then
  read -r -p "${TAB3}S3 endpoint URL (e.g. http://192.168.1.50:9000): " var_s3_endpoint
fi
if [[ -z "${var_s3_access_key:-}" ]]; then
  read -r -p "${TAB3}S3 access key: " var_s3_access_key
fi
if [[ -z "${var_s3_secret_key:-}" ]]; then
  read -r -p "${TAB3}S3 secret key: " var_s3_secret_key
fi
var_s3_bucket="${var_s3_bucket:-crabs3}"
var_admin_email="${var_admin_email:-admin@crabs3.local}"

fetch_and_deploy_gh_branch "crabs3" "DoctorPok42/CrabS3"

msg_info "Configuring CrabS3"
cat <<EOF >/opt/crabs3/.env
DATABASE_URL=postgresql://${PG_DB_USER}:${PG_DB_PASS}@127.0.0.1:5432/${PG_DB_NAME}
NEXT_PUBLIC_BASE_URL=http://${LOCAL_IP}:3000
NEXT_PUBLIC_SITE_URL=http://${LOCAL_IP}:3000
# This install has no TLS in front by default, so the session cookie must not
# be marked Secure or browsers silently drop it after login. If you put a
# reverse proxy with a real certificate in front of this container, switch
# this to true and update the two URLs above to https://.
COOKIE_SECURE=false
JWT_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
LOG_MIN_LEVEL=INFO
EXPIRED_FILE_POLICY=cold

S3_ENDPOINT=${var_s3_endpoint}
S3_ACCESS_KEY_ID=${var_s3_access_key}
S3_SECRET_ACCESS_KEY=${var_s3_secret_key}
S3_BUCKET_NAME=${var_s3_bucket}
S3_REGION=us-east-1

CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310

SEED_ADMIN_EMAIL=${var_admin_email}
SEED_ADMIN_NAME=Admin

# Optional: outgoing mail for share/expiry notifications
#SMTP_HOST=
#SMTP_USER=
#SMTP_PASS=
#SMTP_FROM=CrabS3 <noreply@example.com>
EOF
chmod 600 /opt/crabs3/.env
msg_ok "Configured CrabS3"

msg_info "Building CrabS3 (Patience)"
cd /opt/crabs3 || exit
$STD npm ci
set -a
# shellcheck source=/dev/null
source /opt/crabs3/.env
set +a
$STD npx prisma generate
$STD npx prisma migrate deploy
$STD npm run build
msg_ok "Built CrabS3"

msg_info "Seeding admin account"
# install/seed-admin.mjs in the repo is now the fixed, canonical version
SEED_OUTPUT=$(npx tsx /opt/crabs3/install/seed-admin.mjs)
rm -f /opt/crabs3/install/seed-admin.mjs

if echo "$SEED_OUTPUT" | grep -q "^ADMIN_EMAIL="; then
  ADMIN_EMAIL_OUT=$(echo "$SEED_OUTPUT" | grep "^ADMIN_EMAIL=" | cut -d= -f2-)
  ADMIN_PASSWORD_OUT=$(echo "$SEED_OUTPUT" | grep "^ADMIN_PASSWORD=" | cut -d= -f2-)
  msg_ok "Seeded admin account"
else
  msg_ok "Admin account already present"
fi

msg_info "Creating Service"
cat <<EOF >/etc/systemd/system/crabs3.service
[Unit]
Description=CrabS3
Wants=network-online.target
After=network-online.target postgresql.service clamav-daemon.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/crabs3
EnvironmentFile=/opt/crabs3/.env
ExecStart=/opt/crabs3/node_modules/.bin/next start -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl enable -q --now crabs3
msg_ok "Created Service"

msg_info "Creating Cron Service"
cat <<EOF >/etc/systemd/system/crabs3-cron.service
[Unit]
Description=CrabS3 expiry and cleanup job
After=network.target crabs3.service

[Service]
Type=oneshot
EnvironmentFile=/opt/crabs3/.env
ExecStart=/usr/bin/curl -sf -X POST -H "X-Cron-Secret: \${CRON_SECRET}" http://127.0.0.1:3000/api/cron/check-expired
EOF
cat <<EOF >/etc/systemd/system/crabs3-cron.timer
[Unit]
Description=Run CrabS3 expiry and cleanup job hourly

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl enable -q --now crabs3-cron.timer
msg_ok "Created Cron Service"

if [[ -n "${ADMIN_EMAIL_OUT:-}" ]]; then
  echo -e "\n  First admin account (save this, it will not be shown again):"
  echo -e "    Email:    ${ADMIN_EMAIL_OUT}"
  echo -e "    Password: ${ADMIN_PASSWORD_OUT}\n"
fi
if [[ -z "${var_s3_endpoint}" ]]; then
  msg_warn "No S3 credentials were provided - edit /opt/crabs3/.env and 'systemctl restart crabs3' before using CrabS3"
fi

motd_ssh
customize
cleanup_lxc
