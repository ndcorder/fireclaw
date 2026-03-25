import type { FirecrawlFormatKey } from "./firecrawl";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "text/markdown": "md",
  "text/html": "html",
  "application/json": "json",
  "text/plain": "txt",
};

const sanitizePathSegment = (input: string) =>
  input
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const baseNameFromUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    const path = url.pathname === "/" ? "" : url.pathname;
    const composed = `${url.hostname}${path}`;
    const sanitized = sanitizePathSegment(composed);
    return sanitized.length > 0 ? sanitized : "firecrawl-export";
  } catch (error) {
    console.warn("Unable to derive filename from URL", error);
    return "firecrawl-export";
  }
};

const filenameForDownload = (sourceUrl: string, format: FirecrawlFormatKey, mimeType: string) => {
  const extension = MIME_EXTENSION_MAP[mimeType] ?? "txt";
  const base = baseNameFromUrl(sourceUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${base}.${format}.${timestamp}.${extension}`;
};

const chromeDownload = (url: string, filename: string) =>
  new Promise<number>((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        if (downloadId === undefined || downloadId === null) {
          reject(new Error("Download failed to start"));
          return;
        }

        resolve(downloadId);
      },
    );
  });

export type DownloadRequest = {
  sourceUrl: string;
  content: string;
  mimeType: string;
  format: FirecrawlFormatKey;
};

export const triggerDownload = async ({
  sourceUrl,
  content,
  mimeType,
  format,
}: DownloadRequest) => {
  const extension = MIME_EXTENSION_MAP[mimeType] ?? "txt";
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const objectUrl = URL.createObjectURL(blob);
  const filename = filenameForDownload(sourceUrl, format, mimeType);

  try {
    await chromeDownload(objectUrl, filename);
  } finally {
    // Allow Chrome to consume the URL before revoking.
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1_000);
  }

  return {
    filename,
    extension,
  };
};
