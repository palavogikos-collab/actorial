#!/usr/bin/env node
// actorial check <url>  : score a live site for agent readiness.
const [cmd, target] = process.argv.slice(2);

if (cmd !== "check" || !target) {
  console.log("usage: actorial check <https://site>");
  process.exit(1);
}

const base = target.replace(/\/$/, "");
const probes = [
  { name: "ucp manifest", path: "/.well-known/ucp", weight: 15, ok: (r, b) => r.ok && /"ucp"/.test(b) },
  { name: "agents.txt", path: "/.well-known/agents.txt", weight: 15, ok: (r, b) => r.ok && /MCP:|WebMCP:/i.test(b) },
  { name: "agents.json", path: "/.well-known/agents.json", weight: 10, ok: (r, b) => r.ok && b.trim().startsWith("{") },
  { name: "llms.txt", path: "/llms.txt", weight: 15, ok: (r, b) => r.ok && b.trim().startsWith("#") },
  { name: "openapi", path: "/openapi.json", weight: 10, ok: (r, b) => r.ok && /"openapi"/.test(b) },
  { name: "mcp endpoint", path: "/mcp", weight: 10, method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" }, ok: (r, b) => r.ok && /"tools"/.test(b) },
  { name: "ucp mcp endpoint", path: "/api/ucp/mcp", weight: 10, method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" }, ok: (r, b) => r.ok && /"tools"/.test(b) },
  { name: "webmcp script on page", path: "/", weight: 15, ok: (r, b) => r.ok && /navigator\.modelContext|actorial\.js/.test(b) },
];

let score = 0;
const rows = [];
for (const p of probes) {
  let pass = false, note = "";
  try {
    const r = await fetch(base + p.path, {
      method: p.method || "GET",
      headers: p.body ? { "content-type": "application/json" } : {},
      body: p.body ? JSON.stringify(p.body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const b = await r.text();
    pass = p.ok(r, b);
    note = `${r.status}, ${b.length} bytes`;
  } catch (e) { note = e.message; }
  if (pass) score += p.weight;
  rows.push([pass ? "PASS" : "FAIL", p.name.padEnd(22), String(p.weight).padStart(3), note]);
}
console.log(`\nactorial check ${base}\n`);
for (const r of rows) console.log("  " + r.join("  "));
console.log(`\n  score: ${score}/100  ${score >= 80 ? "agent-ready" : score >= 40 ? "partial" : "built for eyes, not agents"}\n`);
