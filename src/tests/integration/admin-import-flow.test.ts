/**
 * Admin content-pipeline integration tests (TSP-131).
 *
 * Covers manifest import, bulk question import (dry-run / real / row failure),
 * and the review/approve/flag-resolution actions against a fake Supabase client
 * that asserts exact RPC argument names. Every mutating action must reject when
 * requireAdminForAction fails — that is the security half of the AC.
 *
 * Also serves as the verification the TSP-025 import slice was missing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminForAction: vi.fn(),
  createClient: vi.fn(),
  hasSupabaseConfig: vi.fn(),
  callAi: vi.fn()
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdminForAction: mocks.requireAdminForAction }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabaseConfig: mocks.hasSupabaseConfig }));
vi.mock("@/lib/ai/gateway", () => ({ callAi: mocks.callAi }));

import { importManifestAction } from "@/app/admin/manifests/actions";
import { importQuestionsAction } from "@/app/admin/questions/import/actions";
import { setQualityTierAction, setQuestionStatusAction } from "@/app/admin/questions/actions";
import { resolveQuestionFlagsAction } from "@/app/admin/questions/flag-actions";

const EXAM_ID = "33333333-3333-4333-8333-333333333333";
const TOPIC_ID = "99999999-9999-4999-8999-999999999999";
const QUESTION_ID = "55555555-5555-4555-8555-555555555555";

const CREATE_QUESTION_ARG_KEYS = [
  "p_content",
  "p_difficulty",
  "p_exam_id",
  "p_explanation",
  "p_explanation_detail",
  "p_exposure_policy",
  "p_is_contested",
  "p_language",
  "p_quality_tier",
  "p_reviewer_notes",
  "p_source",
  "p_source_reference",
  "p_source_year",
  "p_status",
  "p_subtopic_id",
  "p_topic_id",
  "p_type"
];

type RpcResult = { data: unknown; error: { message: string } | null };

function createFakeAdminSupabase() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const failures = new Map<string, { message: string; onCall?: number }>();

  const handlers: Record<string, (args: Record<string, unknown>) => RpcResult> = {
    create_admin_question: (args) => {
      expect(Object.keys(args).sort()).toEqual(CREATE_QUESTION_ARG_KEYS);
      return { data: { question_id: QUESTION_ID }, error: null };
    },
    import_exam_manifest: (args) => {
      expect(Object.keys(args).sort()).toEqual(["p_manifest", "p_topics"]);
      return {
        data: {
          exam_slug: "ssc-cgl",
          exam_id: EXAM_ID,
          manifest_version: 3,
          topic_count: 1,
          concept_count: 0,
          cluster_count: 0,
          cutoff_count: 0
        },
        error: null
      };
    },
    set_question_status: (args) => {
      expect(Object.keys(args).sort()).toEqual(["p_note", "p_question_id", "p_to_status"]);
      return { data: { changed: true, status: args.p_to_status }, error: null };
    },
    set_question_quality_tier: (args) => {
      expect(Object.keys(args).sort()).toEqual(["p_question_id", "p_tier"]);
      return { data: { changed: true, new_tier: args.p_tier }, error: null };
    },
    resolve_flags_for_question: (args) => {
      expect(Object.keys(args).sort()).toEqual(["p_note", "p_question_id", "p_resolution"]);
      return { data: { closed_count: 2, open_flags: 0 }, error: null };
    }
  };

  const client = {
    rpc: async (name: string, args: Record<string, unknown>): Promise<RpcResult> => {
      rpcCalls.push({ name, args });
      const failure = failures.get(name);
      const callNumber = rpcCalls.filter((call) => call.name === name).length;
      if (failure && (failure.onCall === undefined || failure.onCall === callNumber)) {
        return { data: null, error: { message: failure.message } };
      }
      const handler = handlers[name];
      return handler ? handler(args) : { data: null, error: { message: `unexpected rpc: ${name}` } };
    }
  };

  return {
    client,
    rpcCalls,
    failRpc: (name: string, message: string, onCall?: number) =>
      failures.set(name, { message, onCall })
  };
}

const VALID_IMPORT_ROW = {
  examId: EXAM_ID,
  topicId: TOPIC_ID,
  content: {
    text: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correct_options: [1]
  }
};

const VALID_MANIFEST = {
  schemaVersion: "1.0",
  exam: {
    slug: "ssc-cgl",
    name: "SSC CGL",
    languages: ["en"],
    supportedQuestionTypes: ["mcq"]
  },
  marking: {
    totalQuestions: 25,
    durationMinutes: 60,
    marksPerCorrect: 2,
    negativeMarkingFraction: 0.25,
    sections: [{ slug: "quant", name: "Quantitative Aptitude", questionCount: 25 }]
  },
  topics: [{ slug: "algebra", name: "Algebra" }]
};

const initialImportState = {
  ok: false,
  message: "",
  totalRows: 0,
  validRows: 0,
  importedRows: 0,
  errors: []
};
const initialState = { ok: false, message: "" };

function formOf(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function useFake(fake: ReturnType<typeof createFakeAdminSupabase>) {
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasSupabaseConfig.mockReturnValue(true);
  mocks.requireAdminForAction.mockResolvedValue({ ok: true, userId: "admin-1" });
});

describe("importQuestionsAction", () => {
  it("dry-run validates rows without importing or touching the database", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await importQuestionsAction(
      initialImportState,
      formOf({
        format: "json",
        payload: JSON.stringify([VALID_IMPORT_ROW, VALID_IMPORT_ROW]),
        dryRun: "on"
      })
    );

    expect(state).toMatchObject({ ok: true, totalRows: 2, validRows: 2, importedRows: 0 });
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("imports each validated row through create_admin_question with the exact contract", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await importQuestionsAction(
      initialImportState,
      formOf({ format: "json", payload: JSON.stringify([VALID_IMPORT_ROW, VALID_IMPORT_ROW]) })
    );

    expect(state).toMatchObject({ ok: true, importedRows: 2, errors: [] });
    expect(fake.rpcCalls.map((call) => call.name)).toEqual([
      "create_admin_question",
      "create_admin_question"
    ]);
    expect(fake.rpcCalls[0].args).toMatchObject({
      p_exam_id: EXAM_ID,
      p_topic_id: TOPIC_ID,
      p_type: "mcq",
      p_status: "draft",
      p_quality_tier: "bronze"
    });
  });

  it("reports row-level validation failures and never calls the RPC", async () => {
    const fake = useFake(createFakeAdminSupabase());
    const invalidRow = { ...VALID_IMPORT_ROW, examId: "not-a-uuid" };

    const state = await importQuestionsAction(
      initialImportState,
      formOf({ format: "json", payload: JSON.stringify([VALID_IMPORT_ROW, invalidRow]) })
    );

    expect(state.ok).toBe(false);
    expect(state.errors).toEqual([{ row: 2, message: expect.any(String) }]);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("stops at the failing row and reports how many rows made it in", async () => {
    const fake = useFake(createFakeAdminSupabase());
    fake.failRpc("create_admin_question", "duplicate question", 2);

    const state = await importQuestionsAction(
      initialImportState,
      formOf({ format: "json", payload: JSON.stringify([VALID_IMPORT_ROW, VALID_IMPORT_ROW]) })
    );

    expect(state).toMatchObject({
      ok: false,
      importedRows: 1,
      message: "Import stopped at row 2: duplicate question"
    });
    expect(state.errors).toEqual([{ row: 2, message: "duplicate question" }]);
  });

  it("rejects non-admin users before importing anything", async () => {
    const fake = useFake(createFakeAdminSupabase());
    mocks.requireAdminForAction.mockResolvedValue({ ok: false, message: "Admin access required." });

    const state = await importQuestionsAction(
      initialImportState,
      formOf({ format: "json", payload: JSON.stringify([VALID_IMPORT_ROW]) })
    );

    expect(state).toMatchObject({ ok: false, message: "Admin access required.", importedRows: 0 });
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe("importManifestAction", () => {
  it("imports a valid manifest through import_exam_manifest", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await importManifestAction(
      initialState,
      formOf({ manifest: JSON.stringify(VALID_MANIFEST) })
    );

    expect(state.ok).toBe(true);
    expect(state.message).toBe("Imported ssc-cgl manifest version 3.");
    expect(state.result).toMatchObject({ examSlug: "ssc-cgl", examId: EXAM_ID, topicCount: 1 });
    expect(fake.rpcCalls.map((call) => call.name)).toEqual(["import_exam_manifest"]);
  });

  it("rejects malformed manifests before the admin check or any RPC", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await importManifestAction(
      initialState,
      formOf({ manifest: JSON.stringify({ schemaVersion: "1.0" }) })
    );

    expect(state.ok).toBe(false);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("rejects non-admin users", async () => {
    const fake = useFake(createFakeAdminSupabase());
    mocks.requireAdminForAction.mockResolvedValue({ ok: false, message: "Admin access required." });

    const state = await importManifestAction(
      initialState,
      formOf({ manifest: JSON.stringify(VALID_MANIFEST) })
    );

    expect(state).toEqual({ ok: false, message: "Admin access required." });
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe("review, approval, and flag resolution", () => {
  it("approves a question through set_question_status", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await setQuestionStatusAction(
      initialState,
      formOf({ questionId: QUESTION_ID, toStatus: "approved", note: "Looks good." })
    );

    expect(state).toMatchObject({ ok: true, message: "Question is now approved." });
    expect(fake.rpcCalls[0]).toEqual({
      name: "set_question_status",
      args: { p_question_id: QUESTION_ID, p_to_status: "approved", p_note: "Looks good." }
    });
  });

  it("rejects unsupported target statuses without an RPC call", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await setQuestionStatusAction(
      initialState,
      formOf({ questionId: QUESTION_ID, toStatus: "published" })
    );

    expect(state).toMatchObject({ ok: false, message: "Unsupported target status." });
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("updates the quality tier through set_question_quality_tier", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await setQualityTierAction(
      initialState,
      formOf({ questionId: QUESTION_ID, tier: "gold" })
    );

    expect(state).toMatchObject({ ok: true, message: "Quality tier is now gold." });
    expect(fake.rpcCalls[0]).toEqual({
      name: "set_question_quality_tier",
      args: { p_question_id: QUESTION_ID, p_tier: "gold" }
    });
  });

  it("bulk-resolves question flags through resolve_flags_for_question", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await resolveQuestionFlagsAction(
      initialState,
      formOf({ questionId: QUESTION_ID, resolution: "resolved" })
    );

    expect(state.ok).toBe(true);
    expect(state.message).toContain("2 flags resolved.");
    expect(fake.rpcCalls[0]).toEqual({
      name: "resolve_flags_for_question",
      args: { p_question_id: QUESTION_ID, p_resolution: "resolved", p_note: null }
    });
  });

  it("rejects non-admin users on every mutating review action", async () => {
    const fake = useFake(createFakeAdminSupabase());
    mocks.requireAdminForAction.mockResolvedValue({ ok: false, message: "Admin access required." });

    await expect(
      setQuestionStatusAction(initialState, formOf({ questionId: QUESTION_ID, toStatus: "approved" }))
    ).resolves.toEqual({ ok: false, message: "Admin access required." });
    await expect(
      setQualityTierAction(initialState, formOf({ questionId: QUESTION_ID, tier: "gold" }))
    ).resolves.toEqual({ ok: false, message: "Admin access required." });
    await expect(
      resolveQuestionFlagsAction(
        initialState,
        formOf({ questionId: QUESTION_ID, resolution: "rejected" })
      )
    ).resolves.toEqual({ ok: false, message: "Admin access required." });
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("validates flag resolution values before anything else", async () => {
    const fake = useFake(createFakeAdminSupabase());

    const state = await resolveQuestionFlagsAction(
      initialState,
      formOf({ questionId: QUESTION_ID, resolution: "maybe" })
    );

    expect(state).toMatchObject({ ok: false, message: "Resolution must be 'resolved' or 'rejected'." });
    expect(fake.rpcCalls).toHaveLength(0);
  });
});
