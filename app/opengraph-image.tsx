import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 90, background: "#faf8f6", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 34, color: "#ed5f1e", letterSpacing: 4 }}>CRABS3 🦀</div>
        <div style={{ fontSize: 82, fontWeight: 800, color: "#171717", marginTop: 16 }}>Your S3 bucket, your file transfer.</div>
        <div style={{ fontSize: 34, color: "#5c534d", marginTop: 24 }}>Self-hosted · multipart uploads · encrypted secrets</div>
        <div style={{ fontSize: 24, color: "#5c534d", marginTop: 16 }}>No cloud. No bill. Just S3 buckets full of crabs.</div>
        <div style={{ height: "6px", background: "#ed5f1e", marginBottom: "-32px", marginTop: 16, borderRadius: "50px" }}></div>
      </div>
    ),
    size
  );
}
