# actorial

Make any website operable by AI agents. One config file, zero dependencies.

```
npm install actorial
```

## The problem

Websites are built for eyes. An AI assistant asked to "find a 27-inch monitor under 250 euro and add it to my cart" has to load a 300 KB homepage, dismiss a cookie wall, guess the search box, parse product cards out of markup, open each product page, and hope the button it clicks is the right one. Six page loads, a few megabytes, thirty seconds, and it can still get it wrong.

Shopify fixed this for Shopify stores in 2026: every store now serves a Universal Commerce Protocol (UCP) endpoint that agents call directly. Everyone else, which is most of retail outside North America, has nothing.

## What actorial does

A site owner writes one file listing the actions their site supports and pointing each one at a function the site already has. actorial turns that into every surface an agent looks for:

| Surface | Path | Who reads it |
|---|---|---|
| Discovery | `/.well-known/agents.txt`, `agents.json`, `/llms.txt` | Any agent, first request |
| UCP manifest | `/.well-known/ucp` | Agents that shop on Shopify |
| MCP endpoint | `/mcp` and `/api/ucp/mcp` | Assistants without a browser (phone, server side) |
| WebMCP | tools registered on `navigator.modelContext` | Agentic browsers: Chrome 146+, Edge 147+ |
| OpenAPI 3.1 | `/openapi.json` | Traditional integrations |

Reads are silent. Writes stop for confirmation: a native browser prompt under WebMCP, a confirmed flag on the MCP path after the user approved on their device. Tool names follow Shopify's UCP endpoint (`search_catalog`, `get_product`, `get_cart`, `update_cart`), so an agent that already knows how to shop on Shopify needs nothing new.

## Same task, after

```
discover  /.well-known/agents.txt          -> MCP at /mcp
call      search_catalog({query:"27", category:"monitors", maxPrice:250})
call      get_product({sku:"4212349"})       x4
reason    best value under 250: Philips 275E1S QHD IPS at 199 EUR
call      update_cart({sku:"4212349"})       -> confirmation required
CONFIRM   Plaisio wants to run update_cart for Philips 275E1S. Allow?   user: yes
call      update_cart({sku:"4212349"})       -> ok, total 199

done in 81 ms, 8 tool calls, 5.4 KB over the wire
legacy: 6 HTML pages minimum, 118 KB, plus a cookie wall and a click-through per page
```

## Run it

```
git clone https://github.com/palavogikos-collab/actorial.git && cd actorial
npm install
npm run sites     # five mock sites on :4001 to :4005
npm run demo      # a scripted agent completes five tasks across them
npm run check http://localhost:4001
```

`npm run check` against a live site scores it on eight probes. Measured 29 and 30 September 2026:

| Site | Score | Homepage | 404 page | Note |
|---|---|---|---|---|
| plaisio.gr | 0/100 | 300 KB | 62 KB | |
| ikea.gr | 0/100 | 2.5 MB | 1.2 MB | |
| cosmodata.gr | 0/100 | 912 KB | 6 KB | |
| thesync.com | 15/100 | 525 KB | 240 B | serves a real llms.txt |
| workable.com | 0/100 | 173 KB | 71 B | /llms.txt answers 200 with an HTML page; the probe treats that as missing |

The entire Plaisio task above costs less than any of the first three sites' 404 pages.

## What a site writes

```js
// agent.config.js
import { defineAgentConfig, s } from "actorial";

export default defineAgentConfig({
  site: "Plaisio",
  baseUrl: "https://www.plaisio.gr",
  tools: {
    search_catalog: {
      description: "Search the catalogue",
      input: s.object({ query: s.string(), maxPrice: s.number().optional() }),
      readOnly: true,
      handler: ({ query, maxPrice }) => catalogue.search(query, maxPrice),
    },
    update_cart: {
      input: s.object({ sku: s.string(), qty: s.integer().default(1) }),
      auth: "session",
      confirm: true,
      handler: ({ sku, qty }, ctx) => cart.add(ctx.session.user, sku, qty),
    },
  },
});
```

Then in the server:

```js
import { createServer } from "actorial";
import config from "./agent.config.js";
createServer(config, { renderPage }).listen(443);
```

Handlers are the functions the site's front end already calls. Nothing new on the backend.

## Five examples

- `examples/plaisio`: electronics retailer, five tools, plus a deliberately heavy legacy page so the demo can measure the difference.
- `examples/ikea`: the tools follow the business, not the page. Store availability, delivery quote by postcode, click and collect reservation.
- `examples/cosmodata`: a small reseller with no developers. No config file. `platform-settings.json` has four checkboxes and `adapters/shop-platform.js` maps them onto the shop platform's existing REST API. This is the shape of a WooCommerce or Magento plugin.

- `examples/sync`: a peer-to-peer car rental marketplace modelled on thesync.com. Search by area and dates, an all-in quote with delivery, insurance and deposit, then a booking that charges the deposit and so requires confirmation. Task: "I land in Heraklion on the 10th, need an automatic for 5 days under 40 a day, deliver to the airport." Three calls.
- `examples/workable`: a careers site hosted on Workable, where the agent acts for the candidate. Search roles by department, remote and salary, read the posting, submit the application with the screening answers, check its status. Task: "Apply for me to any remote backend role paying at least 60k, use my CV on file." Four calls. This is the pattern for any form-driven site: the form becomes one tool with a schema.

Two of the five are not shops. The config format does not care.

For Shopify merchants, `adapters/shopify.js` emits only what Shopify does not serve: `agents.txt` and `llms.txt` pointing at the store's own UCP endpoint.

## Standards

actorial writes no new spec. It emits:

- WebMCP (W3C Community Group draft, `navigator.modelContext`)
- Model Context Protocol (JSON-RPC, tools/list and tools/call)
- Universal Commerce Protocol discovery manifest and tool names, as Shopify serves them since August 2026
- agents.txt and agents.json (IETF draft-car-agents-txt-wellknown)
- llms.txt
- OpenAPI 3.1

When these change, the generator changes and every site that installed the package follows.

## Layout

```
packages/actorial/src/index.js               defineAgentConfig, generated surfaces, MCP server, browser runtime
packages/actorial/src/schema.js              zod-like schema builder emitting JSON Schema, plus validator
packages/actorial/src/adapters/shop-platform.js
packages/actorial/src/adapters/shopify.js
packages/actorial/bin/actorial.js            actorial check <url>
examples/{plaisio,ikea,cosmodata,sync,workable}
demo/agent.js                                scripted agent, deterministic, no LLM required
demo/webmcp-browser.mjs                      Playwright test of the in-page layer in your Chrome
```

## Status and roadmap

Prototype. Works end to end on the mocks. Not yet:

- OAuth 2.1 with per-tool scopes on the remote MCP path. Today a session cookie or any bearer token counts as signed in.
- UCP's `ucp-agent` profile handshake, the `catalog` wrapper on arguments, checkout and order tools.
- Framework adapters: Next.js server actions, SvelteKit form actions, WooCommerce, Magento.
- A public leaderboard behind `actorial check`.

Contributions welcome on any of these. The adapters are the highest leverage.

## License

MIT
