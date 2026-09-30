import { readFileSync } from "node:fs";
import { createServer } from "actorial";
import { fromShopPlatform } from "actorial/adapters/shop-platform";

// Stand-in for the shop platform's REST API (WooCommerce / SoftOne eShop / whatever they run).
const db = [
  { id: "CD-1001", name: "Lenovo ThinkPad E14 Gen 6 Ryzen 5 16GB 512GB", price: 799, stock: 3, leadDays: 0 },
  { id: "CD-1002", name: "Dell Latitude 5450 i5 16GB 512GB", price: 1099, stock: 0, leadDays: 7 },
  { id: "CD-1003", name: "TP-Link Archer AX55 WiFi 6 router", price: 69, stock: 15, leadDays: 0 },
  { id: "CD-1004", name: "Ubiquiti UniFi U6 Lite access point", price: 109, stock: 8, leadDays: 0 },
  { id: "CD-1005", name: "Samsung 990 PRO 2TB NVMe", price: 169, stock: 22, leadDays: 0 },
  { id: "CD-1006", name: "APC Back-UPS 950VA", price: 139, stock: 5, leadDays: 0 },
];
const carts = new Map();
const platform = {
  search: async (q) => db.filter(p => q.toLowerCase().split(/\s+/).every(t => p.name.toLowerCase().includes(t))).map(({ stock, leadDays, ...p }) => p),
  get: async (id) => db.find(p => p.id === id) || { error: "not found" },
  stock: async (id) => { const p = db.find(p => p.id === id); return p ? { id, stock: p.stock, leadDays: p.leadDays } : { error: "not found" }; },
  cartAdd: async (user, id, qty) => { const c = carts.get(user) || []; c.push({ id, qty }); carts.set(user, c); return { ok: true, cart: c }; },
  cartGet: async (user) => ({ cart: carts.get(user) || [] }),
};

const settings = JSON.parse(readFileSync(new URL("./platform-settings.json", import.meta.url)));
const config = fromShopPlatform(platform, settings);
createServer(config).listen(4003, () => console.log("cosmodata mock on http://localhost:4003"));
