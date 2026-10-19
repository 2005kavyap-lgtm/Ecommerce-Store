/**
 * CodeAlpha E-Commerce Store - Core Application Logic
 * Handles Authentication, Cart State, Product Catalog, Modals & Toast Notifications
 */

// ==========================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================
const Store = {
  user: null,
  token: localStorage.getItem('ca_auth_token') || null,
  cart: JSON.parse(localStorage.getItem('ca_cart') || '[]'),
  products: [],
  categories: [],
  activeCategory: 'all',
  activeSort: 'default',
  searchQuery: '',
  promoCode: localStorage.getItem('ca_promo_code') || '',
  discountPercent: 0
};

// ==========================================
// 2. TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✔',
    error: '✖',
    warning: '⚠',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-weight: bold; font-size: 1.1rem;">${icons[type] || '✔'}</span>
    <div style="flex: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 3. AUTHENTICATION LOGIC
// ==========================================
async function checkAuthStatus() {
  if (!Store.token) {
    updateAuthUI();
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${Store.token}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      Store.user = data.user;
      // Sync local cart with DB cart
      if (Store.cart.length > 0) {
        await syncCartWithServer();
      } else {
        await fetchServerCart();
      }
    } else {
      logout(false);
    }
  } catch (err) {
    console.warn('Auth check error, proceeding in offline/guest mode', err);
  }
  updateAuthUI();
}

function updateAuthUI() {
  const userBtnContainer = document.getElementById('userNavContainer');
  if (!userBtnContainer) return;

  if (Store.user) {
    const initials = Store.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    userBtnContainer.innerHTML = `
      <div class="user-menu-container">
        <button class="user-btn" id="userMenuBtn">
          <div class="user-avatar">${initials}</div>
          <span>${Store.user.name.split(' ')[0]}</span>
          <span style="font-size: 0.7rem;">▼</span>
        </button>
        <div class="user-dropdown" id="userDropdown">
          <div class="dropdown-header">
            <div class="dropdown-user-name">${Store.user.name}</div>
            <div class="dropdown-user-email">${Store.user.email}</div>
          </div>
          <a href="/orders.html" class="dropdown-item">
            <span>📦</span> My Orders & Tracking
          </a>
          <a href="/cart.html" class="dropdown-item">
            <span>🛒</span> View Cart & Checkout
          </a>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" id="logoutBtn" style="color: var(--danger);">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    `;

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => logout(true));
    }
  } else {
    userBtnContainer.innerHTML = `
      <button class="btn btn-outline-primary btn-sm" id="openAuthModalBtn">
        <span>👤</span> Sign In
      </button>
    `;
    const openAuthModalBtn = document.getElementById('openAuthModalBtn');
    if (openAuthModalBtn) {
      openAuthModalBtn.addEventListener('click', () => openAuthModal());
    }
  }
}

function openAuthModal(defaultTab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('active');
  switchAuthTab(defaultTab);
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('loginTabBtn');
  const regTab = document.getElementById('regTabBtn');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');

  if (tab === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    loginTab.classList.remove('active');
    regTab.classList.add('active');
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      Store.token = data.token;
      Store.user = data.user;
      localStorage.setItem('ca_auth_token', data.token);
      showToast(data.message, 'success');
      closeAuthModal();
      updateAuthUI();
      await syncCartWithServer();
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to the server.', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const city = document.getElementById('regCity').value.trim();
  const postal_code = document.getElementById('regPostalCode').value.trim();

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, address, city, postal_code })
    });
    const data = await res.json();

    if (data.success) {
      Store.token = data.token;
      Store.user = data.user;
      localStorage.setItem('ca_auth_token', data.token);
      showToast(data.message, 'success');
      closeAuthModal();
      updateAuthUI();
      await syncCartWithServer();
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to the server.', 'error');
  }
}

function logout(notify = true) {
  Store.user = null;
  Store.token = null;
  localStorage.removeItem('ca_auth_token');
  updateAuthUI();
  if (notify) showToast('You have been signed out.', 'info');
}

function fillDemoAccount(email = 'demo@codealpha.com', pass = 'password123') {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pass;
}

