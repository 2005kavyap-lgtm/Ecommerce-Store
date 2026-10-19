/**
 * Full Shopping Cart & Order Processing Logic
 * Handles cart item management, promo code calculation, multi-step checkout, and order submission
 */

let promoApplied = localStorage.getItem('ca_promo_applied') === 'true';
let selectedPaymentMethod = 'Credit Card (Demo)';

document.addEventListener('DOMContentLoaded', () => {
  renderFullCart();
  prefillUserInfo();

  // Coupon apply button
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  const promoInput = document.getElementById('promoCodeInput');
  if (applyPromoBtn && promoInput) {
    if (promoApplied) {
      promoInput.value = 'CODEALPHA';
    }

    applyPromoBtn.addEventListener('click', () => {
      const code = promoInput.value.trim().toUpperCase();
      if (code === 'CODEALPHA') {
        promoApplied = true;
        localStorage.setItem('ca_promo_applied', 'true');
        showToast('Promo code CODEALPHA applied! 15% discount activated.', 'success');
        renderFullCart();
      } else if (!code) {
        promoApplied = false;
        localStorage.removeItem('ca_promo_applied');
        renderFullCart();
      } else {
        showToast('Invalid coupon code. Try "CODEALPHA"', 'error');
      }
    });
  }

  // Payment method selection cards
  document.querySelectorAll('.payment-card-opt').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-card-opt').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPaymentMethod = card.dataset.method;
    });
  });

  // Checkout form submission
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }
});

function prefillUserInfo() {
  if (Store.user) {
    const nameInput = document.getElementById('shippingName');
    const emailInput = document.getElementById('shippingEmail');
    const phoneInput = document.getElementById('shippingPhone');
    const addressInput = document.getElementById('shippingAddress');
    const cityInput = document.getElementById('shippingCity');
    const zipInput = document.getElementById('shippingZip');

    if (nameInput && !nameInput.value) nameInput.value = Store.user.name || '';
    if (emailInput && !emailInput.value) emailInput.value = Store.user.email || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = Store.user.phone || '';
    if (addressInput && !addressInput.value) addressInput.value = Store.user.address || '';
    if (cityInput && !cityInput.value) cityInput.value = Store.user.city || '';
    if (zipInput && !zipInput.value) zipInput.value = Store.user.postal_code || '';
  }
}

