export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      aria-label="読み込み中"
      role="status"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}
