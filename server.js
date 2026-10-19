const express = require('express');
const cors = require('cors');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbHelper = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha-ecommerce-secret-key-2026';

// Initialize Database & Seeding
dbHelper.initDatabase();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT Token Helper
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Authentication Middleware (Required)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = user;
    next();
  });
}

// Optional Auth Middleware (for guests or logged-in users)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err && user) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone, address, city, postal_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = dbHelper.getUserByEmail(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newUserId = dbHelper.createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      phone: phone || '',
      address: address || '',
      city: city || '',
      postal_code: postal_code || ''
    });

    const user = dbHelper.getUserById(newUserId);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = dbHelper.getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      city: user.city,
      postal_code: user.postal_code,
      created_at: user.created_at
    };

    const token = generateToken(safeUser);

    res.json({
      success: true,
      message: 'Welcome back, ' + safeUser.name + '!',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Get current profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = dbHelper.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, address, city, postal_code } = req.body;
    const updated = dbHelper.updateUserProfile(req.user.id, { name, phone, address, city, postal_code });
    res.json({ success: true, message: 'Profile updated successfully!', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
});

// ==========================================
// 2. PRODUCTS ROUTES
// ==========================================

// Get all products with filtering, search, sorting
app.get('/api/products', (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort } = req.query;
    const products = dbHelper.getProducts({ category, search, minPrice, maxPrice, sort });
    res.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        ...p,
        gallery: p.gallery ? JSON.parse(p.gallery) : [p.image_url],
        details: p.details ? JSON.parse(p.details) : {}
      }))
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products.' });
  }
});

// Get distinct categories
app.get('/api/products/categories', (req, res) => {
  try {
    const categories = dbHelper.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching categories.' });
  }
});

// Get single product details + related products
app.get('/api/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const product = dbHelper.getProductById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const formattedProduct = {
      ...product,
      gallery: product.gallery ? JSON.parse(product.gallery) : [product.image_url],
      details: product.details ? JSON.parse(product.details) : {}
    };

    // Find related products in the same category
    const related = dbHelper.getProducts({ category: product.category })
      .filter(p => p.id !== product.id)
      .slice(0, 4)
      .map(p => ({
        ...p,
        gallery: p.gallery ? JSON.parse(p.gallery) : [p.image_url],
        details: p.details ? JSON.parse(p.details) : {}
      }));

    res.json({
      success: true,
      product: formattedProduct,
      related
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching product details.' });
  }
});

// ==========================================
// 3. CART ROUTES (Database backed for users)
// ==========================================

// Get user cart
app.get('/api/cart', authenticateToken, (req, res) => {
  try {
    const cart = dbHelper.getCart(req.user.id);
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart.' });
  }
});

// Add item to cart
app.post('/api/cart', authenticateToken, (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID required.' });
    }

    const product = dbHelper.getProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    dbHelper.addToCart(req.user.id, productId, parseInt(quantity, 10) || 1);
    const updatedCart = dbHelper.getCart(req.user.id);

    res.json({ success: true, message: 'Added to cart!', cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding to cart.' });
  }
});

