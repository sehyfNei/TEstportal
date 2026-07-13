// Post-deploy smoke (TSP-144). Run after every deploy:
//   BASE_URL=https://<deployment> node scripts/post-deploy-smoke.mjs
// or locally against `pnpm start`: node scripts/post-deploy-smoke.mjs
// Exits non-zero on the first hard failure so CI/CD gates on it (TSP-146).

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const checks = [
  { name: "home renders", path: "/", expect: expectStatus(200) },
  { name: "login renders", path: "/login", expect: expectStatus(200) },
  { name: "health: app + db reachable", path: "/api/health", expect: expectHealth },
  { name: "anon /tests redirects to login", path: "/tests", expect: expectLoginRedirect },
  { name: "anon /dashboard redirects to login", path: "/dashboard", expect: expectLoginRedirect },
  { name: "anon /schedule redirects to login", path: "/schedule", expect: expectLoginRedirect },
  { name: "anon /admin is not served", path: "/admin", expect: expectRedirect }
];

function expectStatus(code) {
  return async (res) => {
    if (res.status !== code) return `expected ${code}, got ${res.status}`;
    return null;
  };
}

async function expectHealth(res) {
  if (res.status !== 200) return `expected 200, got ${res.status}`;
  const body = await res.json().catch(() => null);
  if (!body || body.ok !== true || body.db !== true) {
    return `unhealthy body: ${JSON.stringify(body)}`;
  }
  return null;
}

async function expectRedirect(res) {
  if (res.status < 300 || res.status >= 400) {
    return `expected 3xx redirect, got ${res.status}`;
  }
  return null;
}

async function expectLoginRedirect(res) {
  const redirected = await expectRedirect(res);
  if (redirected) return redirected;
  const location = res.headers.get("location") ?? "";
  if (!location.includes("/login")) return `redirects to ${location}, expected /login`;
  return null;
}

let failures = 0;

for (const check of checks) {
  const url = `${BASE_URL}${check.path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const problem = await check.expect(res);
    if (problem) {
      failures += 1;
      console.error(`FAIL  ${check.name} (${url}): ${problem}`);
    } else {
      console.log(`ok    ${check.name}`);
    }
  } catch (err) {
    failures += 1;
    console.error(`FAIL  ${check.name} (${url}): ${err.message ?? err}`);
  }
}

if (failures > 0) {
  console.error(`\nPost-deploy smoke FAILED: ${failures}/${checks.length} checks red (${BASE_URL})`);
  process.exit(1);
}

console.log(`\nPost-deploy smoke passed: ${checks.length}/${checks.length} (${BASE_URL})`);
