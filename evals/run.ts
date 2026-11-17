import { evaluateGovernance } from "../src/lib/governance";
import { buildAnalystRequest, type AnalystResponse } from "../src/lib/ai-request";
import { CASES, type EvalCase } from "./cases";
import { CHECK_NAMES, runChecks, type CheckResult } from "./checks";

export type RunResult = {
  caseId: string;
  description: string;
  outcome: string;
  run: number;
  ok: boolean;
  error?: string;
  checks: CheckResult[];
  ms: number;
  /** Raw model output, kept so every verdict can be inspected. */
  raw?: AnalystResponse;
};

export type EvalReport = {
  model: string;
  ranAt: string;
  runsPerCase: number;
  results: RunResult[];
};

export type RunOptions = {
  /** e.g. https://<project>.supabase.co/functions/v1/deal-analyst */
  endpoint: string;
  /** Supabase publishable (anon) key */
  anonKey: string;
  runs?: number;
  concurrency?: number;
  cases?: EvalCase[];
  fetchImpl?: typeof fetch;
};

async function callOnce(o: RunOptions, c: EvalCase, run: number): Promise<RunResult & { model?: string }> {
  const g = evaluateGovernance(c.deal);
  const started = Date.now();
  const f = o.fetchImpl ?? fetch;
  try {
    let res: Response | undefined;
    // Retry gateway rate limits (429) with backoff; anything else fails the run.
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await f(o.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: o.anonKey,
          Authorization: `Bearer ${o.anonKey}`,
        },
        body: JSON.stringify(buildAnalystRequest(c.deal, g)),
      });
      if (res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
    if (!res) throw new Error("no response");
    const body = (await res.json()) as AnalystResponse;
    if (!res.ok || body.error) throw new Error(String(body.error ?? `HTTP ${res.status}`));
    const checks = runChecks(c, g, body);
    return {
      caseId: c.id,
      description: c.description,
      outcome: g.outcome,
      run,
      ok: checks.every((x) => x.pass),
      checks,
      ms: Date.now() - started,
      model: typeof body.model === "string" ? body.model : undefined,
      raw: body,
    };
  } catch (e) {
    return {
      caseId: c.id,
      description: c.description,
      outcome: g.outcome,
      run,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      checks: [],
      ms: Date.now() - started,
    };
  }
}

export async function runEvals(o: RunOptions): Promise<EvalReport> {
  const cases = o.cases ?? CASES;
  const runs = o.runs ?? 1;
  const jobs = cases.flatMap((c) => Array.from({ length: runs }, (_, i) => [c, i + 1] as const));
  const out: (RunResult & { model?: string })[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const [c, run] = jobs[next++];
      out.push(await callOnce(o, c, run));
    }
  };
  await Promise.all(Array.from({ length: o.concurrency ?? 2 }, worker));
  out.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.run - b.run);
  return {
    model: out.find((r) => r.model)?.model ?? "unknown",
    ranAt: new Date().toISOString(),
    runsPerCase: runs,
    results: out.map(({ model: _m, ...r }) => r),
  };
}

/** Markdown summary: one row per check, then any failures. */
export function toMarkdown(rep: EvalReport): string {
  const n = rep.results.length;
  const passed = rep.results.filter((r) => r.ok).length;
  const L: string[] = [];
  L.push(
    `**${passed}/${n} runs passed every check** · ${rep.results.length / rep.runsPerCase} cases × ${rep.runsPerCase} runs · \`${rep.model}\` · ${rep.ranAt.slice(0, 10)}`,
  );
  L.push("");
  L.push("| Check | Passed |");
  L.push("|---|---|");
  for (const name of CHECK_NAMES) {
    const rel = rep.results.flatMap((r) => r.checks.filter((c) => c.name === name));
    if (!rel.length) continue;
    L.push(`| ${name} | ${rel.filter((c) => c.pass).length}/${rel.length} |`);
  }
  const errors = rep.results.filter((r) => r.error);
  if (errors.length) L.push(`| Request errors | ${errors.length} |`);
  const fails = rep.results.flatMap((r) =>
    r.checks.filter((c) => !c.pass).map((c) => `- \`${r.caseId}\` run ${r.run} — ${c.name}: ${c.detail ?? ""}`),
  );
  if (fails.length) {
    L.push("");
    L.push("Failures:");
    L.push(...fails);
  }
  return L.join("\n");
}
