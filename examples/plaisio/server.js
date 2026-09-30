import { createServer } from "actorial";
import config from "./agent.config.js";
import { products } from "./data.js";

// A deliberately "normal" e-commerce page: nav, banners, cookie wall, product grid.
// This is what an agent has to chew through today. The tools above bypass it.
function renderPage(url) {
  const q = url.searchParams.get("q") || "";
  const hits = q ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())) : products;
  const nav = ["Υπολογιστές", "Laptops", "Οθόνες", "Περιφερειακά", "Κινητά", "Gaming", "Smart Home", "Προσφορές", "Business", "Εξυπηρέτηση"]
    .map(n => `<li class="nav-item"><a href="/c/${encodeURIComponent(n)}" data-track="nav-${n}"><span class="nav-label">${n}</span></a></li>`).join("");
  const cards = hits.map(p => `
    <div class="product-card" data-sku="${p.sku}" data-price="${p.price}" data-gtm='{"item_id":"${p.sku}","item_name":"${p.name}","price":${p.price},"item_brand":"${p.brand}","item_category":"${p.category}"}'>
      <div class="product-card__image"><a href="/p/${p.sku}"><img src="/img/${p.sku}_400.webp" srcset="/img/${p.sku}_200.webp 200w, /img/${p.sku}_400.webp 400w, /img/${p.sku}_800.webp 800w" alt="${p.name}" loading="lazy"></a></div>
      <div class="product-card__badges"><span class="badge badge--new">ΝΕΟ</span><span class="badge badge--delivery">Παράδοση 1-3 ημέρες</span></div>
      <h3 class="product-card__title"><a href="/p/${p.sku}">${p.name}</a></h3>
      <div class="product-card__rating"><span class="stars" aria-label="4.3 από 5">★★★★☆</span><span class="rating-count">(127)</span></div>
      <div class="product-card__price"><span class="price price--current">${p.price.toFixed(2).replace(".", ",")} €</span><span class="price price--old">${(p.price * 1.15).toFixed(2).replace(".", ",")} €</span><span class="price-discount">-13%</span></div>
      <div class="product-card__installments">ή 12 δόσεις των ${(p.price / 12).toFixed(2).replace(".", ",")} €</div>
      <div class="product-card__stock ${p.stock.web > 0 ? "in-stock" : "out-of-stock"}">${p.stock.web > 0 ? "Άμεσα διαθέσιμο" : "Εξαντλήθηκε"}</div>
      <div class="product-card__actions"><button class="btn btn--primary btn--add-to-cart" data-sku="${p.sku}" onclick="update_cart('${p.sku}')">Προσθήκη στο καλάθι</button><button class="btn btn--icon btn--wishlist" aria-label="Wishlist">♡</button><button class="btn btn--icon btn--compare" aria-label="Σύγκριση">⇄</button></div>
    </div>`).join("");
  return `<!doctype html><html lang="el"><head><meta charset="utf-8"><title>Plaisio (mock) - Οθόνες</title>
<meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/css/main.min.css"><link rel="stylesheet" href="/css/theme.min.css">
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-XXXXXXX');</script>
<script src="/js/vendor.bundle.js" defer></script><script src="/js/app.bundle.js" defer></script><script src="/actorial.js" defer></script>
</head><body class="page page--category">
<div id="cookie-consent" class="modal modal--open"><div class="modal__body"><h2>Χρησιμοποιούμε cookies</h2><p>Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας, να αναλύσουμε την επισκεψιμότητα και για διαφημιστικούς σκοπούς. Μπορείτε να διαχειριστείτε τις προτιμήσεις σας ανά πάσα στιγμή.</p><button class="btn btn--primary" onclick="acceptAll()">Αποδοχή όλων</button><button class="btn" onclick="openPrefs()">Ρυθμίσεις</button><button class="btn btn--link" onclick="rejectAll()">Απόρριψη</button></div></div>
<header class="header"><div class="header__top"><a href="/stores">Καταστήματα</a> · <a href="/business">Plaisio Business</a> · <a href="/support">Εξυπηρέτηση 2102895000</a></div>
<div class="header__main"><a class="logo" href="/"><img src="/img/logo.svg" alt="Plaisio"></a>
<form class="search" action="/search" method="get"><input type="search" name="q" placeholder="Αναζήτηση σε 60.000+ προϊόντα..." value="${q}"><button type="submit">Αναζήτηση</button></form>
<div class="header__actions"><a href="/account">Ο λογαριασμός μου</a><a href="/cart" class="cart-link">Καλάθι <span class="cart-count">0</span></a></div></div>
<nav class="nav"><ul class="nav-list">${nav}</ul></nav></header>
<div class="banner banner--hero"><img src="/img/hero_autumn_2026.webp" alt="Back to school offers"><div class="banner__text"><h2>Φθινοπωρινές προσφορές έως -40%</h2><a class="btn" href="/offers">Δείτε τις προσφορές</a></div></div>
<main class="main"><aside class="filters"><h3>Φίλτρα</h3>
<fieldset><legend>Τιμή</legend><label><input type="checkbox" name="price" value="0-100"> έως 100 €</label><label><input type="checkbox" name="price" value="100-200"> 100 - 200 €</label><label><input type="checkbox" name="price" value="200-300"> 200 - 300 €</label><label><input type="checkbox" name="price" value="300-"> άνω των 300 €</label></fieldset>
<fieldset><legend>Μέγεθος</legend><label><input type="checkbox" name="size" value="24"> 24"</label><label><input type="checkbox" name="size" value="27"> 27"</label><label><input type="checkbox" name="size" value="32"> 32"</label></fieldset>
<fieldset><legend>Panel</legend><label><input type="checkbox" name="panel" value="IPS"> IPS</label><label><input type="checkbox" name="panel" value="VA"> VA</label><label><input type="checkbox" name="panel" value="TN"> TN</label></fieldset>
<fieldset><legend>Κατασκευαστής</legend>${["LG", "Samsung", "Dell", "AOC", "Philips", "MSI", "Asus", "Acer", "BenQ", "HP"].map(b => `<label><input type="checkbox" name="brand" value="${b}"> ${b}</label>`).join("")}</fieldset></aside>
<section class="listing"><div class="listing__toolbar"><span>${hits.length} προϊόντα</span><select name="sort"><option>Δημοφιλή</option><option>Τιμή αύξουσα</option><option>Τιμή φθίνουσα</option><option>Νεότερα</option></select></div>
<div class="product-grid">${cards}</div>
<nav class="pagination"><a class="active">1</a><a href="?page=2">2</a><a href="?page=3">3</a><a href="?page=2">Επόμενη ›</a></nav></section></main>
<section class="recently-viewed"><h3>Είδατε πρόσφατα</h3><div class="carousel">${products.slice(0, 4).map(p => `<div class="carousel__item"><img src="/img/${p.sku}_200.webp" alt=""><span>${p.name}</span></div>`).join("")}</div></section>
<footer class="footer"><div class="footer__cols">${["Εταιρεία", "Εξυπηρέτηση", "Αγορές", "Ακολουθήστε μας"].map(c => `<div class="footer__col"><h4>${c}</h4><ul>${["Σχετικά", "Όροι χρήσης", "Πολιτική απορρήτου", "Τρόποι πληρωμής", "Αποστολές", "Επιστροφές", "Καριέρα", "Επικοινωνία"].map(l => `<li><a href="/${l}">${l}</a></li>`).join("")}</ul></div>`).join("")}</div>
<div class="footer__legal">© 2026 Plaisio Computers ΑΕΒΕ (mock). ΑΦΜ 000000000. Όλα τα δικαιώματα διατηρούνται.</div></footer>
<div id="chat-widget" class="chat-widget"><button>Χρειάζεστε βοήθεια;</button></div>
<script>function update_cart(sku){fetch('/api/update_cart',{method:'POST',headers:{'content-type':'application/json','x-actorial-confirmed':'1'},credentials:'include',body:JSON.stringify({sku:sku})}).then(r=>r.json()).then(console.log)}</script>
</body></html>`;
}

createServer(config, { renderPage }).listen(4001, () => console.log("plaisio mock on http://localhost:4001"));