// Update item quantity in cart
app.put('/api/cart/:productId', authenticateToken, (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const { quantity } = req.body;

    dbHelper.updateCartQuantity(req.user.id, productId, parseInt(quantity, 10));
    const updatedCart = dbHelper.getCart(req.user.id);

    res.json({ success: true, message: 'Cart updated.', cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating cart.' });
  }
});

// Remove item from cart
app.delete('/api/cart/:productId', authenticateToken, (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    dbHelper.removeFromCart(req.user.id, productId);
    const updatedCart = dbHelper.getCart(req.user.id);

    res.json({ success: true, message: 'Item removed from cart.', cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing item from cart.' });
  }
});

// Clear cart
app.delete('/api/cart', authenticateToken, (req, res) => {
  try {
    dbHelper.clearCart(req.user.id);
    res.json({ success: true, message: 'Cart cleared.', cart: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart.' });
  }
});

// Sync cart from client localStorage
app.post('/api/cart/sync', authenticateToken, (req, res) => {
  try {
    const { items = [] } = req.body;
    dbHelper.syncCart(req.user.id, items);
    const updatedCart = dbHelper.getCart(req.user.id);
    res.json({ success: true, cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error syncing cart.' });
  }
});

// ==========================================
// 4. ORDER PROCESSING ROUTES
// ==========================================

// Create new order (guest or authenticated)
app.post('/api/orders', optionalAuth, (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      city,
      postalCode,
      paymentMethod = 'Credit Card (Demo)',
      items = [],
      promoCode
    } = req.body;

    if (!customerName || !customerEmail || !shippingAddress || !city || !postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Shipping name, email, street address, city, and postal code are all required.'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your order must contain at least one product.'
      });
    }

    // Verify stock and compute verified pricing from database
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prodId = item.product_id || item.id;
      const product = dbHelper.getProductById(prodId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ID #${prodId} no longer exists in our catalog.`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.title}". Only ${product.stock} left in stock.`
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      verifiedItems.push({
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        image_url: product.image_url
      });
    }

    // Apply promo code discount if valid
    let discount = 0;
    if (promoCode && (promoCode.toUpperCase() === 'SAVE15' || promoCode.toUpperCase() === 'CODEALPHA')) {
      discount = Math.round(subtotal * 0.15 * 100) / 100; // 15% discount
    }

    // Free shipping over $100, else $9.99
    const shippingFee = (subtotal - discount) >= 100 ? 0 : 9.99;
    const tax = Math.round((subtotal - discount) * 0.08 * 100) / 100; // 8% sales tax
    const totalAmount = Math.max(0, Math.round((subtotal - discount + shippingFee + tax) * 100) / 100);

    const orderResult = dbHelper.createOrder({
      userId: req.user ? req.user.id : null,
      customerName: customerName.trim(),
      customerEmail: customerEmail.toLowerCase().trim(),
      customerPhone: customerPhone ? customerPhone.trim() : '',
      shippingAddress: shippingAddress.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      paymentMethod,
      items: verifiedItems,
      subtotal,
      discount,
      shippingFee,
      tax,
      totalAmount
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        ...orderResult,
        subtotal,
        discount,
        shippingFee,
        tax,
        paymentMethod,
        items: verifiedItems
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Server error processing your order.' });
  }
});

// Get user orders (requires login)
app.get('/api/orders/my-orders', authenticateToken, (req, res) => {
  try {
    const orders = dbHelper.getOrdersByUser(req.user.id);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving your order history.' });
  }
});

// Track/lookup order by order number (public/guest tracking)
app.get('/api/orders/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = dbHelper.getOrderByNumber(orderNumber.toUpperCase().trim());

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found. Please verify the order number.' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error tracking order.' });
  }
});

// Admin endpoint: view all orders
app.get('/api/admin/orders', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    const orders = dbHelper.getAllOrders();
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving store orders.' });
  }
});

// ==========================================
// 5. STORE STATS & CODEALPHA INFO
// ==========================================
app.get('/api/store-info', (req, res) => {
  res.json({
    name: 'CodeAlpha Store',
    website: 'https://www.codealpha.tech',
    version: '1.0.0',
    description: 'Modern, high-performance E-commerce store built for CodeAlpha internship task.',
    techStack: {
      frontend: 'HTML5, CSS3, JavaScript (ES6+)',
      backend: 'Node.js, Express.js',
      database: 'SQLite (node:sqlite built-in)',
      auth: 'JWT & bcryptjs'
    }
  });
});

// HTML page routes
app.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});
app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});
app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// Download Project Zip Route
app.get('/download', (req, res) => {
  const zipPath = path.join(__dirname, 'CodeAlpha_Ecommerce_Store.zip');
  res.download(zipPath, 'CodeAlpha_Ecommerce_Store.zip');
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CodeAlpha E-Commerce Store Server is running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Official Site: https://www.codealpha.tech`);
  console.log(`🔑 Demo User: demo@codealpha.com / password123`);
  console.log(`👑 Admin User: admin@codealpha.com / admin123`);
  console.log(`====================================================`);
});
