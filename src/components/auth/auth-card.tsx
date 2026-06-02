import Link from "next/link";

type AuthCardProps = {
  title: string;
  description: string;
  message?: string;
  footerLabel: string;
  footerHref: string;
  footerText: string;
  children: React.ReactNode;
};

export function AuthCard({
  title,
  description,
  message,
  footerLabel,
  footerHref,
  footerText,
  children
}: AuthCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {message ? (
        <div className="mb-5 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      {children}

      <p className="mt-6 text-sm text-muted-foreground">
        {footerText}{" "}
        <Link className="font-medium text-primary" href={footerHref}>
          {footerLabel}
        </Link>
      </p>
    </div>
  );
}

