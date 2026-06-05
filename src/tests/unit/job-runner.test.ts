import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeBackoffMs,
  runPendingJobs,
  HANDLERS,
  type RunnerStore
} from "@/lib/jobs/runner";
import type { JobRow, JobType } from "@/lib/jobs/types";

describe("computeBackoffMs", () => {
  it("returns 0 for non-positive attempts", () => {
    expect(computeBackoffMs(0)).toBe(0);
    expect(computeBackoffMs(-5)).toBe(0);
  });

  it("returns 1 minute (60000ms) for the 1st attempt", () => {
    expect(computeBackoffMs(1)).toBe(60 * 1000);
  });

  it("returns 2 minutes (120000ms) for the 2nd attempt", () => {
    expect(computeBackoffMs(2)).toBe(2 * 60 * 1000);
  });

  it("returns 4 minutes (240000ms) for the 3rd attempt", () => {
    expect(computeBackoffMs(3)).toBe(4 * 60 * 1000);
  });

  it("returns 8 minutes (480000ms) for the 4th attempt", () => {
    expect(computeBackoffMs(4)).toBe(8 * 60 * 1000);
  });

  it("returns 16 minutes (960000ms) for the 5th attempt", () => {
    expect(computeBackoffMs(5)).toBe(16 * 60 * 1000);
  });

  it("returns 30 minutes (1800000ms) for the 6th attempt (capped at 30 min)", () => {
    expect(computeBackoffMs(6)).toBe(30 * 60 * 1000);
  });

  it("returns 30 minutes (1800000ms) for attempts beyond 6", () => {
    expect(computeBackoffMs(7)).toBe(30 * 60 * 1000);
    expect(computeBackoffMs(100)).toBe(30 * 60 * 1000);
  });
});

describe("runPendingJobs", () => {
  const originalHandlers = { ...HANDLERS };
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = {} as SupabaseClient;
    // Register test-specific handlers
    HANDLERS.test_success = vi.fn().mockResolvedValue(undefined);
    HANDLERS.test_failure = vi.fn().mockRejectedValue(new Error("Transient execution error"));
  });

  afterEach(() => {
    // Restore handlers to clean up test mutations
    for (const key in HANDLERS) {
      delete HANDLERS[key];
    }
    Object.assign(HANDLERS, originalHandlers);
  });

  it("claims and executes jobs successfully, updating status to completed", async () => {
    const job: JobRow = {
      id: "job-1",
      type: "test_success" as JobType,
      status: "pending",
      idempotency_key: "key-1",
      payload: { param: "value" },
      attempts: 1,
      max_attempts: 3,
      next_run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker-1",
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const store: RunnerStore = {
      claimPendingJobs: vi.fn().mockResolvedValue([job]),
      finalizeJob: vi.fn().mockResolvedValue(undefined)
    };

    const result = await runPendingJobs(mockSupabase, "worker-1", 5, store);

    expect(result.claimed).toBe(1);
    expect(result.completed).toContain("job-1");
    expect(result.failed).toHaveLength(0);
    expect(result.dead).toHaveLength(0);

    expect(store.claimPendingJobs).toHaveBeenCalledWith("worker-1", 5);
    expect(HANDLERS.test_success).toHaveBeenCalledWith({ param: "value" }, mockSupabase);
    expect(store.finalizeJob).toHaveBeenCalledWith(
      "job-1",
      "completed",
      expect.any(String),
      null
    );
  });

  it("finalizes a job with no handler as failed", async () => {
    const job: JobRow = {
      id: "job-2",
      type: "unknown_job_type" as JobType,
      status: "pending",
      idempotency_key: "key-2",
      payload: {},
      attempts: 1,
      max_attempts: 3,
      next_run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker-1",
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const store: RunnerStore = {
      claimPendingJobs: vi.fn().mockResolvedValue([job]),
      finalizeJob: vi.fn().mockResolvedValue(undefined)
    };

    const result = await runPendingJobs(mockSupabase, "worker-1", 5, store);

    expect(result.claimed).toBe(1);
    expect(result.completed).toHaveLength(0);
    expect(result.failed).toContainEqual({
      id: "job-2",
      error: "no_handler: No handler registered for job type unknown_job_type"
    });
    expect(store.finalizeJob).toHaveBeenCalledWith(
      "job-2",
      "failed",
      expect.any(String),
      "no_handler: No handler registered for job type unknown_job_type"
    );
  });

  it("handles handler execution failure and schedules a retry with backoff", async () => {
    const job: JobRow = {
      id: "job-3",
      type: "test_failure" as JobType,
      status: "pending",
      idempotency_key: "key-3",
      payload: {},
      attempts: 1,
      max_attempts: 3,
      next_run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker-1",
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const store: RunnerStore = {
      claimPendingJobs: vi.fn().mockResolvedValue([job]),
      finalizeJob: vi.fn().mockResolvedValue(undefined)
    };

    const startTime = Date.now();
    const result = await runPendingJobs(mockSupabase, "worker-1", 5, store);

    expect(result.claimed).toBe(1);
    expect(result.failed).toContainEqual({
      id: "job-3",
      error: "Transient execution error"
    });

    expect(store.finalizeJob).toHaveBeenCalledWith(
      "job-3",
      "failed",
      expect.any(String),
      "Transient execution error"
    );

    const finalizeJobMock = store.finalizeJob as ReturnType<typeof vi.fn>;
    const [[, , nextRunAt]] = finalizeJobMock.mock.calls as [[string, string, string, string | null]];
    const scheduledTime = new Date(nextRunAt).getTime();
    expect(scheduledTime - startTime).toBeGreaterThanOrEqual(55 * 1000);
    expect(scheduledTime - startTime).toBeLessThanOrEqual(65 * 1000);
  });

  it("transitions job to dead when max attempts are reached", async () => {
    const job: JobRow = {
      id: "job-4",
      type: "test_failure" as JobType,
      status: "pending",
      idempotency_key: "key-4",
      payload: {},
      attempts: 3,
      max_attempts: 3,
      next_run_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      locked_by: "worker-1",
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const store: RunnerStore = {
      claimPendingJobs: vi.fn().mockResolvedValue([job]),
      finalizeJob: vi.fn().mockResolvedValue(undefined)
    };

    const result = await runPendingJobs(mockSupabase, "worker-1", 5, store);

    expect(result.claimed).toBe(1);
    expect(result.dead).toContainEqual({
      id: "job-4",
      error: "Transient execution error"
    });

    expect(store.finalizeJob).toHaveBeenCalledWith(
      "job-4",
      "dead",
      expect.any(String),
      "Transient execution error"
    );
  });
});
