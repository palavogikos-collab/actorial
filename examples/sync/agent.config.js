import { defineAgentConfig, s } from "actorial";

// Mock of Sync (thesync.com): peer-to-peer car rental across Greece. Delivered to your location.
// The value is availability by place and date, an all-in quote, and a booking with a hold.
const cars = [
  { id: "SYN-001", make: "Toyota", model: "Yaris", year: 2023, seats: 5, gearbox: "automatic", fuel: "hybrid", area: "athens", dayRate: 34, owner: "Maria K.", rating: 4.9 },
  { id: "SYN-002", make: "Fiat", model: "Panda", year: 2022, seats: 4, gearbox: "manual", fuel: "petrol", area: "athens", dayRate: 24, owner: "Giorgos P.", rating: 4.7 },
  { id: "SYN-003", make: "Volkswagen", model: "T-Roc", year: 2024, seats: 5, gearbox: "automatic", fuel: "petrol", area: "athens", dayRate: 52, owner: "Eleni D.", rating: 5.0 },
  { id: "SYN-004", make: "Suzuki", model: "Jimny", year: 2023, seats: 4, gearbox: "manual", fuel: "petrol", area: "crete", dayRate: 58, owner: "Manolis S.", rating: 4.8 },
  { id: "SYN-005", make: "Hyundai", model: "i10", year: 2022, seats: 4, gearbox: "automatic", fuel: "petrol", area: "crete", dayRate: 27, owner: "Anna V.", rating: 4.6 },
  { id: "SYN-006", make: "Tesla", model: "Model 3", year: 2024, seats: 5, gearbox: "automatic", fuel: "electric", area: "athens", dayRate: 79, owner: "Nikos T.", rating: 4.9 },
  { id: "SYN-007", make: "Peugeot", model: "208", year: 2023, seats: 5, gearbox: "automatic", fuel: "petrol", area: "thessaloniki", dayRate: 31, owner: "Katerina M.", rating: 4.8 },
];
const bookings = []; // {ref, carId, from, to, user, status}

const days = (from, to) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000));
const busy = (carId, from, to) => bookings.some(b => b.carId === carId && b.status !== "cancelled" && !(to <= b.from || from >= b.to));
const quoteFor = (c, from, to) => {
  const n = days(from, to);
  const base = c.dayRate * n;
  const discount = n >= 7 ? 0.15 : n >= 3 ? 0.05 : 0;
  const delivery = 10;
  const insurance = 6 * n;
  const total = Math.round(base * (1 - discount) + delivery + insurance);
  return { days: n, dayRate: c.dayRate, base, discountPct: discount * 100, delivery, insurance, total, deposit: 150, currency: "EUR" };
};

export default defineAgentConfig({
  site: "Sync (mock)",
  description: "Peer-to-peer car rental in Greece. Search by area and dates, get an all-in quote, book. The car comes to you.",
  baseUrl: "http://localhost:4004",
  tools: {
    search_catalog: {
      description: "Cars available in an area for a date range, with optional filters.",
      input: s.object({
        area: s.enum(["athens", "thessaloniki", "crete"]),
        from: s.string().describe("YYYY-MM-DD"),
        to: s.string().describe("YYYY-MM-DD"),
        gearbox: s.enum(["automatic", "manual"]).optional(),
        minSeats: s.integer().optional(),
        maxDayRate: s.number().optional(),
      }),
      readOnly: true,
      handler: ({ area, from, to, gearbox, minSeats, maxDayRate }) => {
        const hits = cars.filter(c => c.area === area && !busy(c.id, from, to)
          && (!gearbox || c.gearbox === gearbox) && (!minSeats || c.seats >= minSeats) && (maxDayRate === undefined || c.dayRate <= maxDayRate));
        return { count: hits.length, cars: hits.map(c => ({ id: c.id, car: `${c.make} ${c.model} ${c.year}`, gearbox: c.gearbox, fuel: c.fuel, seats: c.seats, dayRate: c.dayRate, ownerRating: c.rating })) };
      },
    },
    get_quote: {
      description: "All-in price for one car over a date range, including delivery, insurance and deposit.",
      input: s.object({ carId: s.string(), from: s.string(), to: s.string() }),
      readOnly: true,
      handler: ({ carId, from, to }) => {
        const c = cars.find(x => x.id === carId);
        if (!c) return { error: "not found" };
        if (busy(carId, from, to)) return { error: "not available for those dates" };
        return { carId, car: `${c.make} ${c.model}`, from, to, ...quoteFor(c, from, to) };
      },
    },
    create_booking: {
      description: "Book a car for a date range, delivered to an address. Charges the deposit.",
      input: s.object({ carId: s.string(), from: s.string(), to: s.string(), deliveryAddress: s.string() }),
      auth: "session",
      confirm: true,
      handler: ({ carId, from, to, deliveryAddress }, ctx) => {
        const c = cars.find(x => x.id === carId);
        if (!c) return { error: "not found" };
        if (busy(carId, from, to)) return { error: "not available for those dates" };
        const ref = "SYNC-" + String(24000 + bookings.length).padStart(5, "0");
        const q = quoteFor(c, from, to);
        bookings.push({ ref, carId, from, to, user: ctx.session.user, status: "confirmed", deliveryAddress });
        return { ok: true, ref, car: `${c.make} ${c.model}`, owner: c.owner, from, to, deliveryAddress, total: q.total, depositCharged: q.deposit, freeCancellationUntil: from };
      },
    },
    get_booking: {
      description: "Status of one booking by reference.",
      input: s.object({ ref: s.string() }),
      auth: "session",
      readOnly: true,
      handler: ({ ref }, ctx) => bookings.find(b => b.ref === ref && b.user === ctx.session.user) || { error: "not found" },
    },
    cancel_booking: {
      description: "Cancel a booking. Free before the pickup date.",
      input: s.object({ ref: s.string() }),
      auth: "session",
      confirm: true,
      handler: ({ ref }, ctx) => {
        const b = bookings.find(b => b.ref === ref && b.user === ctx.session.user);
        if (!b) return { error: "not found" };
        b.status = "cancelled";
        return { ok: true, ref, depositRefunded: 150 };
      },
    },
  },
});
