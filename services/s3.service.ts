import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";

const REQUEST_TIMEOUT = 250_000;

function createHandler() {
  return new NodeHttpHandler({
    connectionTimeout: 10_000,
    requestTimeout: REQUEST_TIMEOUT,
    socketTimeout: REQUEST_TIMEOUT,
    httpAgent: new HttpAgent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 1000 }),
    httpsAgent: new HttpsAgent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 1000 }),
  });
}

export const HOT_BUCKET = process.env.S3_BUCKET_NAME || "hot-bucket";

export const s3Hot = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "rustfskey",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "rustfssecret",
  },
  forcePathStyle: true,
  requestHandler: createHandler(),
  maxAttempts: 3,
});

