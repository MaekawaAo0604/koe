"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateWidgetButtonProps {
  projectId: string;
}

export function CreateWidgetButton({ projectId }: CreateWidgetButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          type: "wall",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "ウィジェットの作成に失敗しました");
        return;
      }

      const widget = await res.json();
      toast.success("ウィジェットを作成しました");
      router.push(`/projects/${projectId}/widgets/${widget.id}`);
    } catch {
      toast.error("ウィジェットの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button onClick={handleCreate} disabled={isCreating} data-testid="create-widget-button">
      <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
      {isCreating ? "作成中..." : "新しいウィジェットを作成"}
    </Button>
  );
}
