export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-9 w-32 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded bg-muted" />
          <div className="h-9 w-28 rounded bg-muted" />
          <div className="h-9 w-16 rounded bg-muted" />
        </div>
      </div>

      {/* UsageIndicator */}
      <div className="mb-4 h-8 w-64 rounded bg-muted" />

      {/* フィルタ */}
      <div className="mb-6 h-24 rounded-lg bg-muted" />

      {/* カードグリッド */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
