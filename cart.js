/* ============================================================
   MW WEAR — Cart logic + WhatsApp handoff
   ============================================================ */

/* رقم واتساب صاحب المتجر — غيّره هنا لو الرقم اتغير (كود مصر 20 + الرقم من غير الصفر) */
const OWNER_WHATSAPP = "201021611067";

const CART_KEY = "mw_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function cartLineKey(id, size, color) {
  return `${id}__${size}__${color}`;
}

function addToCart(id, size, color, qty) {
  const cart = getCart();
  const key = cartLineKey(id, size, color);
  const existing = cart.find(l => cartLineKey(l.id, l.size, l.color) === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: Number(id), size, color, qty });
  }
  saveCart(cart);
}

function removeCartLine(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, qty);
  saveCart(cart);
}

function cartCount() {
  return getCart().reduce((sum, l) => sum + l.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, l) => {
    const p = getProductById(l.id);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

function updateCartBadge() {
  document.querySelectorAll("[data-cart-badge]").forEach(el => {
    const n = cartCount();
    el.textContent = n;
    el.style.display = n > 0 ? "flex" : "none";
  });
}

function buildWhatsAppMessage(customer) {
  const cart = getCart();
  let msg = `👋 طلب جديد من موقع MW WEAR\n\n`;
  msg += `👤 الاسم: ${customer.name}\n`;
  msg += `📱 رقم التواصل: ${customer.phone}\n`;
  msg += `📍 العنوان: ${customer.address}\n`;
  if (customer.notes) msg += `📝 ملاحظات: ${customer.notes}\n`;
  msg += `\n🧾 تفاصيل الطلب:\n`;
  cart.forEach(l => {
    const p = getProductById(l.id);
    if (!p) return;
    msg += `- ${p.name} | مقاس: ${l.size} | لون: ${l.color} | الكمية: ${l.qty} | ${formatPrice(p.price * l.qty)}\n`;
  });
  msg += `\n💰 الإجمالي: ${formatPrice(cartTotal())}\n`;
  msg += `\nمنتظر تأكيدكم لطريقة الدفع والشحن`;
  return msg;
}

function sendOrderToWhatsApp(customer) {
  const message = buildWhatsAppMessage(customer);
  const url = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function showToast(text) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------- المفضلة ---------- */

const WISHLIST_KEY = "mw_wishlist";

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistBadge();
}

function isWishlisted(id) {
  return getWishlist().includes(Number(id));
}

function toggleWishlist(id) {
  id = Number(id);
  let list = getWishlist();
  if (list.includes(id)) {
    list = list.filter(x => x !== id);
  } else {
    list.push(id);
  }
  saveWishlist(list);
  return list.includes(id);
}

function wishlistCount() {
  return getWishlist().length;
}

function updateWishlistBadge() {
  document.querySelectorAll("[data-wishlist-badge]").forEach(el => {
    const n = wishlistCount();
    el.textContent = n;
    el.style.display = n > 0 ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartBadge();
    updateWishlistBadge();

    const menuToggle = document.getElementById("menuToggle");
    const nav = document.getElementById("mainNav");
    const backdrop = document.getElementById("navBackdrop");

    if (menuToggle && nav && backdrop) {
        const closeNav = () => {
            nav.classList.remove("open");
            backdrop.classList.remove("show");
        };
        menuToggle.addEventListener("click", () => {
            nav.classList.toggle("open");
            backdrop.classList.toggle("show");
        });
        backdrop.addEventListener("click", closeNav);
        nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeNav));
    }
});
