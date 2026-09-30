import { defineAgentConfig, s } from "actorial";

// Mock IKEA Greece. The value here is availability and delivery, not search.
const articles = [
  { article: "902.145.63", name: "PAX Wardrobe frame 200x58x236 white", price: 240, weightKg: 62, stock: { airport: 12, kifisia: 3, thessaloniki: 6 } },
  { article: "702.758.87", name: "KALLAX Shelving unit 4x4 white", price: 129, weightKg: 34, stock: { airport: 0, kifisia: 5, thessaloniki: 9 } },
  { article: "204.084.48", name: "BILLY Bookcase 80x28x202 white", price: 69, weightKg: 26, stock: { airport: 25, kifisia: 14, thessaloniki: 30 } },
  { article: "394.174.25", name: "MALM Bed frame 160x200 white oak", price: 279, weightKg: 71, stock: { airport: 4, kifisia: 0, thessaloniki: 2 } },
  { article: "504.017.98", name: "POÄNG Armchair birch/Knisa light beige", price: 119, weightKg: 12, stock: { airport: 18, kifisia: 7, thessaloniki: 11 } },
];
const reservations = [];

// Delivery zones by Attica postcode prefix. Illustrative.
function zone(postcode) {
  if (/^1[0-9]/.test(postcode)) return { zone: "attica", baseFee: 39, days: 2 };
  if (/^5[0-9]/.test(postcode)) return { zone: "thessaloniki", baseFee: 39, days: 2 };
  return { zone: "rest", baseFee: 79, days: 5 };
}

export default defineAgentConfig({
  site: "IKEA Greece (mock)",
  description: "Furniture and home furnishing. Stores at Airport, Kifisia, Thessaloniki. Home delivery and click and collect.",
  baseUrl: "http://localhost:4002",
  tools: {
    search_catalog: {
      description: "Search the range by free text.",
      input: s.object({ query: s.string(), maxPrice: s.number().optional() }),
      readOnly: true,
      handler: ({ query, maxPrice }) => {
        const terms = query.toLowerCase().split(/\s+/);
        const hits = articles.filter(a => terms.every(t => a.name.toLowerCase().includes(t)) && (maxPrice === undefined || a.price <= maxPrice));
        return { products: hits.map(({ stock, ...a }) => a) };
      },
    },
    check_availability: {
      description: "Stock of an article at a specific store.",
      input: s.object({ article: s.string(), store: s.enum(["airport", "kifisia", "thessaloniki"]) }),
      readOnly: true,
      handler: ({ article, store }) => {
        const a = articles.find(x => x.article === article);
        return a ? { article, name: a.name, store, qty: a.stock[store] } : { error: "not found" };
      },
    },
    get_delivery_options: {
      description: "Delivery cost and earliest slot for a set of articles to a postcode.",
      input: s.object({ postcode: s.string(), articles: s.array(s.string()) }),
      readOnly: true,
      handler: ({ postcode, articles: list }) => {
        const z = zone(postcode);
        const items = list.map(id => articles.find(a => a.article === id)).filter(Boolean);
        const weight = items.reduce((s, a) => s + a.weightKg, 0);
        const fee = z.baseFee + (weight > 50 ? 20 : 0);
        const earliest = new Date(); earliest.setDate(earliest.getDate() + z.days);
        const slots = [0, 1, 2].map(d => { const dt = new Date(earliest); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); });
        return { postcode, zone: z.zone, totalWeightKg: weight, feeEur: fee, slots };
      },
    },
    reserve_click_collect: {
      description: "Reserve articles for pickup at a store. Held for 48 hours.",
      input: s.object({ store: s.enum(["airport", "kifisia", "thessaloniki"]), articles: s.array(s.object({ article: s.string(), qty: s.integer().default(1) })) }),
      auth: "session",
      confirm: true,
      handler: ({ store, articles: list }, ctx) => {
        for (const l of list) {
          const a = articles.find(x => x.article === l.article);
          if (!a || a.stock[store] < l.qty) return { error: `insufficient stock for ${l.article} at ${store}` };
        }
        const id = "RES-" + (1000 + reservations.length);
        reservations.push({ id, user: ctx.session.user, store, list });
        return { ok: true, reservationId: id, store, articles: list, holdHours: 48 };
      },
    },
  },
});
