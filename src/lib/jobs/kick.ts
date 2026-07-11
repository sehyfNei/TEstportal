import { runPendingJobs } from "@/lib/jobs/runner";

type RunnerClient = Parameters<typeof runPendingJobs>[0];

type KickDeps = {
  hasConfig?: () => boolean;
  createClient?: () => RunnerClient;
  run?: typeof runPendingJobs;
};

export const DEFAULT_KICK_LIMIT = 3;

// Runs pending jobs right after a submit enqueues them. Must never throw:
// a runner failure cannot be allowed to break the submit response, and the
// daily cron sweeper picks up anything this best-effort pass misses.
export async function kickJobRunnerNonFatal(
  limit: number = DEFAULT_KICK_LIMIT,
  deps: KickDeps = {}
): Promise<void> {
  try {
    let hasConfig = deps.hasConfig;
    let createClient = deps.createClient;

    if (!hasConfig || !createClient) {
      const admin = await import("@/lib/supabase/admin");
      hasConfig = hasConfig ?? admin.hasAdminConfig;
      createClient = createClient ?? (() => admin.createAdminClient() as RunnerClient);
    }

    if (!hasConfig()) {
      return;
    }

    const run = deps.run ?? runPendingJobs;
    const workerId = `post-submit-${crypto.randomUUID().slice(0, 8)}`;
    await run(createClient(), workerId, limit);
  } catch (error) {
    console.error("[job_kick] runner kick failed", error);
  }
}
