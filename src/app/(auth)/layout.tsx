import Link from "next/link";

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <Link className="text-sm font-semibold text-primary" href="/">
            Test Series Portal
          </Link>
          <h1 className="max-w-2xl text-3xl font-semibold md:text-5xl">
            Diagnostic-first preparation with a measurable improvement loop.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Phase 0 focuses on the production foundation: authentication, profile
            storage, exam manifests, and the first diagnostic workflow.
          </p>
        </div>
        {children}
      </section>
    </main>
  );
}

