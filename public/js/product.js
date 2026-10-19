/**
 * Product Details Page Logic
 * Handles single product retrieval, gallery thumbnail switcher, specifications table, and related products
 */

let currentProduct = null;
let currentQuantity = 1;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = '/index.html';
    return;
  }

  fetchProductDetails(productId);
});

async function fetchProductDetails(id) {
  const container = document.getElementById('productDetailContent');
  if (!container) return;

  try {
    const res = await fetch(`/api/products/${id}`);
    const data = await res.json();

    if (!data.success || !data.product) {
      container.innerHTML = `
        <div class="empty-state" style="margin: 3rem 0;">
          <div class="empty-icon">🔍</div>
          <h2 class="empty-title">Product Not Found</h2>
          <p class="empty-desc">The item you are looking for may have been removed or is temporarily unavailable.</p>
          <a href="/index.html" class="btn btn-primary">Back to Catalog</a>
        </div>
      `;
      return;
    }

    currentProduct = data.product;
    renderProductView(data.product);
    renderRelatedProducts(data.related || []);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h2 class="empty-title">Error Loading Product</h2>
        <p class="empty-desc">Unable to reach the server. Please check your connection.</p>
      </div>
    `;
  }
}

function renderProductView(p) {
  // Update document title
  document.title = `${p.title} - CodeAlpha Store`;

  // Breadcrumbs
  const breadcrumbCategory = document.getElementById('breadcrumbCategory');
  const breadcrumbTitle = document.getElementById('breadcrumbTitle');
  if (breadcrumbCategory) {
    breadcrumbCategory.textContent = p.category;
    breadcrumbCategory.href = `/index.html?category=${encodeURIComponent(p.category)}`;
  }
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = p.title;
  }

  const galleryImages = p.gallery && p.gallery.length ? p.gallery : [p.image_url];
  const discount = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;

  // Build specs rows
  let specsHtml = '';
  if (p.details && Object.keys(p.details).length > 0) {
    specsHtml = Object.entries(p.details).map(([key, val]) => `
      <tr>
        <td class="spec-key">${key}</td>
        <td class="spec-val">${val}</td>
      </tr>
    `).join('');
  }

  const container = document.getElementById('productDetailContent');
  container.innerHTML = `
    <div class="product-detail-wrapper">
      <!-- Gallery Column -->
      <div class="product-gallery">
        <div class="main-image-container">
          <img id="mainProductImg" src="${galleryImages[0]}" alt="${p.title}" onerror="this.src='https://placehold.co/600x600?text=Product'">
        </div>
        ${galleryImages.length > 1 ? `
          <div class="thumbnail-row">
            ${galleryImages.map((img, idx) => `
              <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
                <img src="${img}" alt="Thumbnail ${idx + 1}">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Info Column -->
      <div class="product-info-panel">
        ${p.badge ? `<span class="product-detail-badge">${p.badge}</span>` : ''}
        <h1 class="product-detail-title">${p.title}</h1>

        <div class="product-detail-meta">
          <span class="rating-stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</span>
          <span><strong>${p.rating}</strong> (${p.reviews_count} verified reviews)</span>
          <span>•</span>
          <span>Category: <strong style="color: var(--primary);">${p.category}</strong></span>
        </div>

        <div class="product-detail-price">
          <span class="price-main">$${p.price.toFixed(2)}</span>
          ${p.original_price ? `<span class="price-strike">$${p.original_price.toFixed(2)}</span>` : ''}
          ${discount > 0 ? `<span class="price-save">Save ${discount}%</span>` : ''}
        </div>

        <p class="product-detail-desc">${p.description}</p>

        <!-- Buy Box -->
        <div class="buy-box">
          <div class="stock-status-row">
            <span class="stock-dot"></span>
            <span style="color: var(--success);">In Stock (${p.stock} units available)</span>
          </div>

          <div class="quantity-picker-row">
            <span style="font-weight: 600; font-size: 0.9rem;">Quantity:</span>
            <div class="qty-control" style="transform: scale(1.15);">
              <button class="qty-btn" onclick="adjustQuantity(-1)">-</button>
              <span class="qty-display" id="productQtyDisplay">1</span>
              <button class="qty-btn" onclick="adjustQuantity(1)">+</button>
            </div>
          </div>

          <div class="action-buttons-row">
            <button class="btn btn-primary btn-lg" onclick="handleAddToCartClick()">
              <span>🛒</span> Add to Cart
            </button>
            <button class="btn btn-secondary btn-lg" onclick="handleBuyNowClick()">
              ⚡ Buy Now
            </button>
          </div>

          <div class="trust-badges">
            <div class="trust-badge-item">
              <span class="icon">🚚</span>
              <span>Fast & Free Shipping</span>
            </div>
            <div class="trust-badge-item">
              <span class="icon">🛡️</span>
              <span>1-Year Official Warranty</span>
            </div>
            <div class="trust-badge-item">
              <span class="icon">🔄</span>
              <span>30-Day Money Back</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Specifications Table -->
    ${specsHtml ? `
      <div class="specs-section">
        <h3>Technical Specifications & Features</h3>
        <table class="specs-table">
          <tbody>${specsHtml}</tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function changeMainImage(src, thumbElem) {
  const mainImg = document.getElementById('mainProductImg');
  if (mainImg) mainImg.src = src;

  document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
  if (thumbElem) thumbElem.classList.add('active');
}

function adjustQuantity(delta) {
  if (!currentProduct) return;
  currentQuantity = Math.max(1, Math.min(currentProduct.stock, currentQuantity + delta));
  const display = document.getElementById('productQtyDisplay');
  if (display) display.textContent = currentQuantity;
}

function handleAddToCartClick() {
  if (!currentProduct) return;
  addToCart(currentProduct, currentQuantity);
}

function handleBuyNowClick() {
  if (!currentProduct) return;
  addToCart(currentProduct, currentQuantity);
  window.location.href = '/cart.html';
}

function renderRelatedProducts(products) {
  const container = document.getElementById('relatedProductsGrid');
  if (!container || products.length === 0) return;

  document.getElementById('relatedSection').style.display = 'block';

  container.innerHTML = products.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="card-img-wrapper">
        <img src="${p.image_url}" alt="${p.title}" loading="lazy" onerror="this.src='https://placehold.co/400x300?text=Product'">
      </div>
      <div class="card-body">
        <div class="card-category">${p.category}</div>
        <a href="/product.html?id=${p.id}" class="card-title">${p.title}</a>
        <div class="card-price-row">
          <span class="current-price">$${p.price.toFixed(2)}</span>
        </div>
        <a href="/product.html?id=${p.id}" class="btn btn-primary btn-block btn-sm">
          View Details
        </a>
      </div>
    </div>
  `).join('');
}
