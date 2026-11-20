"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadIcon } from "@/components/ui/Icons";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg";
const OK_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);

/** Quick client-side check so obvious mistakes don't need a round trip. The server checks again. */
export function precheckFile(file: File): string | null {
  if (file.type && !OK_TYPES.has(file.type)) {
    return /heic|heif/i.test(file.type)
      ? "iPhone HEIC photos aren't supported. Take a screenshot of the photo and upload that, or set Camera > Formats to Most Compatible."
      : "Please upload a PDF, PNG or JPEG.";
  }
  if (file.size > MAX_UPLOAD_BYTES) return "That file is over 10 MB. Try a smaller PDF, or a photo of one page at a time.";
  return null;
}

export default function UploadPanel({ onFile, onSample }: { onFile: (file: File) => void; onSample: () => void }) {
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    take(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors sm:px-8 sm:py-12 ${
        dragging ? "border-[#2F6B47] bg-[#DFEAE2]" : "border-[#C8D3C1] bg-[#FCFDFB]"
      }`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DFEAE2] text-[#2F6B47]">
        <UploadIcon size={28} />
      </div>
      <p className="font-heading mt-4 text-xl font-bold text-[#16241B]">Drop your lease here</p>
      <p className="mt-1 text-sm text-[#3D5245]">A PDF, or a photo of a page (PNG or JPEG), up to 10 MB.</p>

      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => pickRef.current?.click()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2F6B47] px-5 text-sm font-semibold text-white hover:bg-[#245538]"
        >
          <UploadIcon size={18} />
          Choose a file
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-5 text-sm font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2] sm:hidden"
        >
          Take a photo
        </button>
        <span className="hidden text-sm text-[#3D5245] sm:inline">or</span>
        <button
          type="button"
          onClick={onSample}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-5 text-sm font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
        >
          Try a sample lease
        </button>
      </div>

      <input
        ref={pickRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose your lease file"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label="Take a photo of your lease"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
