"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "コピー" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード API 非対応環境はフォールバックなし
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "コピーしました" : label}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
          コピーしました
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-1.5" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}
