// Storage abstraction for study documents. When UPLOADTHING_TOKEN is set,
// files are uploaded to UploadThing (works on Vercel serverless); otherwise
// files are stored in ./uploads and served back by the documents API route
// (local/dev only — ephemeral filesystem, never used in production).

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { UTApi } from "uploadthing/server";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const isUploadThingConfigured = () => Boolean(process.env.UPLOADTHING_TOKEN);

let utapi: UTApi | null = null;
function getUtapi(): UTApi {
  if (!utapi) utapi = new UTApi();
  return utapi;
}

export interface StoredFile {
  storageKey: string; // UT file key, or local filename
  utfsUrl?: string; // public URL when uploaded to UploadThing
}

export async function storeFile(
  filename: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<StoredFile> {
  if (isUploadThingConfigured()) {
    const file = new File([bytes as unknown as BlobPart], filename, { type: mimeType });
    const result = await getUtapi().uploadFiles([file]);
    const first = result[0] ?? null;
    if (!first || first.error) {
      throw new Error(
        first && first.error
          ? `UploadThing error: ${first.error.message ?? "upload failed"}`
          : "UploadThing returned no file."
      );
    }
    return { storageKey: first.data.key, utfsUrl: first.data.url };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Document storage is not configured for production: set UPLOADTHING_TOKEN (see .env.example)."
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const key = `${Date.now()}-${crypto.randomUUID()}-${sanitize(filename)}`;
  await writeFile(path.join(UPLOAD_DIR, key), bytes);
  return { storageKey: key };
}

export async function deleteStored(storageKey: string): Promise<void> {
  if (isUploadThingConfigured()) {
    try {
      await getUtapi().deleteFiles([storageKey]);
    } catch {
      // File may already be gone; the DB row is the source of truth for the UI.
    }
    return;
  }
  await unlink(path.join(UPLOAD_DIR, storageKey)).catch(() => {});
}

/** Read a locally stored file (returns undefined for UploadThing keys). */
export async function readLocalFile(storageKey: string): Promise<Buffer | undefined> {
  if (isUploadThingConfigured()) return undefined;
  const p = path.join(UPLOAD_DIR, path.basename(storageKey));
  return readFile(p).catch(() => undefined);
}

export function isLocalKey(storageKey: string): boolean {
  return !isUploadThingConfigured();
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "file";
}
