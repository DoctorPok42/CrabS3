<div align="center">

# 🦀 CrabS3

**Send big files and secrets from your own S3 bucket.**
No cloud vendor, no monthly bill, no upload limit but the one you set.

![Status](https://uptime.doctorpok.io/api/badge/24/status)
![Uptime](https://uptime.doctorpok.io/api/badge/24/uptime)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[Quick start](#quick-start) · [Configuration](#configuration) · [How it works](#how-it-works) · [API](#api)

</div>

---

CrabS3 is a self-hosted transfer platform for any S3-compatible storage. Drop files in the browser or push them through the API, get a shareable link back, and let the file delete itself after a deadline or a download count you choose.

It runs on **RustFS** by default, but any S3-compatible backend works — AWS S3, OVH Object Storage, MinIO, Ceph, etc. CrabS3 never stores your data itself; it only keeps metadata in Postgres.

```ts
Upload  →  bucket (hot)  →  share link  →  N downloads or T days  →  gone
                ↓
        marked cold in DB, per your bucket's own lifecycle rule (optional)
```

## Why

| | |
| --- | --- |
| 📦 **Your storage** | Any S3-compatible backend. Your keys, your bucket, your retention rules. |
| 🚀 **Big files** | Resumable multipart uploads with live progress — a dropped connection does not restart the transfer. |
| 🔥 **Hot & cold** | One bucket. Cold is a class your provider's lifecycle rule assigns; CrabS3 just tracks it — no copying, no second bucket. |
| 🗝️ **Secrets** | Share a password, a token, a note. Password-protected, time-limited, gone after reading. |
| 🗑️ **Self-destruct** | Set a max download count; the file is deleted from storage automatically when it is reached. |
| 🛡️ **Malware scan** | Every upload goes through ClamAV; infected files are flagged and blocked from download. |
| 🔒 **Real accounts** | Invite-only signup, sessions, 2FA (TOTP), per-user storage quotas. |
| 📧 **Notifications** | Email on upload, download and share; webhooks for your own integrations. |
| 📊 **Dashboard** | Per-user file list and download stats; admin view for storage, users and audit logs. |
| 🔌 **Services** | Scoped API keys for other apps and scripts — their own folder, quota and status, issued directly or self-served via an invite code. No user account needed. |

## Quick start

Requires Docker and Docker Compose.

```bash
git clone https://github.com/DoctorPok42/CrabS3.git
cd CrabS3
cp .env.example .env      # then edit it — see Configuration
docker compose up -d
```

The interface is on **<http://localhost:3000>**. Health check: `GET /api/health`.

Prefer the published image? `docker pull doctorpok/crabs3:latest`, then point `compose.yml` at it instead of `build: .`.

### Proxmox VE

A [community-scripts](https://community-scripts.org) LXC install is also available — bare-metal (no Docker inside the container), Node.js/PostgreSQL/ClamAV set up automatically:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/DoctorPok42/CrabS3/main/ct/crabs3.sh)"
```

> Pending review at [community-scripts/ProxmoxVED](https://github.com/community-scripts/ProxmoxVED) — until it's merged, swap the URL above for your own fork/branch.

You'll be prompted for your S3 endpoint and keys during install (or export `var_s3_endpoint`, `var_s3_access_key`, `var_s3_secret_key`, `var_s3_bucket`, `var_admin_email` beforehand for an unattended run). Everything else lives in `/opt/crabs3/.env` — edit and `systemctl restart crabs3` to apply. There's no TLS in front by default; see `COOKIE_SECURE` below before exposing it past your LAN.

<details>
<summary><b>Running from source (development)</b></summary>

```bash
npm install
npx prisma migrate deploy
npm run dev               # http://localhost:3000
```

You still need a reachable Postgres instance and an S3 endpoint.
</details>

## Configuration

Everything is environment variables — put them in `.env`, or manage them in Doppler (a `doppler.yaml` is included and picked up automatically).

**Storage** — One bucket. "Cold" is a storage class your provider's lifecycle rule assigns to a file, not a separate bucket — CrabS3 only records which class a file is in.

| Variable | Example |
| --- | --- |
| `S3_ENDPOINT` | `http://192.168.1.100:9000` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | your keys |
| `S3_BUCKET_NAME` | `crabs3` |
| `S3_REGION` | `us-east-1` |
| `EXPIRED_FILE_POLICY` | `cold` (move) or `delete` |

**App**

| Variable | Example |
| --- | --- |
| `DATABASE_URL` | `postgresql://user:password@db:5432/crabs3` |
| `NEXT_PUBLIC_BASE_URL` | `https://files.example.com` — used in share links and emails |
| `JWT_SECRET` | a long random string |
| `COOKIE_SECURE` | `true`/`false` — defaults to `NODE_ENV === "production"` if unset. Set `false` when serving plain HTTP with no reverse proxy in front, or browsers silently drop the session cookie after login |
| `LOG_MIN_LEVEL` | `DEBUG` · `INFO` · `WARN` · `ERROR` |

**Email & scanning**

| Variable | Example |
| --- | --- |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | your mail relay |
| `SMTP_FROM` | `CrabS3 Notifications <bot@example.com>` |
| `CLAMAV_HOST` / `CLAMAV_PORT` | `clamav` / `3310` |
| `CRON_SECRET` | shared secret for the expiry job container |

> **First user:** signup is invite-only, so nothing lets you in until one admin exists. Seed it once — safe to re-run, it does nothing if an admin is already there:
> ```sh
> docker compose exec -T web npx tsx install/seed-admin.mjs
> ```
> Prints the email and generated password once; they are not stored anywhere else. Issue further invites from the admin panel.

## How it works

1. The browser hashes the file and asks the server if it already has this content; if so, a new share is created without sending a single byte. Otherwise it opens a multipart session and uploads parts in parallel — the server relays each part straight through to your bucket. A dropped connection reattaches to the same session and only sends the parts that didn't land yet.
2. Metadata (owner, size, hash, expiry, download quota, password hash) lives in Postgres; file bytes only ever live in your bucket.
3. ClamAV scans the object; a hit marks the file infected and download is refused for infected files.
4. The cron container calls the expiry endpoint on a schedule. Files past their deadline or download quota are marked cold or deleted, per `EXPIRED_FILE_POLICY`.
5. Duplicate uploads are detected by hash, so the same file is not stored twice.

The hot → cold transition is a storage-class change your bucket's own lifecycle rule performs — see RustFS [lifecycle rules](https://docs.rustfs.com/features/replication/) for an example. CrabS3 never copies bytes anywhere; it only records which class a file ended up in.

## API

Everything the UI does is available over HTTP. Public endpoints need no session; the rest use the session cookie, and admin endpoints additionally require an admin account.

**Health** · `GET /api/health`

**Upload**

```sh
POST /api/upload/dedupe-check           already have this content? link instead of upload
POST /api/upload/multipart/start        open a session
POST /api/upload/multipart/part         upload one part
POST /api/upload/multipart/resume       reattach after a dropped connection
POST /api/upload/multipart/set-hash     attach a content hash to a session
POST /api/upload/multipart/complete     finish + attach metadata
POST /api/upload/multipart/finish       once per batch, after every file is complete — sends notifications, fires webhooks
POST /api/upload/multipart/abort        cancel
```

**Files**

```sh
GET    /api/checkfile                   is this share link still valid?
POST   /api/download/:id                metadata for a share link
GET    /api/download/:id/stream         stream the bytes
DELETE /api/delete                      remove a file (409 + mode if it shares content with others)
```

**Secrets**

```sh
POST /api/secret/upload                 store a secret, get a link
POST /api/secret/check                  exists? password required?
POST /api/secret/get                    read it
```

**Services** — scoped API keys for third-party apps and scripts. Two ways to get a token: create a service directly and get its token back immediately, or issue an invite code that a third party redeems for their own token via `join` — no account needed either way. `create`/`create/invite`/`update`/`delete`/`list` need an admin session; `upload`/`download` use the service's own bearer token (`Authorization: Bearer <token>`), not the session cookie.

```sh
POST   /api/services/create             path 1 — create a service + folder, get its token back (admin)
POST   /api/services/create/invite      path 2 — issue a redeemable invite code (admin)
POST   /api/services/join               path 2 — redeem an invite code for a token (public)
GET    /api/services/:uuid              public info about a service
GET    /api/services/list               list every service (admin)
PUT    /api/services/update             change status or image (admin)
DELETE /api/services/delete/:id         delete a service and its folder (admin)
POST   /api/services/upload             single presigned PUT — not the multipart flow
GET    /api/services/download           a share link, or a presigned URL per file
```

**Access Tokens** — personal bearer tokens that act as you, without the session cookie (scripts, cron, CI). Each carries one or more scopes (`READ` · `WRITE` · `DELETE` · `ADMIN`) and an expiry of 7/30/90/180/365 days, and works as `Authorization: Bearer <token>` on any endpoint on this page. `READ` allows GET only, `WRITE` allows anything but DELETE, `DELETE` allows DELETE only, `ADMIN` allows everything. Managed from `/me`; the token value is shown once, at creation.

```sh
GET    /api/accessToken                 list your tokens — name, scopes, expiry, never the value again
POST   /api/accessToken                 create one: name, scopes[], expires_at (days)
DELETE /api/accessToken?id=:id          revoke a token
```

**Auth**

```sh
POST   /api/auth/login · logout · signup
GET    /api/auth/me · check-invite
DELETE /api/auth/me                     delete your own account and everything it owns
POST   /api/auth/invite                 (admin)
POST   /api/2fa/create                  enable TOTP, returns secret + QR uri
GET    /api/2fa/disable                 disable TOTP for the current account
```

**Dashboard & communication**

```sh
GET    /api/dashboard/files
GET    /api/dashboard/folders           folders you own or have files in, with a file count each
PATCH  /api/dashboard/folders/:id       rename
DELETE /api/dashboard/folders/:id       delete the folder and every file in it
POST   /api/dashboard/coldtohot         restore a folder from cold to hot storage
PATCH  /api/dashboard/me
GET    /api/communication               webhook settings
POST   /api/communication
GET    /api/fingerprint/:id             download history for a file or folder (?type=file|folder)
GET    /api/settings                    read specific instance settings (?keys=a,b)
```

**Admin**

```sh
GET    /api/admin/stats                  storage, files, users
GET    /api/admin/users
GET    /api/admin/users/:id
DELETE /api/admin/users/:id
PUT    /api/admin/users/:id/edit-quota
POST   /api/admin/users/:id/reset-password
GET    /api/admin/logs                   filter by level, action, date
PATCH  /api/admin/logs                   set minimum log level
GET    /api/admin/settings               every instance setting and its current value
PATCH  /api/admin/settings               update one: { key, value }
DELETE /api/admin/settings               reset one to default (?key=:key)
POST   /api/admin/settings               sync the settings catalog — creates missing rows with defaults
```

OpenAPI-ish request collections live in [`doc/api`](./doc/api).

## Stack

Next.js (App Router) · React · Tailwind CSS · Prisma + PostgreSQL · AWS SDK for S3 · ClamAV · Nodemailer · Docker

## Contributing

Issues and pull requests are welcome. Keep changes focused, run `npm run lint` before opening a PR, and describe what you tested.

## License

Apache 2.0 — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

---

<div align="center">

**No cloud. No bill. Just S3 buckets full of crabs.** 🦀

![CrabS3](https://crabs3.doctorpok.io/opengraph-image)
</div>
