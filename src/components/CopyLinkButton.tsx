"use client";

import { useState } from "react";

export function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-[11px] font-semibold text-teal-700 hover:underline"
      style={{ color: "#00B8A0" }}
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}
