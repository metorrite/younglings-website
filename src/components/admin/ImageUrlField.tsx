"use client";

import { useRef, useState } from "react";
import type { WelcomeActionResult } from "@/lib/jonnybot-admin";
import { MAX_UPLOAD_BYTES, UPLOAD_PATH, type UploadResult } from "@/lib/uploadLimits";
import { ghostButton, inputClass } from "./ui";

/** How long to wait for an upload before saying so. */
const UPLOAD_PATIENCE_MS = 45_000;

export interface ImageUploads {
  /** Where a picture is posted: `{url}/{slot}`. */
  url: string;
  remove: (slot: string) => Promise<WelcomeActionResult<{ removed: boolean }>>;
}

/**
 * A picture for a message: paste a web address, or upload a file and the address is filled in for you. A server keeps one uploaded
 * picture per place (`slot`), so uploading again replaces it and removing deletes it, and nothing piles up. Without `uploads` it is
 * just the address box.
 */
export function ImageUrlField({ id, slot, value, onChange, uploads }: { id: string; slot: string; value: string; onChange: (value: string) => void; uploads?: ImageUploads }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploaded = value.includes(UPLOAD_PATH + "/");

  async function choose(file: File | undefined) {
    if (!file || !uploads) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That picture is too big. Keep it under ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      // A plain request, so a failure shows as the status it really was, and a stalled one can be given up on.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPLOAD_PATIENCE_MS);
      let response: Response;
      try {
        response = await fetch(`${uploads.url}/${slot}`, { method: "POST", body: form, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      const result: UploadResult | null = await response.json().catch(() => null);
      if (result?.ok) onChange(result.data.url);
      else setError(result && !result.ok ? result.error : `The site answered ${response.status} ${response.statusText}`.trim() + ". Try again.");
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "That's taking too long. JonnyBot may be restarting: wait a minute and try again."
          : "Couldn't reach the site. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function clear() {
    setError(null);
    if (uploaded && uploads) {
      setBusy(true);
      const result = await uploads.remove(slot).catch(() => null);
      setBusy(false);
      if (!result || !result.ok) {
        setError("Couldn't remove the uploaded picture. Try again.");
        return;
      }
    }
    onChange("");
  }

  return (
    <div className="space-y-2">
      <input id={id} className={inputClass} value={value} placeholder="https://" onChange={(e) => onChange(e.target.value)} />
      {uploads && (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-label="Choose a picture to upload" onChange={(e) => choose(e.target.files?.[0])} />
          <button type="button" className={ghostButton} disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? "Working…" : uploaded ? "Replace picture" : "Upload a picture"}
          </button>
          {value && (
            <button type="button" className={ghostButton} disabled={busy} onClick={clear}>
              {uploaded ? "Delete picture" : "Clear"}
            </button>
          )}
          {uploaded && !busy && <span className="text-xs text-emerald-300">Uploaded</span>}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
