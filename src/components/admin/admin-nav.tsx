"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Home", exact: true },
  { href: "/admin/manifests", label: "Exams", exact: false },
  { href: "/admin/templates", label: "Papers", exact: false },
  { href: "/admin/questions/review", label: "Review", exact: false },
  { href: "/admin/questions/import", label: "Import", exact: true },
  { href: "/admin/questions/generate", label: "Generate", exact: true },
  { href: "/admin/sources", label: "Sources", exact: false },
  { href: "/admin/experts", label: "Experts", exact: false },
  { href: "/admin/questions", label: "Questions", exact: true },
  { href: "/admin/ai-ratings", label: "AI ratings", exact: false },
  { href: "/admin/questions/flags", label: "Flagged", exact: false },
  { href: "/admin/quality", label: "Quality", exact: false },
  { href: "/admin/jobs", label: "Jobs", exact: false },
  { href: "/admin/ops", label: "Health", exact: false }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {links.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            className={cn(
              "transition-colors hover:text-foreground",
              isActive ? "font-medium text-foreground" : "text-muted-foreground"
            )}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