function renderFullCart() {
  const container = document.getElementById('fullCartContainer');
  const emptyState = document.getElementById('cartEmptyState');
  const checkoutArea = document.getElementById('checkoutArea');
  if (!container) return;

  if (Store.cart.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (checkoutArea) checkoutArea.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (checkoutArea) checkoutArea.style.display = 'grid';

  let subtotal = 0;
  container.innerHTML = Store.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item" style="padding: 1.25rem 0;">
        <img src="${item.image_url}" alt="${item.title}" class="cart-item-img" style="width: 80px; height: 80px;" onerror="this.src='https://placehold.co/100x100?text=Product'">
        <div class="cart-item-info">
          <a href="/product.html?id=${item.id}" class="cart-item-title" style="font-size: 1.05rem; font-weight: 700;">${item.title}</a>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Category: ${item.category}</div>
          <div class="cart-item-price" style="font-size: 1.1rem;">$${item.price.toFixed(2)}</div>
          
          <div class="cart-item-controls" style="margin-top: 0.5rem;">
            <div class="qty-control">
              <button class="qty-btn" onclick="updateCartItemAndRefresh(${item.id}, ${item.quantity - 1})">-</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemAndRefresh(${item.id}, ${item.quantity + 1})">+</button>
            </div>
            <span style="font-weight: 700; font-size: 1.05rem;">Total: $${itemTotal.toFixed(2)}</span>
            <button class="cart-item-remove" onclick="removeCartItemAndRefresh(${item.id})" title="Remove item">
              🗑 Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Calculate totals
  let discount = 0;
  if (promoApplied) {
    discount = Math.round(subtotal * 0.15 * 100) / 100;
  }

  const netSubtotal = subtotal - discount;
  const shipping = netSubtotal >= 100 ? 0 : 9.99;
  const tax = Math.round(netSubtotal * 0.08 * 100) / 100;
  const grandTotal = Math.max(0, Math.round((netSubtotal + shipping + tax) * 100) / 100);

  // Update summary fields
  const subtotalElem = document.getElementById('summarySubtotal');
  const discountRow = document.getElementById('summaryDiscountRow');
  const discountElem = document.getElementById('summaryDiscount');
  const shippingElem = document.getElementById('summaryShipping');
  const taxElem = document.getElementById('summaryTax');
  const totalElem = document.getElementById('summaryTotal');

  if (subtotalElem) subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
  if (discountRow) {
    discountRow.style.display = discount > 0 ? 'flex' : 'none';
    if (discountElem) discountElem.textContent = `-$${discount.toFixed(2)}`;
  }
  if (shippingElem) shippingElem.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  if (taxElem) taxElem.textContent = `$${tax.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `$${grandTotal.toFixed(2)}`;
}

async function updateCartItemAndRefresh(productId, quantity) {
  await updateCartItemQuantity(productId, quantity);
  renderFullCart();
}

async function removeCartItemAndRefresh(productId) {
  await removeFromCart(productId);
  renderFullCart();
}

// Checkout submission
async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (Store.cart.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const name = document.getElementById('shippingName').value.trim();
  const email = document.getElementById('shippingEmail').value.trim();
  const phone = document.getElementById('shippingPhone').value.trim();
  const address = document.getElementById('shippingAddress').value.trim();
  const city = document.getElementById('shippingCity').value.trim();
  const postalCode = document.getElementById('shippingZip').value.trim();

  if (!name || !email || !address || !city || !postalCode) {
    showToast('Please fill in all required shipping address fields.', 'error');
    return;
  }

  const submitBtn = document.getElementById('placeOrderBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳</span> Processing Order...`;
  }

  const orderPayload = {
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    shippingAddress: address,
    city: city,
    postalCode: postalCode,
    paymentMethod: selectedPaymentMethod,
    items: Store.cart,
    promoCode: promoApplied ? 'CODEALPHA' : ''
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (Store.token) {
      headers['Authorization'] = `Bearer ${Store.token}`;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();

    if (data.success && data.order) {
      // Clear cart
      await clearCart();
      promoApplied = false;
      localStorage.removeItem('ca_promo_applied');

      // Display Order Success Modal
      showOrderSuccessModal(data.order);
    } else {
      showToast(data.message || 'Failed to place order. Please try again.', 'error');
    }
  } catch (err) {
    showToast('Network error during checkout. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>🔒</span> Confirm & Place Order`;
    }
  }
}

function showOrderSuccessModal(order) {
  const modal = document.getElementById('orderSuccessModal');
  const content = document.getElementById('orderSuccessDetails');
  if (!modal || !content) return;

  content.innerHTML = `
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <div style="width: 70px; height: 70px; background: #ecfdf5; border-radius: 50%; color: #10b981; font-size: 2.2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 2px solid #a7f3d0;">
        ✔
      </div>
      <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Order Placed Successfully!</h2>
      <p style="color: var(--text-muted); font-size: 0.95rem;">Thank you for shopping with CodeAlpha Store.</p>
    </div>

    <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">Tracking Number:</span>
        <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary); font-family: monospace;">${order.orderNumber}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
        <span style="color: var(--text-muted);">Recipient:</span>
        <span style="font-weight: 600;">${order.customerName} (${order.customerEmail})</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
        <span style="color: var(--text-muted);">Delivery Address:</span>
        <span style="font-weight: 600;">${order.shipping_address || order.shippingAddress || ''}, ${order.city}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
        <span style="color: var(--text-muted);">Payment Method:</span>
        <span style="font-weight: 600;">${order.paymentMethod} (Verified)</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
        <span>Total Paid:</span>
        <span style="color: var(--primary);">$${order.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <div style="display: flex; gap: 0.75rem;">
      <a href="/orders.html?track=${order.orderNumber}" class="btn btn-primary" style="flex: 1;">
        <span>📦</span> Track This Order
      </a>
      <a href="/index.html" class="btn btn-secondary" style="flex: 1;">
        Continue Shopping
      </a>
    </div>
  `;

  modal.classList.add('active');
  renderFullCart();
}
