export const JOB_TYPES = [
  'generate_analysis',
  'generate_improvement_plan',
  'update_mastery',
  'update_retest_queue',
  'send_reminders',
  'question_generation',
  'embed_questions',
  'compute_question_stats',
  'decay_mastery',
  'compute_percentiles',
  'weekly_digest',
  'cleanup_expired_sessions',
  'generate_learning_path',
] as const;
export type JobType = typeof JOB_TYPES[number];

export const JOB_STATUSES = ['pending','running','completed','failed','dead'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

// Typed payloads for known job types; string-keyed fallback for future types.
export type JobPayloads = {
  generate_analysis:          { result_id: string; user_id: string };
  generate_improvement_plan:  { result_id: string; user_id: string; exam_id: string };
  update_mastery:             { result_id: string; user_id: string };
  update_retest_queue:        { result_id: string; user_id: string };
  send_reminders:             { user_id: string };
  question_generation:        { exam_id: string; topic_id: string; count: number };
  embed_questions:            { question_id: string };
  compute_question_stats:     Record<string, never>;
  decay_mastery:              Record<string, never>;
  compute_percentiles:        Record<string, never>;
  weekly_digest:              { user_id: string };
  cleanup_expired_sessions:   Record<string, never>;
  generate_learning_path:     { learning_path_id: string };
};

export type JobRow = {
  id: string;
  type: JobType;
  status: JobStatus;
  idempotency_key: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
  next_run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
