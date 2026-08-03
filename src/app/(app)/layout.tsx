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
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-0">
          <Link className="flex shrink-0 items-center gap-2.5" href="/dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <GraduationCap size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Test Series Portal
            </span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0 sm:pb-0"
          >
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/study/today">Today</NavLink>
            <NavLink href="/tests">Tests</NavLink>
            <NavLink href="/schedule">Schedule</NavLink>
            <NavLink href="/study/path">Path</NavLink>
            <NavLink href="/study/chat">Chat</NavLink>
            <NavLink href="/mistakes">Mistakes</NavLink>
            <NavLink href="/profile">Profile</NavLink>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </main>
  );
}
