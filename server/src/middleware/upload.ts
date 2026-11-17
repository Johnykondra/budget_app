import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

export const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${mimeExtensions[file.mimetype] ?? ""}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!mimeExtensions[file.mimetype]) {
      callback(new Error("Receipt must be a JPEG, PNG, or WebP image"));
      return;
    }
    callback(null, true);
  }
});

export function getUploadDirectory(): string {
  return uploadDirectory;
}
