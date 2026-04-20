# CrabS3 ![Status](https://uptime.doctorpok.io/api/badge/22/status)

CrabS3 is a transfert platform for S3 compatible storage. It is designed to be simple, efficient and easy to use.

It is built with **RustFS**, a high-performance file system written in Rust, and provides a web interface for uploading and downloading files. It also supports multipart uploads for large files, allowing users to upload files in chunks and track their progress.

Users can upload files through the web interface or via API, and can generate secure, downloadable links for sharing files. Users can also set **a maximum number of downloads** for each file, after which the file will be **automatically** deleted from the storage.

CrabS3 is compatible with any S3 compatible storage backend, making it a versatile solution for file storage and sharing needs.

## Features

- 🚀 **Fast**: Built with RustFS and optimized for performance.
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
S3_ENDPOINT=https://your-s3-endpoint.com
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-bucket-name
```

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
