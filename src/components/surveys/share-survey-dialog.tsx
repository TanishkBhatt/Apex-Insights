"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, QrCode, X } from "lucide-react";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ShareSurveyButton({
  publicUrl,
  title,
}: {
  publicUrl: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Copy it from the address field instead.");
    }
  }

  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError("The QR code is not ready yet.");
      return;
    }
    const link = document.createElement("a");
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    link.download = `${safeTitle || "survey"}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="h-4 w-4" aria-hidden />
        Share
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-survey-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="share-survey-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Share “{title}”
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Scan the QR code or send the public link.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close share dialog"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="mt-4 flex justify-center rounded-xl border border-slate-200 bg-white p-5">
              <QRCodeCanvas
                ref={canvasRef}
                value={publicUrl}
                size={224}
                level="M"
                bgColor="#ffffff"
                fgColor="#111827"
                title={`QR code for ${title}`}
              />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                {publicUrl}
              </span>
              <Button variant="ghost" size="sm" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            {error ? (
              <div className="mt-3">
                <Alert tone="error">{error}</Alert>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={downloadQr}>
                <Download className="h-4 w-4" aria-hidden />
                Download QR
              </Button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Open survey
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
