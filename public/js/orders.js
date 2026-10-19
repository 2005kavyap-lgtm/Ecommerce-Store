/**
 * Order Tracking & Order History Logic
 * Supports real-time tracking lookup by Order ID for guests and complete order history for registered users
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if URL has ?track=CA-XXXXXX
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('track');

  if (trackId) {
    const input = document.getElementById('orderTrackInput');
    if (input) input.value = trackId;
    lookupOrder(trackId);
  }

  // Bind order tracking search form
  const trackForm = document.getElementById('orderTrackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('orderTrackInput').value.trim();
      if (query) {
        lookupOrder(query);
      }
    });
  }

  // Load user's orders if logged in
  loadUserOrders();
});

async function lookupOrder(orderNumber) {
  const container = document.getElementById('trackedOrderResult');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <p style="color: var(--text-muted);">Searching for order ${orderNumber}...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
    const data = await res.json();

    if (!data.success || !data.order) {
      container.innerHTML = `
        <div style="background: var(--danger-light); border: 1px solid #fca5a5; padding: 1.25rem; border-radius: var(--radius-md); color: #991b1b; margin-top: 1.5rem;">
          <strong>Order not found!</strong> Please verify the order number (e.g. CA-760207).
        </div>
      `;
      return;
    }

    renderSingleOrderReceipt(data.order, container);
  } catch (err) {
    container.innerHTML = `
      <div style="background: var(--danger-light); padding: 1rem; border-radius: var(--radius-md); color: #991b1b;">
        Error connecting to server. Please try again.
      </div>
    `;
  }
}

function renderSingleOrderReceipt(order, targetContainer) {
  const isDelivered = order.order_status.toLowerCase() === 'delivered';
  const isShipped = order.order_status.toLowerCase() === 'shipped' || isDelivered;

  targetContainer.innerHTML = `
    <div class="order-card" style="margin-top: 1.5rem; border: 2px solid var(--primary-glow);">
      <div class="order-card-header">
        <div class="order-meta-group">
          <div>
            <span class="order-meta-label">Order Number</span>
            <span class="order-meta-val" style="color: var(--primary); font-family: monospace;">${order.order_number}</span>
          </div>
          <div>
            <span class="order-meta-label">Date Placed</span>
            <span class="order-meta-val">${new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span class="order-meta-label">Total Amount</span>
            <span class="order-meta-val">$${order.total_amount.toFixed(2)}</span>
          </div>
        </div>
        <span class="order-status-pill ${isDelivered ? 'status-delivered' : 'status-processing'}">
          ● ${order.order_status}
        </span>
      </div>

      <div class="order-card-body">
        <!-- Order Tracking Timeline -->
        <div style="display: flex; justify-content: space-between; align-items: center; position: relative; margin: 1rem 0 2rem; padding: 0 1rem;">
          <div style="position: absolute; top: 14px; left: 10%; right: 10%; height: 3px; background: var(--border-color); z-index: 1;"></div>
          <div style="position: absolute; top: 14px; left: 10%; width: ${isDelivered ? '80%' : isShipped ? '40%' : '10%'}; height: 3px; background: var(--primary); z-index: 1; transition: width 0.5s;"></div>

          <div style="position: relative; z-index: 2; text-align: center;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin: 0 auto 0.4rem;">✔</div>
            <div style="font-size: 0.8rem; font-weight: 700;">Order Placed</div>
          </div>

          <div style="position: relative; z-index: 2; text-align: center;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isShipped ? 'var(--primary)' : 'var(--bg-main)'}; color: ${isShipped ? '#fff' : 'var(--text-light)'}; border: 2px solid ${isShipped ? 'var(--primary)' : 'var(--border-color)'}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin: 0 auto 0.4rem;">🚚</div>
            <div style="font-size: 0.8rem; font-weight: 700; color: ${isShipped ? 'var(--text-main)' : 'var(--text-light)'};">Shipped</div>
          </div>

          <div style="position: relative; z-index: 2; text-align: center;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isDelivered ? 'var(--success)' : 'var(--bg-main)'}; color: ${isDelivered ? '#fff' : 'var(--text-light)'}; border: 2px solid ${isDelivered ? 'var(--success)' : 'var(--border-color)'}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin: 0 auto 0.4rem;">🏡</div>
            <div style="font-size: 0.8rem; font-weight: 700; color: ${isDelivered ? 'var(--success)' : 'var(--text-light)'};">Delivered</div>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem; font-size: 0.9rem; background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md);">
          <div><strong>Recipient:</strong> ${order.customer_name} (${order.customer_email})</div>
          <div><strong>Shipping Address:</strong> ${order.shipping_address}, ${order.city} ${order.postal_code}</div>
          <div><strong>Payment Method:</strong> ${order.payment_method} (${order.payment_status})</div>
        </div>

        <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Items in this order:</h4>
        ${order.items.map(item => `
          <div class="order-item-row">
            <img src="${item.image_url}" alt="${item.title}" class="order-item-img" onerror="this.src='https://placehold.co/80x80?text=Product'">
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 0.95rem;">${item.title}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">$${item.price.toFixed(2)} × ${item.quantity}</div>
            </div>
            <div style="font-weight: 700; font-size: 1rem;">
              $${(item.price * item.quantity).toFixed(2)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function loadUserOrders() {
  const listContainer = document.getElementById('userOrdersList');
  const userSection = document.getElementById('userOrdersSection');
  if (!listContainer || !userSection) return;

  const token = localStorage.getItem('ca_auth_token');
  if (!token) {
    userSection.style.display = 'none';
    return;
  }

  userSection.style.display = 'block';

  try {
    const res = await fetch('/api/orders/my-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.orders && data.orders.length > 0) {
      listContainer.innerHTML = data.orders.map(order => {
        const isDelivered = order.order_status.toLowerCase() === 'delivered';
        return `
          <div class="order-card">
            <div class="order-card-header">
              <div class="order-meta-group">
                <div>
                  <span class="order-meta-label">Order Number</span>
                  <span class="order-meta-val" style="color: var(--primary); font-family: monospace;">${order.order_number}</span>
                </div>
                <div>
                  <span class="order-meta-label">Placed On</span>
                  <span class="order-meta-val">${new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span class="order-meta-label">Total</span>
                  <span class="order-meta-val">$${order.total_amount.toFixed(2)}</span>
                </div>
              </div>
              <span class="order-status-pill ${isDelivered ? 'status-delivered' : 'status-processing'}">
                ● ${order.order_status}
              </span>
            </div>

            <div class="order-card-body">
              ${order.items.map(i => `
                <div class="order-item-row">
                  <img src="${i.image_url}" alt="${i.title}" class="order-item-img" onerror="this.src='https://placehold.co/80x80?text=Product'">
                  <div style="flex: 1;">
                    <a href="/product.html?id=${i.product_id}" style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${i.title}</a>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">$${i.price.toFixed(2)} × ${i.quantity}</div>
                  </div>
                  <div style="font-weight: 700;">$${(i.price * i.quantity).toFixed(2)}</div>
                </div>
              `).join('')}

              <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary btn-sm" onclick="lookupOrder('${order.order_number}'); window.scrollTo({top: 0, behavior: 'smooth'});">
                  Track Live Shipment
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div class="empty-icon">📦</div>
          <div class="empty-title">No orders placed yet</div>
          <p class="empty-desc">Your past orders will appear here once you make your first purchase.</p>
          <a href="/index.html" class="btn btn-primary btn-sm">Start Shopping</a>
        </div>
      `;
    }
  } catch (err) {
    listContainer.innerHTML = `<p style="color: var(--text-muted);">Could not load your orders history.</p>`;
  }
}
