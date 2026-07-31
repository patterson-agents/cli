/** Shared types for skill-creator scripts. */

export interface EvalItem {
  query: string;
  should_trigger: boolean;
}

export interface QueryResult {
  query: string;
  should_trigger: boolean;
  trigger_rate: number;
  triggers: number;
  runs: number;
  pass: boolean;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
}

export interface EvalOutput {
  skill_name: string;
  description: string;
  results: QueryResult[];
  summary: EvalSummary;
}

export interface HistoryEntry {
  iteration: number;
  description: string;
  train_passed: number;
  train_failed: number;
  train_total: number;
  train_results: QueryResult[];
  test_passed: number | null;
  test_failed: number | null;
  test_total: number | null;
  test_results: QueryResult[] | null;
  /** Backward compat with the report generator. */
  passed: number;
  failed: number;
  total: number;
  results: QueryResult[];
  note?: string;
}

export interface LoopOutput {
  exit_reason?: string;
  original_description: string;
  best_description: string;
  best_score: string;
  best_train_score?: string;
  best_test_score?: string | null;
  final_description?: string;
  iterations_run: number;
  holdout: number;
  train_size: number;
  test_size: number;
  history: HistoryEntry[];
}

export interface MetricStats {
  mean: number;
  stddev: number;
  min: number;
  max: number;
}

export interface ConfigSummary {
  pass_rate: MetricStats;
  time_seconds: MetricStats;
  tokens: MetricStats;
}

export interface Expectation {
  text?: string;
  passed?: boolean;
  evidence?: string;
  [key: string]: unknown;
}

export interface RunResult {
  eval_id: number | string;
  run_number: number;
  pass_rate: number;
  passed: number;
  failed: number;
  total: number;
  time_seconds: number;
  tokens?: number;
  tool_calls?: number;
  errors?: number;
  expectations: Expectation[];
  notes: string[];
}

export interface Benchmark {
  metadata: {
    skill_name: string;
    skill_path: string;
    executor_model: string;
    analyzer_model: string;
    timestamp: string;
    evals_run: Array<number | string>;
    runs_per_configuration: number;
  };
  runs: Array<{
    eval_id: number | string;
    configuration: string;
    run_number: number;
    result: {
      pass_rate: number;
      passed: number;
      failed: number;
      total: number;
      time_seconds: number;
      tokens: number;
      tool_calls: number;
      errors: number;
    };
    expectations: Expectation[];
    notes: string[];
  }>;
  run_summary: Record<
    string,
    ConfigSummary | { pass_rate: string; time_seconds: string; tokens: string }
  >;
  notes: string[];
}

export interface EmbeddedFile {
  name: string;
  type: "text" | "image" | "pdf" | "xlsx" | "binary" | "error";
  content?: string;
  mime?: string;
  data_uri?: string;
  data_b64?: string;
}

export interface ReviewRun {
  id: string;
  prompt: string;
  eval_id: number | null;
  outputs: EmbeddedFile[];
  grading: Record<string, unknown> | null;
}
