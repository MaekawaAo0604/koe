"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface UpgradeButtonProps {
  disabled?: boolean;
}

export function UpgradeButton({ disabled }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "エラーが発生しました");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleUpgrade}
      disabled={disabled || loading}
      className="w-full"
      data-testid="upgrade-button"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          処理中...
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" aria-hidden="true" />
          Proにアップグレード
        </>
      )}
    </Button>
  );
}
