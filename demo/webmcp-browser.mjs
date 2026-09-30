// Drives the Plaisio mock page in headless Chromium. Chromium here has no WebMCP flag,
// so we inject a tiny navigator.modelContext polyfill that mimics the W3C draft surface,
// then act as an agent calling the page-registered tools.
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext();
await ctx.addCookies([{ name: "session", value: "abc", url: "http://localhost:4001" }]);
await ctx.addInitScript(() => {
  const tools = new Map();
  navigator.modelContext = { registerTool: (t) => tools.set(t.name, t), __tools: tools };
  window.confirm = (msg) => { console.log("PROMPT: " + msg); return true; };
});
const page = await ctx.newPage();
page.on("console", m => { if (!/Failed to load/.test(m.text())) console.log("  browser  " + m.text()); });
await page.goto("http://localhost:4001/");
const names = await page.evaluate(() => [...navigator.modelContext.__tools.keys()]);
console.log("  registered via navigator.modelContext:", names.join(", "));
const run = (name, input) => page.evaluate(async ([n, i]) => { const r = await navigator.modelContext.__tools.get(n).execute(i); return r.content[0].text; }, [name, input]);
console.log("  search_catalog ->", (await run("search_catalog", { query: "27", maxPrice: 250, category: "monitors" })).slice(0, 120) + "...");
console.log("  update_cart      ->", await run("update_cart", { sku: "4212349" }));
await browser.close();
