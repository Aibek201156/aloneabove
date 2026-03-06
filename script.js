/**
 * AloneAbove — Mini App Script
 * Инициализация Telegram WebApp, рендер товаров, отправка заказов.
 */

"use strict";

// ── 1. Telegram WebApp Init ──────────────────────────────────────────────────

const tg = window.Telegram?.WebApp;

if (!tg) {
  // Запуск вне Telegram — показываем предупреждение, но не ломаем страницу
  console.warn("Telegram WebApp SDK недоступен. Открой страницу через Telegram.");
}

// Сообщаем Telegram, что приложение готово
tg?.ready();

// Разворачиваем на весь экран
tg?.expand();

// ── 2. Тема ─────────────────────────────────────────────────────────────────

function applyTheme() {
  const colorScheme = tg?.colorScheme ?? "light";
  if (colorScheme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}

applyTheme();

// Слушаем смену темы внутри Telegram
tg?.onEvent("themeChanged", applyTheme);

// ── 3. Загрузка товаров ──────────────────────────────────────────────────────

/**
 * Читает товары из тега <script id="products-data" type="application/json">.
 * @returns {Array<Object>}
 */
function loadProducts() {
  try {
    const el = document.getElementById("products-data");
    if (!el) throw new Error("Элемент #products-data не найден.");
    return JSON.parse(el.textContent.trim());
  } catch (err) {
    console.error("Ошибка загрузки товаров:", err);
    return [];
  }
}

// ── 4. Рендер карточек ───────────────────────────────────────────────────────

const CURRENCY = "₽";

/**
 * Форматирует число как цену: 4990 → "4 990 ₽"
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  return price.toLocaleString("ru-RU") + "\u00A0" + CURRENCY;
}

/**
 * Экранирует HTML-сущности для вставки в innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Создаёт DOM-элемент карточки товара.
 * @param {Object} product
 * @returns {HTMLElement}
 */
function createCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.setAttribute("data-id", product.id);

  card.innerHTML = `
    <h2 class="product-name">${escapeHtml(product.name)}</h2>
    <span class="product-emoji" aria-hidden="true">${escapeHtml(product.emoji ?? "🖤")}</span>
    <p class="product-desc">${escapeHtml(product.description)}</p>
    <div class="product-footer">
      <span class="product-price">${formatPrice(product.price)}</span>
      <button
        class="btn-buy"
        data-id="${escapeHtml(String(product.id))}"
        data-name="${escapeHtml(product.name)}"
        data-price="${escapeHtml(String(product.price))}"
        aria-label="Купить ${escapeHtml(product.name)}"
      >
        Купить →
      </button>
    </div>
  `;

  return card;
}

/**
 * Рендерит все карточки в #product-grid.
 * @param {Array<Object>} products
 */
function renderProducts(products) {
  const grid = document.getElementById("product-grid");
  const counter = document.getElementById("item-count");
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '<p class="empty-state">Товары временно недоступны</p>';
    if (counter) counter.textContent = "0 позиций";
    return;
  }

  const fragment = document.createDocumentFragment();
  products.forEach((p) => fragment.appendChild(createCard(p)));
  grid.appendChild(fragment);

  if (counter) {
    counter.textContent = `${products.length} позиц${products.length === 1 ? "ия" : products.length < 5 ? "ии" : "ий"}`;
  }
}

// ── 5. Покупка ───────────────────────────────────────────────────────────────

/** Набор ID товаров, для которых уже нажали кнопку (анти-дабл-клик). */
const pendingOrders = new Set();

/**
 * Отправляет заказ в бот через tg.sendData() и показывает toast-уведомление.
 * @param {HTMLButtonElement} btn
 */
function handleBuy(btn) {
  const productId   = Number(btn.dataset.id);
  const productName = btn.dataset.name;
  const price       = Number(btn.dataset.price);

  if (pendingOrders.has(productId)) return;
  pendingOrders.add(productId);

  btn.disabled = true;
  btn.textContent = "...";

  const orderPayload = JSON.stringify({
    product_id:   productId,
    product_name: productName,
    price:        price,
  });

  if (tg?.sendData) {
    // Отправляем данные боту и закрываем WebApp
    tg.sendData(orderPayload);
  } else {
    // Режим разработки — эмулируем поведение
    console.log("sendData (dev mode):", orderPayload);
    showToast("Заказ оформлен!");
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Купить →";
      pendingOrders.delete(productId);
    }, 2000);
  }
}

/**
 * Делегированный обработчик кликов по кнопкам «Купить».
 * @param {MouseEvent} event
 */
function onGridClick(event) {
  const btn = event.target.closest(".btn-buy");
  if (!btn) return;
  handleBuy(btn);
}

// ── 6. Toast ─────────────────────────────────────────────────────────────────

let toastTimer = null;

/**
 * Показывает всплывающее уведомление.
 * @param {string} message
 * @param {number} [duration=2500]
 */
function showToast(message, duration = 2500) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

// ── 7. Инициализация ─────────────────────────────────────────────────────────

function init() {
  const products = loadProducts();
  renderProducts(products);

  const grid = document.getElementById("product-grid");
  grid?.addEventListener("click", onGridClick);
}

// Запуск после загрузки DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
