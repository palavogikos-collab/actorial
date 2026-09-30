// Mock catalogue modelled on what plaisio.gr sells. Prices are illustrative.
export const products = [
  { sku: "4212345", name: "LG 27MP450-B 27\" IPS FHD 75Hz", category: "monitors", brand: "LG", price: 149.90, size: 27, panel: "IPS", hz: 75, res: "1920x1080", stock: { web: 14, syntagma: 2, marousi: 0 } },
  { sku: "4212346", name: "Samsung Odyssey G5 27\" VA QHD 165Hz", category: "monitors", brand: "Samsung", price: 239.00, size: 27, panel: "VA", hz: 165, res: "2560x1440", stock: { web: 6, syntagma: 1, marousi: 3 } },
  { sku: "4212347", name: "Dell S2721DGF 27\" IPS QHD 165Hz", category: "monitors", brand: "Dell", price: 329.00, size: 27, panel: "IPS", hz: 165, res: "2560x1440", stock: { web: 3, syntagma: 0, marousi: 1 } },
  { sku: "4212348", name: "AOC 27B2H 27\" IPS FHD 75Hz", category: "monitors", brand: "AOC", price: 119.00, size: 27, panel: "IPS", hz: 75, res: "1920x1080", stock: { web: 22, syntagma: 4, marousi: 5 } },
  { sku: "4212349", name: "Philips 275E1S 27\" IPS QHD 75Hz", category: "monitors", brand: "Philips", price: 199.00, size: 27, panel: "IPS", hz: 75, res: "2560x1440", stock: { web: 9, syntagma: 0, marousi: 2 } },
  { sku: "4212350", name: "MSI G2422 24\" IPS FHD 170Hz", category: "monitors", brand: "MSI", price: 139.00, size: 24, panel: "IPS", hz: 170, res: "1920x1080", stock: { web: 11, syntagma: 3, marousi: 0 } },
  { sku: "4212351", name: "LG 32UN550 32\" VA 4K 60Hz", category: "monitors", brand: "LG", price: 289.00, size: 32, panel: "VA", hz: 60, res: "3840x2160", stock: { web: 4, syntagma: 0, marousi: 0 } },
  { sku: "4300001", name: "Logitech MX Master 3S", category: "mice", brand: "Logitech", price: 99.90, stock: { web: 40, syntagma: 8, marousi: 6 } },
  { sku: "4300002", name: "Keychron K2 V2 Wireless", category: "keyboards", brand: "Keychron", price: 109.00, stock: { web: 7, syntagma: 1, marousi: 0 } },
  { sku: "4400001", name: "Apple MacBook Air 13\" M4 16GB/256GB", category: "laptops", brand: "Apple", price: 1249.00, stock: { web: 5, syntagma: 2, marousi: 2 } },
];

export const carts = new Map(); // user -> [{sku, qty}]
