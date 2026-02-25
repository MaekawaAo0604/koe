interface HeaderProps {
  userName: string;
}

export function Header({ userName }: HeaderProps) {
  return (
    <header className="flex items-center justify-end h-16 px-6 border-b bg-background shrink-0">
      <div className="text-sm">
        <span className="text-muted-foreground">ようこそ、</span>
        <span className="font-medium">{userName}</span>
      </div>
    </header>
  );
}
