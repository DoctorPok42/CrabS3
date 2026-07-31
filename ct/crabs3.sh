#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)

# Copyright (c) 2021-2026 community-scripts ORG (adapted)
# Author: DoctorPok42
# License: MIT
# Source: https://github.com/DoctorPok42/crabS3

APP="CrabS3"
var_tags="${var_tags:-file-sharing;docker}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-16}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources

  if [[ ! -d /opt/crabs3 ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi

  msg_info "Updating ${APP} (pulling latest images)"
  cd /opt/crabs3 || exit
  docker compose pull
  docker compose up -d --force-recreate
  msg_ok "Updated ${APP}"

  msg_info "Waiting for web container to be healthy"
  until [ "$(docker inspect -f '{{.State.Health.Status}}' crabs3 2>/dev/null)" = "healthy" ]; do
    sleep 5
  done
  msg_ok "Web container healthy"

  msg_info "Running database migrations"
  docker compose exec -T web npx prisma migrate deploy
  msg_ok "Migrations applied"

  exit
}

start
build_container
description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:5000${CL}"
echo -e "${INFO}${YW} Config directory: ${BGN}/opt/crabs3${CL}"