import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const handlerConfig = {
  connectionTimeout: 300_000,
  requestTimeout: 3_600_000,
  socketTimeout: 3_600_000,
}

export const HOT_BUCKET = process.env.S3_HOT_BUCKET_NAME || "hot-bucket";
export const COLD_BUCKET = process.env.S3_COLD_BUCKET_NAME || "cold-bucket";
export const META_BUCKET = process.env.S3_META_BUCKET_NAME || "metadata-bucket";

export const s3Hot = new S3Client({
  endpoint: process.env.S3_HOT_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_HOT_ACCESS_KEY_ID || "rustfskey",
    secretAccessKey: process.env.S3_HOT_SECRET_ACCESS_KEY || "rustfssecret",
  },
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler(handlerConfig),
});

// If cold storage is not configured, use hot storage for all operations
export const s3Cold = process.env.S3_COLD_ENDPOINT ? new S3Client({
  endpoint: process.env.S3_COLD_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_COLD_ACCESS_KEY_ID || "rustfskey",
    secretAccessKey: process.env.S3_COLD_SECRET_ACCESS_KEY || "rustfssecret",
  },
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler(handlerConfig),
}) : s3Hot;

