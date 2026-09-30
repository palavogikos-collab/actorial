// A scripted agent. It does what Claude would do given the tools: discover, plan, call, confirm.
// No LLM in the loop so the demo is deterministic and runs offline. Swap `plan()` for a model call to make it live.

const log = (...a) => console.log(...a);
const bytes = { html: 0, tools: 0 };
let calls = 0;

async function discover(base) {
  const r = await fetch(`${base}/.well-known/agents.txt`);
  const txt = await r.text();
  bytes.tools += txt.length;
  const mcp = txt.match(/^MCP:\s*(\S+)/m)?.[1];
  log(`  discover  ${base}/.well-known/agents.txt  ->  MCP at ${mcp}`);
  return mcp;
}

async function rpc(mcp, method, params, headers = {}) {
  calls++;
  const body = JSON.stringify({ jsonrpc: "2.0", id: calls, method, params });
  const r = await fetch(mcp, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  const txt = await r.text();
  bytes.tools += txt.length + body.length;
  return JSON.parse(txt).result;
}

async function tool(mcp, name, args, opts = {}) {
  const headers = {};
  if (opts.session) headers.cookie = "session=abc";
  const params = { name, arguments: args };
  if (opts.confirmed) params._meta = { confirmed: true };
  const res = await rpc(mcp, "tools/call", params, headers);
  const out = JSON.parse(res.content[0].text);
  log(`  call      ${name}(${JSON.stringify(args)})`);
  log(`            -> ${JSON.stringify(out).slice(0, 160)}${JSON.stringify(out).length > 160 ? "..." : ""}`);
  return out;
}

function askUser(prompt) {
  // Stand-in for the browser's native permission prompt (WebMCP) or the phone's biometric confirm.
  log(`  CONFIRM   ${prompt}`);
  log(`  user      yes`);
  return true;
}

async function legacyCost(base) {
  // What today's approach costs: fetch pages as HTML. Count bytes only; we skip the clicking.
  const pages = ["/", "/search?q=27", "/search?q=monitor", "/p/4212348", "/p/4212345", "/p/4212349"];
  for (const p of pages) { const r = await fetch(base + p); bytes.html += (await r.text()).length; }
  return pages.length;
}

/* ---------------- Task 1: Plaisio ---------------- */
async function plaisio() {
  const base = "http://localhost:4001";
  log(`\nTASK 1  "Find me a 27-inch monitor under 250 euro and add it to my cart"  (${base})\n`);
  const t0 = performance.now();
  const mcp = await discover(base);
  const list = await rpc(mcp, "tools/list");
  log(`  tools     ${list.tools.map(t => t.name).join(", ")}`);

  const search = await tool(mcp, "search_catalog", { query: "27", category: "monitors", maxPrice: 250 });
  // plan(): pick the best value. Rule: prefer QHD, then IPS, then price.
  const details = [];
  for (const p of search.products) details.push(await tool(mcp, "get_product", { sku: p.sku }));
  const rank = (d) => (d.specs.resolution === "2560x1440" ? 2 : 0) + (d.specs.panel === "IPS" ? 1 : 0) - d.price / 1000;
  const pick = details.sort((a, b) => rank(b) - rank(a))[0];
  log(`  reason    best value under 250: ${pick.name} (${pick.specs.resolution}, ${pick.specs.panel}, ${pick.specs.refreshHz}Hz) at ${pick.price} EUR`);

  const first = await tool(mcp, "update_cart", { sku: pick.sku }, { session: true });
  if (first.confirm) {
    askUser(`Plaisio wants to run update_cart for ${pick.name}. Allow?`);
    await tool(mcp, "update_cart", { sku: pick.sku }, { session: true, confirmed: true });
  }
  const ms = Math.round(performance.now() - t0);
  const pages = await legacyCost(base);
  log(`\n  done in ${ms} ms, ${calls} tool calls, ${bytes.tools.toLocaleString()} bytes over the wire`);
  log(`  legacy: ${pages} HTML pages minimum, ${bytes.html.toLocaleString()} bytes, plus a cookie wall and a click-through per page`);
  log(`  ratio: ${(bytes.html / bytes.tools).toFixed(1)}x fewer bytes, and none of them need parsing`);
}

/* ---------------- Task 2: IKEA ---------------- */
async function ikea() {
  const base = "http://localhost:4002";
  log(`\nTASK 2  "Can I get a PAX 200 frame delivered to 15236 before Saturday, and what will it cost? If not, hold one at Kifisia."  (${base})\n`);
  calls = 0;
  const mcp = await discover(base);
  const s = await tool(mcp, "search_catalog", { query: "pax 200" });
  const art = s.products[0].article;
  const d = await tool(mcp, "get_delivery_options", { postcode: "15236", articles: [art] });
  const saturday = nextSaturday();
  const ok = d.slots.some(x => x <= saturday);
  log(`  reason    earliest slot ${d.slots[0]}, Saturday is ${saturday}: ${ok ? "delivery works" : "too late, fall back to click and collect"}`);
  if (ok) {
    log(`  answer    Yes. ${d.feeEur} EUR delivery, earliest ${d.slots[0]}.`);
  } else {
    const av = await tool(mcp, "check_availability", { article: art, store: "kifisia" });
    if (av.qty > 0) {
      askUser(`IKEA wants to reserve ${av.name} at Kifisia for 48h. Allow?`);
      await tool(mcp, "reserve_click_collect", { store: "kifisia", articles: [{ article: art }] }, { session: true, confirmed: true });
    }
  }
  log(`\n  done, ${calls} tool calls`);
}

/* ---------------- Task 3: Cosmodata ---------------- */
async function cosmodata() {
  const base = "http://localhost:4003";
  log(`\nTASK 3  "Is the ThinkPad E14 in stock at Cosmodata, and what's the router that goes with it?"  (${base})\n`);
  calls = 0;
  const mcp = await discover(base);
  const list = await rpc(mcp, "tools/list");
  log(`  tools     ${list.tools.map(t => t.name).join(", ")}   (generated from 4 checkboxes, no code written by the merchant)`);
  const s = await tool(mcp, "search_catalog", { query: "thinkpad e14" });
  await tool(mcp, "check_stock", { id: s.products[0].id });
  await tool(mcp, "search_catalog", { query: "router" });
  log(`\n  done, ${calls} tool calls`);
}

/* ---------------- Task 4: Sync ---------------- */
async function sync() {
  const base = "http://localhost:4004";
  log(`\nTASK 4  "I land in Heraklion 10 October, need an automatic for 5 days, budget 40 a day, deliver to the airport"  (${base})\n`);
  calls = 0;
  const mcp = await discover(base);
  const from = "2026-10-10", to = "2026-10-15";
  const s = await tool(mcp, "search_catalog", { area: "crete", from, to, gearbox: "automatic", maxDayRate: 40 });
  if (!s.cars.length) { log("  answer    nothing under 40/day, ask user to raise budget"); return; }
  const pick = s.cars.sort((a, b) => b.ownerRating - a.ownerRating)[0];
  const q = await tool(mcp, "get_quote", { carId: pick.id, from, to });
  log(`  reason    ${pick.car}, ${q.days} days, all-in ${q.total} EUR incl. delivery and insurance, deposit ${q.deposit}`);
  askUser(`Sync wants to book ${pick.car} ${from} to ${to} for ${q.total} EUR and charge a ${q.deposit} EUR deposit. Allow?`);
  const b = await tool(mcp, "create_booking", { carId: pick.id, from, to, deliveryAddress: "Heraklion Airport arrivals" }, { session: true, confirmed: true });
  log(`  answer    Booked ${b.car} from ${b.owner}, ref ${b.ref}, delivered to the airport. Free cancellation until ${b.freeCancellationUntil}.`);
  log(`\n  done, ${calls} tool calls`);
}

/* ---------------- Task 5: Workable careers ---------------- */
async function workable() {
  const base = "http://localhost:4005";
  log(`\nTASK 5  "Apply for me to any remote backend role at Acme paying at least 60k. Use my CV on file."  (${base})\n`);
  calls = 0;
  const mcp = await discover(base);
  const s = await tool(mcp, "search_catalog", { query: "backend", remote: true, minSalary: 60000 });
  const j = await tool(mcp, "get_job", { id: s.jobs[0].id });
  log(`  reason    ${j.title}: ${j.salaryMin}-${j.salaryMax} EUR, remote, needs ${j.skills.join(", ")}. Matches.`);
  askUser(`Acme Careers wants to submit an application for ${j.title} with your CV and contact details. Allow?`);
  const a = await tool(mcp, "submit_application", {
    jobId: j.id, fullName: "Takis K.", email: "takis@example.com", resume: "file:cv-2026.pdf",
    answers: { rightToWorkEU: true, noticePeriodWeeks: 4, expectedSalary: 70000 },
  }, { session: true, confirmed: true });
  await tool(mcp, "get_application_status", { applicationId: a.applicationId }, { session: true });
  log(`  answer    Applied to ${a.job}. Reference ${a.applicationId}, confirmation sent to ${a.confirmationSentTo}.`);
  log(`\n  done, ${calls} tool calls`);
}

function nextSaturday() {
  const d = new Date(); const diff = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); return d.toISOString().slice(0, 10);
}

await plaisio();
await ikea();
await cosmodata();
await sync();
await workable();
