#!/usr/bin/env bash

_cs_boot="${COMMUNITY_SCRIPTS_CORE_DIR:-$(dirname "${BASH_SOURCE[0]}")/../../core}/core/build.func"
source "$_cs_boot" 2>/dev/null || source <(curl -fsSL "${COMMUNITY_SCRIPTS_CORE_URL:-https://raw.githubusercontent.com/community-scripts/core/main}/core/build.func")

# Copyright (c) 2021-2026 community-scripts ORG
# Author: DoctorPok42
# License: MIT | https://github.com/community-scripts/ProxmoxVED/raw/main/LICENSE
# Source: https://github.com/DoctorPok42/CrabS3

APP="CrabS3"
var_tags="${var_tags:-file-sharing}"
var_cpu="${var_cpu:-4}"
var_ram="${var_ram:-6144}"
var_disk="${var_disk:-12}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_unprivileged="${var_unprivileged:-1}"

# Application settings the install script accepts up front (unattended installs).
# Without the export they never reach the container.
export var_s3_endpoint="${var_s3_endpoint:-}"
export var_s3_access_key="${var_s3_access_key:-}"
export var_s3_secret_key="${var_s3_secret_key:-}"
export var_s3_bucket="${var_s3_bucket:-crabs3}"
export var_admin_email="${var_admin_email:-admin@crabs3.local}"

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

  if check_for_gh_branch "crabs3" "DoctorPok42/CrabS3"; then
    msg_info "Stopping Service"
    systemctl stop crabs3
    msg_ok "Stopped Service"

    create_backup /opt/crabs3/.env

    fetch_and_deploy_gh_branch "crabs3" "DoctorPok42/CrabS3"

    restore_backup

    rm -f /opt/crabs3/install/seed-admin.mjs

    cd /opt/crabs3 || exit
    $STD npm ci
    set -a
    # shellcheck source=/dev/null
    source /opt/crabs3/.env
    set +a
    $STD npx prisma generate
    $STD npx prisma migrate deploy
    $STD npm run build

    msg_info "Starting Service"
    systemctl start crabs3
    msg_ok "Started Service"
    msg_ok "Updated successfully!"
  fi
  exit
}

start
build_container
description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:3000${CL}"
echo -e "${INFO}${YW} Config file: ${BGN}/opt/crabs3/.env${CL}"
echo -e "${INFO}${YW} The first admin account's email/password were printed above during install — save them, they are shown only once.${CL}"
