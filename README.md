# CrabS3 ![Status](https://uptime.doctorpok.io/api/badge/24/status) ![Uptime](https://uptime.doctorpok.io/api/badge/24/uptime) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CrabS3 is a transfert platform for S3 compatible storage. It is designed to be simple, efficient and easy to use.

It is built with **RustFS**, a high-performance file system written in Rust, and provides a web interface for uploading and downloading files. It also supports multipart uploads for large files, allowing users to upload files in chunks and track their progress.

Users can upload files through the web interface or via API, and can generate secure, downloadable links for sharing files. Users can also set **a maximum number of downloads** for each file, after which the file will be **automatically** deleted from the storage.

CrabS3 is compatible with any S3 compatible storage backend, making it a versatile solution for file storage and sharing needs.

## Features

- 🚀 **Fast**: Built with RustFS and optimized for performance.
- 🔥 **Hot and Cold Storage**: Supports both hot and cold storage options for efficient file management.
- 🗝️ **Secret Sharing**: Allows users to share secrets securely with password protection and time-limited access.
- 📁 **Multipart Uploads**: Supports large file uploads with resumable multipart uploads.
- 🔒 **Secure**: Generate secure, time-limited links for sharing files
- 📧 **Email Notifications**: Notify users when their files are uploaded or downloaded.
- 📊 **Progress Tracking**: Real-time upload progress tracking for better user experience.
- 📦 **S3 Compatible**: Works with any S3 compatible storage backend.
- 🗑️ **Automatic Deletion**: Automatically deletes files after reaching the maximum number of downloads.
- 👤 **User Dashboard**: Each user has a dashboard to manage their files and view download statistics.

## Usage

To run CrabS3, you can use the provided [Docker Compose configuration](./compose.yml). Make sure you have Docker and Docker Compose installed on your system. Then, simply run the following command in the root directory of the project:

```bash
docker pull doctorpok/crabs3:latest
docker-compose up -d
```

This will start the CrabS3 service along with a PostgreSQL database. The web interface will be accessible at `http://localhost:3000`.  
You can upload files through the web interface or use the API endpoints for programmatic access.

## Configuration

CrabS3 can be configured using environment variables:

Change the `.env.example` file to set your own configuration and rename it to `.env`.  
**OR**  
The project come whith doppler configuration, you can set your environment variables in Doppler and the application will automatically pick them up.

If the cold storage configuration is not provided, CrabS3 will default to using the hot storage for all operations.
If you want to use the same storage for both hot and cold, simply set the same configuration for both.

It use 2 buckets: one for hot storage and one for cold storage.
Also use postgres for metadata storage, user management and secret sharing.

File is automatically copied from hot storage to cold storage with rustfs [replication feature](https://docs.rustfs.com/features/replication/), so you don't have to worry about it.

## API

This project use a middleware to handle API requests, the endpoints are as follows:

### Health

- `GET /api/health`: Check the health status of the application and database connectivity.

### Upload

- `POST /api/upload/multipart/start`: Initiate a multipart upload session.
- `POST /api/upload/multipart/part`: Upload a single part of the file.
- `POST /api/upload/multipart/complete`: Complete the multipart upload with metadata.
- `POST /api/upload/multipart/abort`: Abort an ongoing multipart upload.

### Files

- `GET /api/checkfile`: Check if a file with the same hash already exists.
- `POST /api/download/:id`: Check if a file exists and retrieve its metadata by its ID.
- `GET /api/download/:id/stream`: Stream the file content for download.
- `DELETE /api/delete`: Delete a file from storage.

### Authentication

- `GET /api/auth/check-invite`: Check if an invitation token is valid.
- `POST /api/auth/invite`: Send an invitation email to a new user (admin only).
- `POST /api/auth/login`: Authenticate a user and create a session.
- `POST /api/auth/logout`: Log out the current user and destroy the session.
- `GET /api/auth/me`: Retrieve the current authenticated user's information.
- `POST /api/auth/signup`: Create a new user account and session using an invitation token.

### Dashboard

- `GET /api/dashboard/files`: Retrieve a list of files uploaded by the authenticated user.
- `PATCH /api/dashboard/me`: Update the current user's profile information (name, password).

### Secrets

- `POST /api/secret/upload`: Upload a secret and obtain a sharing link.
- `POST /api/secret/check`: Check if a secret exists and if it requires a password.
- `POST /api/secret/get`: Retrieve the content of a secret by providing the password if necessary.

### Communications

- `GET /api/communication`: Retrieve user webhook communications settings.
- `POST /api/communication`: Create user webhook communications for notifications.

### Admin (Requires Admin Privileges)

- `GET /api/admin/logs`: Retrieve system audit logs with optional filtering by level, action, and date range.
- `PATCH /api/admin/logs`: Update the minimum log level for system logging.
- `GET /api/admin/stats`: Retrieve system statistics including storage usage, file counts, and user metrics.
- `GET /api/admin/users`: Retrieve a list of all users and pending invitations with usage metrics.
- `GET /api/admin/users/[id]`: Retrieve detailed information about a specific user.
- `DELETE /api/admin/users/[id]`: Delete a user account and associated data.
- `PUT /api/admin/users/[id]/edit-quota`: Update a user's storage quota.
- `POST /api/admin/users/[id]/reset-password`: Reset a user's password.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

No cloud. No bill. Just S3 buckets full of crabs. 🦀
