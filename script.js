"use strict";

const tg = window.Telegram?.WebApp;

function initUser() {
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    
    // Устанавливаем имя
    const nameElement = document.getElementById("user-name");
    nameElement.textContent = (user.first_name + " " + (user.last_name || "")).toUpperCase();

    // Устанавливаем аватарку
    if (user.photo_url) {
      const photoEl = document.getElementById("user-photo");
      photoEl.src = user.photo_url;
      photoEl.style.display = "block";
    }
  }
}

// Улучшенные уведомления (стековые)
function showToast(message) {
  const container = document.getElementById("toast");
  const toast = document.createElement("div");
  toast.className = "toast-item";
  toast.textContent = message;

  container.appendChild(toast);

  // Вибрация при уведомлении
  tg?.HapticFeedback?.notificationOccurred("success");

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Обработка покупки с тактильной отдачей
function handleBuy(btn) {
  const name = btn.dataset.name;
  
  // Легкая вибрация при нажатии
  tg?.HapticFeedback?.impactOccurred("medium");

  btn.innerHTML = "CHECKING OUT...";
  btn.style.opacity = "0.7";

  setTimeout(() => {
    if (tg?.sendData) {
      tg.sendData(JSON.stringify({ order: name }));
    } else {
      showToast(`ADD TO CART: ${name}`);
      btn.innerHTML = "КУПИТЬ →";
      btn.style.opacity = "1";
    }
  }, 600);
}

// Рендер (с небольшим дополнением оформления)
function renderProducts(products) {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = ""; // Очистка скелетона

  products.forEach(p => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-emoji">${p.emoji}</div>
      <h2 class="product-name">${p.name}</h2>
      <p class="product-desc">${p.description}</p>
      <div class="product-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
        <span class="product-price">${p.price} ₽</span>
        <button class="btn-buy" data-name="${p.name}">КУПИТЬ</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Старт
document.addEventListener("DOMContentLoaded", () => {
  tg?.ready();
  tg?.expand();
  initUser();
  
  const data = JSON.parse(document.getElementById("products-data").textContent);
  renderProducts(data);

  document.getElementById("product-grid").addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-buy")) handleBuy(e.target);
  });
});
