import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_KICK_LIMIT, kickJobRunnerNonFatal } from "@/lib/jobs/kick";
import type { runPendingJobs } from "@/lib/jobs/runner";

type RunnerClient = Parameters<typeof runPendingJobs>[0];

const fakeClient = { fake: true } as unknown as RunnerClient;

function makeRun(impl?: () => Promise<never>) {
  return vi.fn(
    impl ??
      (async () => ({
        claimed: 0,
        completed: [],
        failed: [],
        dead: []
      }))
  ) as unknown as typeof runPendingJobs;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("kickJobRunnerNonFatal", () => {
  it("does not run when admin config is missing", async () => {
    const run = makeRun();

    await kickJobRunnerNonFatal(undefined, {
      hasConfig: () => false,
      createClient: () => fakeClient,
      run
    });

    expect(run).not.toHaveBeenCalled();
  });

  it("runs with the created client, a post-submit worker id, and the default limit", async () => {
    const run = makeRun();

    await kickJobRunnerNonFatal(undefined, {
      hasConfig: () => true,
      createClient: () => fakeClient,
      run
    });

    expect(run).toHaveBeenCalledTimes(1);
    const [client, workerId, limit] = (run as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(client).toBe(fakeClient);
    expect(String(workerId)).toMatch(/^post-submit-[0-9a-f]{8}$/);
    expect(limit).toBe(DEFAULT_KICK_LIMIT);
  });

  it("uses a default limit of 3", () => {
    expect(DEFAULT_KICK_LIMIT).toBe(3);
  });

  it("forwards a custom limit", async () => {
    const run = makeRun();

    await kickJobRunnerNonFatal(7, {
      hasConfig: () => true,
      createClient: () => fakeClient,
      run
    });

    const [, , limit] = (run as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(limit).toBe(7);
  });

  it("resolves without throwing when the runner throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const run = makeRun(async () => {
      throw new Error("runner exploded");
    });

    await expect(
      kickJobRunnerNonFatal(undefined, {
        hasConfig: () => true,
        createClient: () => fakeClient,
        run
      })
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("resolves without throwing when client creation throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const run = makeRun();

    await expect(
      kickJobRunnerNonFatal(undefined, {
        hasConfig: () => true,
        createClient: () => {
          throw new Error("no client");
        },
        run
      })
    ).resolves.toBeUndefined();
    expect(run).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
