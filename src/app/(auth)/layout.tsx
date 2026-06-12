import Link from "next/link";
import { GraduationCap, LineChart, NotebookPen, Target } from "lucide-react";

const highlights = [
  {
    icon: Target,
    title: "Diagnostic-first",
    detail: "Every plan starts from a measured baseline, not guesswork."
  },
  {
    icon: LineChart,
    title: "Readiness you can track",
    detail: "Mastery, decay, and strategy signals roll up into one score."
  },
  {
    icon: NotebookPen,
    title: "Mistakes become retests",
    detail: "Each error is classified and scheduled back into your queue."
  }
];

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-6">
          <Link className="flex w-fit items-center gap-2.5" href="/">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <GraduationCap size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Test Series Portal
            </span>
          </Link>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            Diagnostic-first preparation with a measurable improvement loop.
          </h1>
          <ul className="flex max-w-xl flex-col gap-4">
            {highlights.map((item) => (
              <li className="flex items-start gap-3" key={item.title}>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {children}
      </section>
    </main>
  );
}