// ==========================================
// 4. CART LOGIC
// ==========================================
function saveCart() {
  localStorage.setItem('ca_cart', JSON.stringify(Store.cart));
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = Store.cart.reduce((sum, item) => sum + item.quantity, 0);

  badges.forEach(b => {
    b.textContent = count;
    b.classList.add('bump');
    setTimeout(() => b.classList.remove('bump'), 250);
  });
}

async function addToCart(product, quantity = 1) {
  const existing = Store.cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    Store.cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      original_price: product.original_price,
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      quantity
    });
  }

  saveCart();
  showToast(`Added "${product.title}" to cart!`, 'success');

  // If user is logged in, sync with server cart
  if (Store.token) {
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Store.token}`
        },
        body: JSON.stringify({ productId: product.id, quantity })
      });
    } catch (e) {
      console.warn('Server cart update error:', e);
    }
  }
}

async function updateCartItemQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  const item = Store.cart.find(i => i.id === productId);
  if (item) {
    item.quantity = quantity;
    saveCart();

    if (Store.token) {
      try {
        await fetch(`/api/cart/${productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Store.token}`
          },
          body: JSON.stringify({ quantity })
        });
      } catch (e) {
        console.warn('Server cart update error:', e);
      }
    }
  }
}

async function removeFromCart(productId) {
  Store.cart = Store.cart.filter(item => item.id !== productId);
  saveCart();
  showToast('Item removed from cart', 'info');

  if (Store.token) {
    try {
      await fetch(`/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Store.token}` }
      });
    } catch (e) {
      console.warn('Server cart delete error:', e);
    }
  }
}

async function clearCart() {
  Store.cart = [];
  saveCart();

  if (Store.token) {
    try {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${Store.token}` }
      });
    } catch (e) {
      console.warn('Server cart clear error:', e);
    }
  }
}

async function syncCartWithServer() {
  if (!Store.token) return;
  try {
    const res = await fetch('/api/cart/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Store.token}`
      },
      body: JSON.stringify({ items: Store.cart })
    });
    const data = await res.json();
    if (data.success && data.cart) {
      // Map server format to client format
      Store.cart = data.cart.map(c => ({
        id: c.product_id,
        title: c.title,
        price: c.price,
        original_price: c.original_price,
        image_url: c.image_url,
        category: c.category,
        stock: c.stock,
        quantity: c.quantity
      }));
      saveCart();
    }
  } catch (err) {
    console.warn('Cart sync error:', err);
  }
}

async function fetchServerCart() {
  if (!Store.token) return;
  try {
    const res = await fetch('/api/cart', {
      headers: { 'Authorization': `Bearer ${Store.token}` }
    });
    const data = await res.json();
    if (data.success && data.cart) {
      Store.cart = data.cart.map(c => ({
        id: c.product_id,
        title: c.title,
        price: c.price,
        original_price: c.original_price,
        image_url: c.image_url,
        category: c.category,
        stock: c.stock,
        quantity: c.quantity
      }));
      saveCart();
    }
  } catch (e) {
    console.warn('Server cart fetch error:', e);
  }
}

