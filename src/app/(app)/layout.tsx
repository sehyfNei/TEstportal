import Link from "next/link";

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link className="text-sm font-semibold text-primary" href="/dashboard">
            Test Series Portal
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/tests">Tests</Link>
            <Link href="/mistakes">Mistakes</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
