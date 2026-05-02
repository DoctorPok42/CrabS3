# CrabS3 ![Status](https://uptime.doctorpok.io/api/badge/22/status)

CrabS3 is a transfert platform for S3 compatible storage. It is designed to be simple, efficient and easy to use.

It is built with **RustFS**, a high-performance file system written in Rust, and provides a web interface for uploading and downloading files. It also supports multipart uploads for large files, allowing users to upload files in chunks and track their progress.

Users can upload files through the web interface or via API, and can generate secure, downloadable links for sharing files. Users can also set **a maximum number of downloads** for each file, after which the file will be **automatically** deleted from the storage.

CrabS3 is compatible with any S3 compatible storage backend, making it a versatile solution for file storage and sharing needs.

## Features

- 🚀 **Fast**: Built with RustFS and optimized for performance.
- 🔥 **Hot and Cold Storage**: Supports both hot and cold storage options for efficient file management.
- 📁 **Multipart Uploads**: Supports large file uploads with resumable multipart uploads.
- 📊 **Progress Tracking**: Real-time upload progress tracking for better user experience.
- 📦 **S3 Compatible**: Works with any S3 compatible storage backend.
- 🔗 **Shareable Links**: Generate secure, time-limited links for sharing files.

## Usage

1. **Upload a File**: Use the web interface or API to upload files. For large files, multipart uploads are automatically handled.
2. **Track Progress**: Monitor upload progress in real-time through the UI.

## Configuration

CrabS3 can be configured using environment variables:

```env
# AWS S3 Configuration
# Hot storage configuration
S3_HOT_ENDPOINT=http://192.168.1.100:9000
S3_HOT_ACCESS_KEY_ID=changeme
S3_HOT_SECRET_ACCESS_KEY=changeme
S3_HOT_BUCKET_NAME=mybucket

# Cold storage configuration
S3_COLD_ENDPOINT=http://192.168.1.101:9000
S3_COLD_ACCESS_KEY_ID=changeme
S3_COLD_SECRET_ACCESS_KEY=changeme
S3_COLD_BUCKET_NAME=mybucket-cold

S3_REGION=us-east-1

DATABASE_URL="postgresql://postgres:password@localhost:5432/mydatabase"

NEXTAUTH_URL=http://localhost:3000
```

If the cold storage configuration is not provided, CrabS3 will default to using the hot storage for all operations.
If you want to use the same storage for both hot and cold, simply set the same configuration for both.

It use 3 buckets: one for hot storage, one for cold storage and one for metadata. The metadata bucket is used to store information about the files, such as the number of downloads remaining.

File is automatically copied from hot storage to cold storage with rustfs **replication feature**, so you don't have to worry about it.

## API

- `POST /api/upload/multipart/start`: Initiate a multipart upload session.
- `POST /api/upload/multipart/part`: Upload a single part of the file.
- `POST /api/upload/multipart/complete`: Complete the multipart upload with metadata.
- `POST /api/upload/multipart/abort`: Abort an ongoing multipart upload.
- `GET /api/download/:fileId`: Download a file by its ID.

## Documentation

A detailed documentation of the API endpoints is available in the [Bruno collection](./doc/api/).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

<p style="text-align: center;">No cloud. No bill. Just S3 buckets full of crabs. 🦀</p>