// ==========================================
// 5. CART DRAWER RENDERING
// ==========================================
function toggleCartDrawer(open = null) {
  const overlay = document.getElementById('cartDrawerOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (!overlay || !drawer) return;

  const shouldOpen = open !== null ? open : !drawer.classList.contains('active');

  if (shouldOpen) {
    overlay.classList.add('active');
    drawer.classList.add('active');
    renderCartDrawer();
  } else {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cartDrawerItems');
  const subtotalElem = document.getElementById('cartDrawerSubtotal');
  const totalElem = document.getElementById('cartDrawerTotal');
  const checkoutBtn = document.getElementById('cartDrawerCheckoutBtn');
  if (!container) return;

  if (Store.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 0.75rem;">🛒</div>
        <p style="font-weight: 600; font-size: 1.1rem; color: var(--text-main);">Your cart is empty</p>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">Explore our catalog and add items you love!</p>
      </div>
    `;
    if (subtotalElem) subtotalElem.textContent = '$0.00';
    if (totalElem) totalElem.textContent = '$0.00';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    return;
  }

  if (checkoutBtn) checkoutBtn.style.display = 'block';

  let subtotal = 0;
  container.innerHTML = Store.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.image_url}" alt="${item.title}" class="cart-item-img" onerror="this.src='https://placehold.co/100x100?text=Product'">
        <div class="cart-item-info">
          <a href="/product.html?id=${item.id}" class="cart-item-title">${item.title}</a>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})">-</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Remove item">
              🗑 Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (subtotalElem) subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `$${subtotal.toFixed(2)}`;
}

// ==========================================
// 6. PRODUCT CATALOG & FETCHING (FOR INDEX.HTML)
// ==========================================
async function loadProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
      <div style="font-size: 2rem; margin-bottom: 0.75rem;">⚡</div>
      <p style="color: var(--text-muted); font-weight: 500;">Loading product catalog...</p>
    </div>
  `;

  try {
    let url = '/api/products?';
    if (Store.activeCategory && Store.activeCategory !== 'all') {
      url += `category=${encodeURIComponent(Store.activeCategory)}&`;
    }
    if (Store.searchQuery) {
      url += `search=${encodeURIComponent(Store.searchQuery)}&`;
    }
    if (Store.activeSort && Store.activeSort !== 'default') {
      url += `sort=${encodeURIComponent(Store.activeSort)}&`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      Store.products = data.products;
      renderProducts(data.products);
      updateResultsCount(data.count);
    }
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load catalog</div>
        <div class="empty-desc">Check if the Node.js backend server is running.</div>
      </div>
    `;
  }
}

async function loadCategories() {
  const container = document.getElementById('categoryPills');
  if (!container) return;

  try {
    const res = await fetch('/api/products/categories');
    const data = await res.json();

    if (data.success && data.categories) {
      Store.categories = data.categories;
      const totalCount = data.categories.reduce((acc, c) => acc + c.count, 0);

      container.innerHTML = `
        <button class="cat-pill ${Store.activeCategory === 'all' ? 'active' : ''}" data-category="all">
          ✨ All Products (${totalCount})
        </button>
        ${data.categories.map(c => `
          <button class="cat-pill ${Store.activeCategory === c.category.toLowerCase() ? 'active' : ''}" data-category="${c.category}">
            ${getCategoryIcon(c.category)} ${c.category} (${c.count})
          </button>
        `).join('')}
      `;

      container.querySelectorAll('.cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Store.activeCategory = btn.dataset.category;
          loadProducts();
        });
      });
    }
  } catch (err) {
    console.warn('Categories load error:', err);
  }
}

function getCategoryIcon(cat) {
  const map = {
    'Electronics': '🎧',
    'Accessories': '⌨️',
    'Fashion': '🕶️',
    'Home & Living': '☕'
  };
  return map[cat] || '📦';
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No products found</div>
        <div class="empty-desc">We couldn't find any products matching your search or filter.</div>
        <button class="btn btn-secondary" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => {
    const discount = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
    const badgeHtml = p.badge ? `<span class="card-badge ${p.badge.toLowerCase().includes('hot') ? 'badge-hot' : 'badge-best'}">${p.badge}</span>` : '';

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="card-img-wrapper">
          ${badgeHtml}
          <img src="${p.image_url}" alt="${p.title}" loading="lazy" onerror="this.src='https://placehold.co/600x450?text=Product+Image'">
          <button class="quick-view-btn" onclick="openQuickView(${p.id})">👁 Quick View</button>
        </div>
        <div class="card-body">
          <div class="card-category">${p.category}</div>
          <a href="/product.html?id=${p.id}" class="card-title" title="${p.title}">${p.title}</a>
          <div class="card-rating">
            <span class="stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</span>
            <span>${p.rating} (${p.reviews_count})</span>
          </div>
          <div class="card-price-row">
            <span class="current-price">$${p.price.toFixed(2)}</span>
            ${p.original_price ? `<span class="original-price">$${p.original_price.toFixed(2)}</span>` : ''}
            ${discount > 0 ? `<span class="discount-tag">-${discount}%</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn btn-primary btn-block" onclick="handleCardAddToCart(${p.id})">
              <span>🛒</span> Add to Cart
            </button>
            <a href="/product.html?id=${p.id}" class="btn btn-secondary" title="View details">
              Details
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleCardAddToCart(productId) {
  const product = Store.products.find(p => p.id === productId);
  if (product) {
    addToCart(product, 1);
  }
}

function updateResultsCount(count) {
  const elem = document.getElementById('resultsCount');
  if (elem) {
    elem.textContent = `Showing ${count} product${count === 1 ? '' : 's'}`;
  }
}

function resetFilters() {
  Store.activeCategory = 'all';
  Store.searchQuery = '';
  Store.activeSort = 'default';

  const searchInput = document.getElementById('navSearchInput');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'default';

  loadCategories();
  loadProducts();
}

// Quick View Modal
function openQuickView(productId) {
  const product = Store.products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickViewModal');
  const body = document.getElementById('quickViewModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem;">
      <div>
        <img src="${product.image_url}" alt="${product.title}" style="width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color); object-fit: cover;" onerror="this.src='https://placehold.co/500x500?text=Product'">
      </div>
      <div>
        <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--primary); font-weight: 700;">${product.category}</span>
        <h3 style="font-size: 1.35rem; margin: 0.35rem 0 0.5rem; font-weight: 700;">${product.title}</h3>
        <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 1rem;">
          <span style="font-size: 1.75rem; font-weight: 800;">$${product.price.toFixed(2)}</span>
          ${product.original_price ? `<span style="font-size: 1rem; color: var(--text-light); text-decoration: line-through;">$${product.original_price.toFixed(2)}</span>` : ''}
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.25rem;">${product.description}</p>
        <div style="font-size: 0.85rem; color: var(--success); font-weight: 600; margin-bottom: 1.25rem;">
          ✔ In Stock (${product.stock} units available)
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="handleCardAddToCart(${product.id}); closeQuickView();" style="flex: 1;">
            🛒 Add to Cart
          </button>
          <a href="/product.html?id=${product.id}" class="btn btn-secondary">
            Full Details Page →
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  if (modal) modal.classList.remove('active');
}

// ==========================================
// 7. INITIALIZATION ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Check user login status and render navbar
  checkAuthStatus();
  updateCartBadge();

  // Search input binding (Header)
  const searchForm = document.getElementById('navSearchForm');
  const searchInput = document.getElementById('navSearchInput');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Store.searchQuery = searchInput.value.trim();
      loadProducts();
    });

    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        Store.searchQuery = searchInput.value.trim();
        loadProducts();
      }, 300);
    });
  }

  // Cart button in header
  const openCartBtn = document.getElementById('openCartDrawerBtn');
  if (openCartBtn) {
    openCartBtn.addEventListener('click', () => toggleCartDrawer(true));
  }

  const closeCartBtn = document.getElementById('closeCartDrawerBtn');
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => toggleCartDrawer(false));
  }

  const cartOverlay = document.getElementById('cartDrawerOverlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', () => toggleCartDrawer(false));
  }

  // Auth Modal bindings
  const authModalOverlay = document.getElementById('authModal');
  const closeAuthBtn = document.getElementById('closeAuthModalBtn');
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', closeAuthModal);
  }
  if (authModalOverlay) {
    authModalOverlay.addEventListener('click', (e) => {
      if (e.target === authModalOverlay) closeAuthModal();
    });
  }

  const loginTabBtn = document.getElementById('loginTabBtn');
  const regTabBtn = document.getElementById('regTabBtn');
  if (loginTabBtn) loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
  if (regTabBtn) regTabBtn.addEventListener('click', () => switchAuthTab('register'));

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const regForm = document.getElementById('registerForm');
  if (regForm) regForm.addEventListener('submit', handleRegister);

  // Quick view close
  const closeQuickViewBtn = document.getElementById('closeQuickViewBtn');
  const quickViewModal = document.getElementById('quickViewModal');
  if (closeQuickViewBtn) closeQuickViewBtn.addEventListener('click', closeQuickView);
  if (quickViewModal) {
    quickViewModal.addEventListener('click', (e) => {
      if (e.target === quickViewModal) closeQuickView();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      Store.activeSort = sortSelect.value;
      loadProducts();
    });
  }

  // Load products & categories if on index page
  if (document.getElementById('productGrid')) {
    loadCategories();
    loadProducts();
  }
});
