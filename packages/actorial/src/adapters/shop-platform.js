import { defineAgentConfig, s } from "../index.js";

/**
 * Adapter for off-the-shelf shop platforms (WooCommerce, Shopify, Magento, SoftOne eShop...).
 * The merchant does not write code. They tick capabilities in a settings panel;
 * the adapter maps each tick to the platform's existing REST API.
 *
 * platform: { search(q), get(id), stock(id), cartAdd(user, id, qty), cartGet(user) }
 * settings: { site, description, baseUrl, enabled: ["search","product","stock","cart"] }
 */
export function fromShopPlatform(platform, settings) {
  const on = new Set(settings.enabled);
  const tools = {};

  if (on.has("search")) tools.search_catalog = {
    description: "Search products by text, optional max price.",
    input: s.object({ query: s.string(), maxPrice: s.number().optional(), limit: s.integer().default(10) }),
    readOnly: true,
    handler: async ({ query, maxPrice, limit }) => {
      const rows = await platform.search(query);
      return { products: rows.filter(r => maxPrice === undefined || r.price <= maxPrice).slice(0, limit) };
    },
  };
  if (on.has("product")) tools.get_product = {
    description: "Product details by id.",
    input: s.object({ id: s.string() }),
    readOnly: true,
    handler: ({ id }) => platform.get(id),
  };
  if (on.has("stock")) tools.check_stock = {
    description: "Live stock and lead time for a product id.",
    input: s.object({ id: s.string() }),
    readOnly: true,
    handler: ({ id }) => platform.stock(id),
  };
  if (on.has("cart")) {
    tools.update_cart = {
      description: "Add a product to the signed-in user's cart.",
      input: s.object({ id: s.string(), qty: s.integer().default(1) }),
      auth: "session", confirm: true,
      handler: ({ id, qty }, ctx) => platform.cartAdd(ctx.session.user, id, qty),
    };
    tools.get_cart = {
      description: "Cart contents.",
      input: s.object({}),
      auth: "session", readOnly: true,
      handler: (_i, ctx) => platform.cartGet(ctx.session.user),
    };
  }
  return defineAgentConfig({ site: settings.site, description: settings.description, baseUrl: settings.baseUrl, tools });
}
