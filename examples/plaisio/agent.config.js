import { defineAgentConfig, s } from "actorial";
import { products, carts } from "./data.js";

const pub = (p) => ({ sku: p.sku, name: p.name, brand: p.brand, price: p.price, category: p.category, inStock: p.stock.web > 0 });

export default defineAgentConfig({
  site: "Plaisio (mock)",
  description: "Greek electronics and office retailer. Computers, monitors, peripherals, phones.",
  baseUrl: "http://localhost:4001",
  tools: {
    search_catalog: {
      description: "Search the catalogue by free text with optional price and category filters.",
      input: s.object({
        query: s.string().describe("Free text, e.g. '27 monitor'"),
        maxPrice: s.number().optional().describe("Max price in EUR"),
        category: s.enum(["monitors", "laptops", "mice", "keyboards"]).optional(),
        limit: s.integer().default(10),
      }),
      readOnly: true,
      handler: ({ query, maxPrice, category, limit }) => {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const hits = products.filter(p => {
          const hay = `${p.name} ${p.brand} ${p.category} ${p.size || ""}`.toLowerCase();
          return terms.every(t => hay.includes(t))
            && (maxPrice === undefined || p.price <= maxPrice)
            && (!category || p.category === category);
        });
        return { count: hits.length, products: hits.slice(0, limit).map(pub) };
      },
    },
    get_product: {
      description: "Full details and specs for one product by SKU.",
      input: s.object({ sku: s.string() }),
      readOnly: true,
      handler: ({ sku }) => {
        const p = products.find(x => x.sku === sku);
        if (!p) return { error: "not found" };
        const { stock, ...rest } = p;
        return { ...rest, specs: { size: p.size, panel: p.panel, refreshHz: p.hz, resolution: p.res }, webStock: stock.web };
      },
    },
    check_store_stock: {
      description: "Stock level of a SKU at a physical store.",
      input: s.object({ sku: s.string(), store: s.enum(["syntagma", "marousi"]) }),
      readOnly: true,
      handler: ({ sku, store }) => {
        const p = products.find(x => x.sku === sku);
        return p ? { sku, store, qty: p.stock[store] } : { error: "not found" };
      },
    },
    update_cart: {
      description: "Add a SKU to the signed-in user's cart.",
      input: s.object({ sku: s.string(), qty: s.integer().default(1) }),
      auth: "session",
      confirm: true,
      handler: ({ sku, qty }, ctx) => {
        const p = products.find(x => x.sku === sku);
        if (!p) return { error: "not found" };
        const cart = carts.get(ctx.session.user) || [];
        cart.push({ sku, qty });
        carts.set(ctx.session.user, cart);
        const total = cart.reduce((a, l) => a + products.find(x => x.sku === l.sku).price * l.qty, 0);
        return { ok: true, cart, total: Number(total.toFixed(2)) };
      },
    },
    get_cart: {
      description: "Current cart contents for the signed-in user.",
      input: s.object({}),
      auth: "session",
      readOnly: true,
      handler: (_i, ctx) => ({ cart: carts.get(ctx.session.user) || [] }),
    },
  },
});
