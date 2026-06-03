/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for TSP-066 AI gateway connectivity. DB-independent: one real Groq call, no ledger insert.
const fs = require("fs");
const path = require("path");

try {
  require("dotenv").config({ path: path.join(process.cwd(), ".env") });
} catch {
  loadEnvFile(path.join(process.cwd(), ".env"));
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS_CEILING = 4096;
const GROQ_PRICING = {
  "llama-3.3-70b-versatile": { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  "llama-3.1-8b-instant": { inputPerMillion: 0.05, outputPerMillion: 0.08 }
};
const FALLBACK_PRICING = { inputPerMillion: 0.59, outputPerMillion: 0.79 };

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error("ASSERT FAILED: " + message);
  }
}

function computeCostUsd(model, tokensIn, tokensOut) {
  const pricing = GROQ_PRICING[model] ?? FALLBACK_PRICING;
  const cost =
    (Math.max(0, tokensIn) / 1_000_000) * pricing.inputPerMillion +
    (Math.max(0, tokensOut) / 1_000_000) * pricing.outputPerMillion;

  return Number.isFinite(cost) ? Number(cost.toFixed(6)) : 0;
}

async function main() {
  assert(process.env.GROQ_API_KEY, "GROQ_API_KEY must be set");
  assert(process.env.AI_DISABLED !== "true", "AI_DISABLED must not be true for live smoke");

  const model = process.env.GROQ_SMOKE_MODEL || DEFAULT_GROQ_MODEL;
  const startedAt = Date.now();
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "Return only a JSON object with the exact shape {\"ok\":true}."
        },
        { role: "user", content: "Confirm the AI gateway smoke test." }
      ],
      temperature: 0,
      max_tokens: Math.min(32, MAX_OUTPUT_TOKENS_CEILING),
      response_format: { type: "json_object" }
    })
  });
  const latencyMs = Math.max(0, Date.now() - startedAt);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Groq smoke failed HTTP ${response.status}: ${text}`);
  }

  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  const tokensIn = Number(data?.usage?.prompt_tokens ?? 0);
  const tokensOut = Number(data?.usage?.completion_tokens ?? 0);
  const costUsd = computeCostUsd(model, tokensIn, tokensOut);

  assert(typeof content === "string" && content.length > 0, "response content exists");
  assert(tokensIn > 0, "tokensIn > 0");
  assert(tokensOut > 0, "tokensOut > 0");
  assert(costUsd >= 0, "costUsd >= 0");

  const parsedContent = JSON.parse(content);
  assert(parsedContent.ok === true, "model returned ok:true JSON");

  console.log(
    `AI gateway smoke ok: model=${model} latencyMs=${latencyMs} tokensIn=${tokensIn} tokensOut=${tokensOut} costUsd=${costUsd}`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
