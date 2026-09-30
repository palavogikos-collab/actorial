import { agentsTxt, llmsTxt } from "../index.js";

/**
 * Shopify adapter. Shopify stores already run a UCP endpoint at /api/ucp/mcp
 * with a /.well-known/ucp manifest (default on since Aug 2026). Nothing to proxy.
 * What they lack is the protocol-agnostic discovery layer: agents.txt and llms.txt.
 * This emits those two files pointing at the store's own endpoints, for a theme
 * or app to serve.
 */
export function shopifyDiscoveryFiles({ shopDomain, name, description }) {
  const base = `https://${shopDomain}`;
  const cfg = {
    site: name, description: description || "", baseUrl: base,
    tools: {
      search_catalog: { description: "Search the catalogue (UCP)", readOnly: true, inputSchema: { properties: { query: {} } } },
      get_product: { description: "Product details (UCP)", readOnly: true, inputSchema: { properties: { id: {} } } },
      update_cart: { description: "Create or replace a cart (UCP, PUT semantics)", readOnly: false, inputSchema: { properties: { cart_id: {}, lines: {} } } },
      get_cart: { description: "Cart contents (UCP)", readOnly: true, inputSchema: { properties: { cart_id: {} } } },
      search_shop_policies_and_faqs: { description: "Store policies and FAQ (Storefront MCP)", readOnly: true, inputSchema: { properties: { query: {} } } },
    },
  };
  const txt = agentsTxt(cfg)
    .replace(`MCP: ${base}/mcp`, `MCP: ${base}/api/ucp/mcp`)
    .replace(`OpenAPI: ${base}/openapi.json\n`, "")
    .replace(`WebMCP: ${base}/\n`, "");
  const llms = llmsTxt(cfg).replace(`- MCP: ${base}/mcp`, `- MCP (UCP): ${base}/api/ucp/mcp\n- Policies MCP: ${base}/api/mcp`).replace(`- OpenAPI: ${base}/openapi.json\n`, "");
  return { "agents.txt": txt, "llms.txt": llms };
}
