"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_FILE_BYTES, formatFileSize } from "@/src/lib/files";

export type AttachedFile = { fileName: string | null; fileType: string | null; fileSize: number | null };

export function FilePanel({
  endpoint,
  file,
  canWrite,
  onChange,
  label = "Attachment",
}: {
  endpoint: string;
  file: AttachedFile;
  canWrite: boolean;
  onChange?: () => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async () => {
    const picked = inputRef.current?.files?.[0];
    if (!picked) return;
    setError("");
    if (picked.size > MAX_FILE_BYTES) {
      setError(`Too large. Max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB.`);
      inputRef.current!.value = "";
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", picked);
      const response = await fetch(endpoint, { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(String(data.error ?? "Upload failed"));
      else onChange?.();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) setError("Remove failed");
      else onChange?.();
    } catch {
      setError("Remove failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-base font-semibold text-slate-800">{label}</div>

      {file.fileName ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <a
            href={endpoint}
            target="_blank"
            rel="noreferrer"
            className="truncate font-medium text-[#1D9E75] underline"
            title={file.fileName}
          >
            {file.fileName}
          </a>
          <span className="text-slate-400">{formatFileSize(file.fileSize)}</span>
          <a href={endpoint} download={file.fileName} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
            Download
          </a>
          {canWrite && (
            <>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                Replace file
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={remove} className="border-red-200 text-red-600">
                Remove
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500">No file attached.</div>
      )}

      {canWrite && !file.fileName && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            aria-label={`${label} file`}
            onChange={upload}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
          />
        </div>
      )}
      {!file.fileName && canWrite && <p className="mt-2 text-sm text-slate-400">Max {Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB · PDF, Word, Excel, images, archives</p>}

      {busy && <p className="mt-2 text-sm text-slate-500">Working…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
