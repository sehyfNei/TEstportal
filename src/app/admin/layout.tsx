import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link className="flex items-center gap-2.5" href="/admin">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-foreground to-foreground/70 text-background shadow-sm">
              <ShieldCheck size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight">Admin Console</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
              Admin
            </span>
          </Link>
          <AdminNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
