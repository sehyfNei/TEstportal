type AuthFieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
};

export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true
}: AuthFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        autoComplete={autoComplete}
        className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

