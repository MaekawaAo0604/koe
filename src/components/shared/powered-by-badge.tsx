import Link from "next/link";

interface PoweredByBadgeProps {
  utmSource?: string;
}

export function PoweredByBadge({ utmSource = "form" }: PoweredByBadgeProps) {
  const href = `/?utm_source=${utmSource}&utm_medium=badge&utm_campaign=plg`;

  return (
    <div className="flex justify-center mt-6">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Powered by</span>
        <span className="font-semibold text-primary">Koe</span>
      </Link>
    </div>
  );
}
