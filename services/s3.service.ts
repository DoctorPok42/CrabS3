import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "rustfskey",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "rustfssecret",
  },
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 300_000,
    requestTimeout: 3_600_000,
    socketTimeout: 3_600_000,
  }),
});

export default s3;
