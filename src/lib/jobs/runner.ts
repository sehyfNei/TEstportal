import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAnalysisJob } from "@/lib/ai/jobs/generate-analysis";
import { generatePlanJob } from "@/lib/ai/jobs/generate-plan";
import { generateLearningPathJob } from "@/lib/ai/jobs/generate-learning-path";
import { getErrorMessage } from "@/lib/errors";
import { computeQuestionStatsJob } from "./handlers/compute-question-stats";
import type { JobRow, JobStatus } from "./types";

export interface RunnerStore {
  claimPendingJobs(workerId: string, limit: number): Promise<JobRow[]>;
  finalizeJob(
    jobId: string,
    status: JobStatus,
    nextRunAt: string,
    errorMessage: string | null
  ): Promise<void>;
}

export function createSupabaseRunnerStore(supabase: SupabaseClient): RunnerStore {
  return {
    async claimPendingJobs(workerId: string, limit: number): Promise<JobRow[]> {
      const { data, error } = await supabase.rpc("claim_pending_jobs", {
        p_worker_id: workerId,
        p_limit: limit
      });
      if (error) {
        throw new Error(`claim_pending_jobs failed: ${error.message}`);
      }
      return (data || []) as JobRow[];
    },
    async finalizeJob(
      jobId: string,
      status: JobStatus,
      nextRunAt: string,
      errorMessage: string | null
    ): Promise<void> {
      const { error } = await supabase.rpc("finalize_job", {
        p_job_id: jobId,
        p_status: status,
        p_next_run_at: nextRunAt,
        p_error_message: errorMessage ?? null
      });
      if (error) {
        throw new Error(`finalize_job failed: ${error.message}`);
      }
    }
  };
}

export function computeBackoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  const exponent = attempts - 1;
  const backoffMs = Math.pow(2, exponent) * 60 * 1000;
  return Math.min(backoffMs, 30 * 60 * 1000);
}

export const HANDLERS: Record<
  string,
  (payload: unknown, supabase: SupabaseClient) => Promise<void>
> = {
  generate_analysis: async (payload: unknown, supabase: SupabaseClient) => {
    const p = payload as { result_id?: string; user_id?: string };
    if (!p?.result_id || !p?.user_id) {
      throw new Error("Invalid payload: missing result_id or user_id");
    }
    const status = await generateAnalysisJob(p.result_id, p.user_id, supabase);
    if (status === "failed") {
      throw new Error("analysis_generation_failed");
    }
  },
  generate_improvement_plan: async (payload: unknown, supabase: SupabaseClient) => {
    const p = payload as { result_id?: string; user_id?: string; exam_id?: string };
    if (!p?.result_id || !p?.user_id || !p?.exam_id) {
      throw new Error("Invalid payload: missing result_id, user_id, or exam_id");
    }
    await generatePlanJob(p.result_id, p.user_id, p.exam_id, supabase);
  },
  compute_question_stats: async (_payload: unknown, supabase: SupabaseClient) => {
    await computeQuestionStatsJob(supabase);
  },
  generate_learning_path: async (payload: unknown, supabase: SupabaseClient) => {
    const p = payload as { learning_path_id?: string };
    if (!p?.learning_path_id) {
      throw new Error("Invalid payload: missing learning_path_id");
    }
    await generateLearningPathJob(p.learning_path_id, supabase);
  }
};

export type RunJobsResult = {
  claimed: number;
  completed: string[];
  failed: { id: string; error: string }[];
  dead: { id: string; error: string }[];
};

export async function runPendingJobs(
  supabase: SupabaseClient,
  workerId: string,
  limit: number,
  store?: RunnerStore
): Promise<RunJobsResult> {
  const runnerStore = store ?? createSupabaseRunnerStore(supabase);
  const result: RunJobsResult = {
    claimed: 0,
    completed: [],
    failed: [],
    dead: []
  };

  let jobs: JobRow[];
  try {
    jobs = await runnerStore.claimPendingJobs(workerId, limit);
  } catch (error: unknown) {
    console.error("[job_runner] failed to claim pending jobs", error);
    throw error;
  }

  result.claimed = jobs.length;

  for (const job of jobs) {
    try {
      const handler = HANDLERS[job.type];
      if (!handler) {
        throw new Error(`no_handler: No handler registered for job type ${job.type}`);
      }

      await handler(job.payload, supabase);

      await runnerStore.finalizeJob(job.id, "completed", new Date().toISOString(), null);
      result.completed.push(job.id);
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err);
      const attempts = job.attempts;
      const maxAttempts = job.max_attempts;

      if (attempts >= maxAttempts) {
        await runnerStore.finalizeJob(job.id, "dead", new Date().toISOString(), errMsg);
        result.dead.push({ id: job.id, error: errMsg });
      } else {
        const backoffMs = computeBackoffMs(attempts);
        const nextRunAt = new Date(Date.now() + backoffMs).toISOString();
        await runnerStore.finalizeJob(job.id, "failed", nextRunAt, errMsg);
        result.failed.push({ id: job.id, error: errMsg });
      }
    }
  }

  return result;
}
