#!/usr/bin/env bash

# Copyright (c) 2021-2026 community-scripts ORG (adapted)
# Author: DoctorPok42
# License: MIT
# Source: https://github.com/DoctorPok42/crabS3

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Docker Engine"
$STD apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
$STD apt-get update
$STD apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
msg_ok "Installed Docker Engine"

msg_info "Preparing configuration"
mkdir -p /opt/crabs3
cd /opt/crabs3 || exit

DB_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
UPLOAD_TOKEN_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)

read -rp "${TAB3}DockerHub image (ex: doctorpok/crabs3): " CRABS3_IMAGE
CRABS3_IMAGE="${CRABS3_IMAGE:-doctorpok/crabs3}"

read -rp "${TAB3}S3 Hot endpoint (ex: http://192.168.1.100:9000): " S3_HOT_ENDPOINT
read -rp "${TAB3}S3 Hot access key: " S3_HOT_ACCESS_KEY_ID
read -rp "${TAB3}S3 Hot secret key: " S3_HOT_SECRET_ACCESS_KEY
read -rp "${TAB3}S3 Hot bucket name [crabs3]: " S3_HOT_BUCKET_NAME
S3_HOT_BUCKET_NAME="${S3_HOT_BUCKET_NAME:-crabs3}"

read -rp "${TAB3}Public base URL (ex: https://transfer.example.com): " BASE_URL
msg_ok "Configuration collected"

msg_info "Writing docker-compose.yml"
cat <<EOF > /opt/crabs3/docker-compose.yml
services:
  db:
    image: postgres:latest
    container_name: crabs3-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: crabs3
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: crabs3
    volumes:
      - db-data:/var/lib/postgresql
    networks:
      - crabs3-network

  clamav:
    image: clamav/clamav:stable
    container_name: crabs3-clamav
    restart: unless-stopped
    environment:
      - CLAMAV_NO_FRESHCLAMD=false
      - CLAMAV_NO_CLAMD=false
      - CLAMD_CONF_ScanArchive=true
      - CLAMD_CONF_MaxFileSize=104857600
      - CLAMD_CONF_MaxScanSize=419430400
    volumes:
      - clamav-data:/var/lib/clamav
    networks:
      - crabs3-network
    healthcheck:
      test: ["CMD", "clamdcheck.sh"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 120s

  web:
    image: ${CRABS3_IMAGE}:latest
    container_name: crabs3
    restart: unless-stopped
    depends_on:
      - db
      - clamav
    ports:
      - "5000:3000"
    environment:
      - S3_HOT_ENDPOINT=${S3_HOT_ENDPOINT}
      - S3_HOT_ACCESS_KEY_ID=${S3_HOT_ACCESS_KEY_ID}
      - S3_HOT_SECRET_ACCESS_KEY=${S3_HOT_SECRET_ACCESS_KEY}
      - S3_HOT_BUCKET_NAME=${S3_HOT_BUCKET_NAME}
      - S3_REGION=us-east-1
      - DATABASE_URL=postgresql://crabs3:${DB_PASSWORD}@db:5432/crabs3
      - BASE_URL=${BASE_URL}
      - CLAMAV_HOST=clamav
      - CLAMAV_PORT=3310
      - JWT_SECRET=${JWT_SECRET}
      - UPLOAD_TOKEN_SECRET=${UPLOAD_TOKEN_SECRET}
      - EXPIRED_FILE_POLICY=cold
      - LOG_MIN_LEVEL=INFO
    networks:
      - crabs3-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  cron:
    image: ${CRABS3_IMAGE}-cron:latest
    container_name: crabs3-cron
    restart: unless-stopped
    depends_on:
      - web
    environment:
      CRON_SECRET: ${CRON_SECRET}
      APP_INTERNAL_URL: http://web:3000
    networks:
      - crabs3-network

networks:
  crabs3-network:
    driver: bridge

volumes:
  db-data:
  clamav-data:
EOF
msg_ok "Written docker-compose.yml"

sed -i "/^      - EXPIRED_FILE_POLICY=cold/a\\      - CRON_SECRET=${CRON_SECRET}" /opt/crabs3/docker-compose.yml

msg_info "Pulling images and starting CrabS3"
docker compose pull
docker compose up -d
msg_ok "CrabS3 started"

msg_info "Waiting for web container to be healthy"
until [ "$(docker inspect -f '{{.State.Health.Status}}' crabs3 2>/dev/null)" = "healthy" ]; do
  sleep 5
done
msg_ok "Web container healthy"

msg_info "Running database migrations"
docker compose exec -T web npx prisma migrate deploy
msg_ok "Migrations applied"

cat <<EOF > /opt/crabs3/.generated-secrets.txt
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
UPLOAD_TOKEN_SECRET=${UPLOAD_TOKEN_SECRET}
CRON_SECRET=${CRON_SECRET}
EOF
chmod 600 /opt/crabs3/.generated-secrets.txt

motd_ssh
customize
