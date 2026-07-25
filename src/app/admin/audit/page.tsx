import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS, isValidAuditAction } from "@/lib/audit/audit-actions";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createAdminClient, hasAdminConfig } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AuditFilterForm } from "./audit-filter-form";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: unknown;
  created_at: string;
};

type SearchParams = Promise<{ action?: string }>;

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filterAction = params.action ?? "";

  const data = await loadAuditData(filterAction);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Panel message="Supabase is not configured yet. Add Supabase URL and anon key to view the audit log." />
      </section>
    );
  }

  if (data.loadError) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Panel message={data.loadError} />
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader />

      <AuditFilterForm currentAction={filterAction} />

      {data.rows.length === 0 ? (
        <Panel message={filterAction ? "No audit entries match this filter." : "No audit entries yet."} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {row.actor_id ? (data.actorNames.get(row.actor_id) ?? row.actor_id.slice(0, 8)) : "system"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {isValidAuditAction(row.action) ? AUDIT_ACTION_LABELS[row.action] : row.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {row.entity_type ? `${row.entity_type}: ${row.entity_id ?? "-"}` : "-"}
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                    {row.details ? (
                      <code className="block whitespace-pre-wrap break-words">
                        {JSON.stringify(row.details)}
                      </code>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Operations</p>
      <h1 className="mt-2 text-3xl font-semibold">Audit log</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Question status changes, bulk imports, and manifest imports, most recent first. Role
        changes currently happen outside the app (Supabase dashboard) and are not yet capturable
        here.
      </p>
    </div>
  );
}

function Panel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

async function loadAuditData(filterAction: string): Promise<{
  configured: boolean;
  loadError: string | null;
  rows: AuditRow[];
  actorNames: Map<string, string>;
}> {
  if (!hasSupabaseConfig()) {
    return { configured: false, loadError: null, rows: [], actorNames: new Map() };
  }

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id,actor_id,action,entity_type,entity_id,details,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterAction && (AUDIT_ACTIONS as readonly string[]).includes(filterAction)) {
    query = query.eq("action", filterAction);
  }

  const { data, error } = await query;

  if (error) {
    return { configured: true, loadError: error.message, rows: [], actorNames: new Map() };
  }

  const rows = (data ?? []) as AuditRow[];

  // audit_log's own RLS is admin-only (a normal admin session can read it
  // directly), but user_profiles' RLS is owner-only select - an admin
  // reading OTHER users' names needs the service-role client for that one
  // narrow lookup, rather than widening user_profiles' RLS for this page.
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const actorNames = new Map<string, string>();

  if (actorIds.length > 0 && hasAdminConfig()) {
    try {
      const admin = createAdminClient();
      const { data: profiles } = await admin.from("user_profiles").select("id,name").in("id", actorIds);
      for (const profile of (profiles ?? []) as { id: string; name: string }[]) {
        actorNames.set(profile.id, profile.name);
      }
    } catch {
      // Non-fatal: falls back to showing truncated ids for actors.
    }
  }

  return { configured: true, loadError: null, rows, actorNames };
}
