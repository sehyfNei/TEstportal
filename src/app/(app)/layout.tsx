import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { NavLink } from "@/components/nav-link";

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link className="flex items-center gap-2.5" href="/dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <GraduationCap size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Test Series Portal
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/tests">Tests</NavLink>
            <NavLink href="/study/chat">Chat</NavLink>
            <NavLink href="/mistakes">Mistakes</NavLink>
            <NavLink href="/profile">Profile</NavLink>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
