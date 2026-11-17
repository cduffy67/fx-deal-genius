// Run: bun evals/cli.ts [runs]
// Needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (bun loads .env automatically).
import { writeFileSync } from "node:fs";
import { runEvals, toMarkdown } from "./run";
import { intakeMarkdown, runIntakeEvals } from "./intake";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const runs = Number(process.argv[2] ?? 2);
const report = await runEvals({ endpoint: `${url}/functions/v1/deal-analyst`, anonKey: key, runs });
const intake = await runIntakeEvals({ endpoint: `${url}/functions/v1/request-intake`, anonKey: key, runs });
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify({ analyst: report, intake }, null, 2));
console.log("## Decision pack\n\n" + toMarkdown(report));
console.log("\n## Email intake\n\n" + intakeMarkdown(intake));
process.exit(report.results.every((r) => r.ok) && intake.results.every((r) => r.ok) ? 0 : 1);
