import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export interface UploadTokenPayload {
  uid: number;
  fid: string;
  fol: string;
  upl: string;
}

export function signUploadToken(payload: UploadTokenPayload, expiresIn: string | number = "6h"): string {
  return jwt.sign(payload, SECRET!, {
    algorithm: "HS256",
    expiresIn,
  } as jwt.SignOptions);
}

export function verifyUploadToken(token: string): UploadTokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET!, { algorithms: ["HS256"] });
    if (typeof decoded === "string") return null;

    const { uid, fid, fol, upl } = decoded as jwt.JwtPayload & UploadTokenPayload;
    if (!uid || !fid || !fol || !upl) return null;

    return { uid, fid, fol, upl };
  } catch {
    return null;
  }
}
