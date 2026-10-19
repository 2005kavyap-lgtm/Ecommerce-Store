const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new DatabaseSync(dbPath);

// Initialize database tables
function initDatabase() {
  // Foreign keys pragma
  db.exec('PRAGMA foreign_keys = ON;');

  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      phone TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      description TEXT NOT NULL,
      details TEXT,
      image_url TEXT NOT NULL,
      gallery TEXT,
      stock INTEGER NOT NULL DEFAULT 10,
      rating REAL DEFAULT 4.5,
      reviews_count INTEGER DEFAULT 12,
      badge TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Cart Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      shipping_address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'Paid',
      order_status TEXT DEFAULT 'Processing',
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Order Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image_url TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

// Seed default users and catalog products
function seedInitialData() {
  // Check if users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('password123', salt);
    const adminPasswordHash = bcrypt.hashSync('admin123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, address, city, postal_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'Alex Johnson',
      'demo@codealpha.com',
      demoPasswordHash,
      'customer',
      '+1 (555) 234-5678',
      '742 Evergreen Terrace',
      'San Francisco',
      '94103'
    );

    insertUser.run(
      'CodeAlpha Admin',
      'admin@codealpha.com',
      adminPasswordHash,
      'admin',
      '+1 (555) 987-6543',
      '100 CodeAlpha HQ Way',
      'San Jose',
      '95113'
    );

    console.log('✔ Initial demo users created (demo@codealpha.com / password123)');
  }

  // Check if products exist
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (title, category, price, original_price, description, details, image_url, gallery, stock, rating, reviews_count, badge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialProducts = [
      {
        title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
        category: 'Electronics',
        price: 349.99,
        original_price: 399.99,
        description: 'Industry-leading noise cancellation with two processors and 8 microphones. Ultra-comfortable lightweight design with soft fit leather, 30-hour battery life, and crystal clear hands-free calling.',
        details: JSON.stringify({
          'Brand': 'Sony',
          'Connectivity': 'Bluetooth 5.2, 3.5mm Aux',
          'Battery Life': 'Up to 30 hours (ANC on)',
          'Charging': 'USB-C Quick Charge (3 min for 3 hours)',
          'Features': 'Active Noise Cancellation, Speak-to-Chat, Multipoint Pairing',
          'In The Box': 'Headphones, Carrying Case, Audio Cable, USB-C Cable'
        }),
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 24,
        rating: 4.9,
        reviews_count: 148,
        badge: 'Best Seller'
      },
      {
        title: 'Apple Watch Series 9 GPS + Cellular 45mm',
        category: 'Electronics',
        price: 429.00,
        original_price: 499.00,
        description: 'Smarter, brighter, and mightier. Featuring the S9 SiP chip, a magical new double-tap gesture, brighter Always-On Retina display, and advanced health and workout sensors.',
        details: JSON.stringify({
          'Case Size': '45mm Aluminum',
          'Display': 'Always-On Retina OLED (up to 2000 nits)',
          'Processor': 'S9 SiP with 64-bit dual-core',
          'Water Resistance': '50 meters swimproof',
          'Sensors': 'Blood Oxygen, ECG, Temperature sensing, Crash Detection',
          'Battery': 'Up to 18 hours normal use, 36 hours Low Power Mode'
        }),
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 18,
        rating: 4.8,
        reviews_count: 94,
        badge: 'Hot Deal'
      },
      {
        title: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
        category: 'Accessories',
        price: 189.99,
        original_price: 219.99,
        description: 'Full CNC aluminum body, 75% layout, hot-swappable QMK/VIA programmable mechanical keyboard with double-gasket design, Bluetooth 5.1 & wired Type-C connectivity.',
        details: JSON.stringify({
          'Layout': '75% US ANSI',
          'Switch Type': 'Keychron K Pro Red (Linear, Pre-lubed)',
          'Body Material': 'Full CNC Machined Aluminum',
          'Keycaps': 'KSA Double-shot PBT',
          'Connectivity': 'Bluetooth 5.1 & Type-C Cable',
          'Compatibility': 'macOS / Windows / Linux'
        }),
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 12,
        rating: 4.9,
        reviews_count: 76,
        badge: 'Trending'
      },
      {
        title: 'Logitech MX Master 3S Ergonomic Wireless Mouse',
        category: 'Accessories',
        price: 99.99,
        original_price: 119.99,
        description: 'Quiet Clicks and 8K DPI any-surface tracking, including glass. MagSpeed electromagnetic scrolling delivers 90% more speed and 87% more precision for creators and developers.',
        details: JSON.stringify({
          'Sensor': 'Darkfield high precision (200-8000 DPI)',
          'Buttons': '7 buttons (Left/Right-click, Back/Forward, App-Switch, Wheel mode-shift, Middle click)',
          'Scroll Wheel': 'MagSpeed Smartshift with horizontal thumb wheel',
          'Wireless': 'Logi Bolt USB Receiver & Bluetooth Low Energy',
          'Battery': 'Rechargeable Li-Po (500 mAh), up to 70 days'
        }),
        image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 35,
        rating: 4.7,
        reviews_count: 215,
        badge: 'Popular'
      },
      {
        title: 'Minimalist Polarized UV400 Designer Sunglasses',
        category: 'Fashion',
        price: 64.50,
        original_price: 89.00,
        description: 'Timeless unisex silhouette crafted from lightweight acetate and stainless steel hinges. HD polarized lenses block 100% harmful UVA and UVB rays for crisp optical clarity.',
        details: JSON.stringify({
          'Frame Material': 'Italian Cellulose Acetate',
          'Lens': 'TAC Polarized UV400 Protection',
          'Dimensions': 'Lens 52mm, Bridge 20mm, Temple 145mm',
          'Gender': 'Unisex',
          'Includes': 'Hard protective case, micro-fiber cleaning cloth'
        }),
        image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 40,
        rating: 4.6,
        reviews_count: 53,
        badge: 'New Arrival'
      },
      {
        title: 'Vintage Heritage Leather Weekend Duffel Bag',
        category: 'Fashion',
        price: 145.00,
        original_price: 195.00,
        description: 'Handcrafted from full-grain rugged cowhide leather with heavy-duty brass hardware. Features a padded 15-inch laptop sleeve, separate ventilated shoe compartment, and detachable shoulder strap.',
        details: JSON.stringify({
          'Material': '100% Genuine Full-grain Buffalo Leather',
          'Lining': 'Water-resistant cotton canvas',
          'Dimensions': '21.5" L x 11.5" W x 11.5" H',
          'Capacity': '45 Liters',
          'Pockets': 'Dedicated shoe pocket, padded laptop compartment, 3 internal organizer slots'
        }),
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 14,
        rating: 4.8,
        reviews_count: 67,
        badge: 'Handcrafted'
      },
      {
        title: 'Minimalist Desk Lamp with Fast Qi Wireless Charger',
        category: 'Home & Living',
        price: 58.00,
        original_price: 75.00,
        description: 'Modern aluminum architecture with touch-sensitive dimming, 5 color temperature modes (2700K - 6500K), built-in 15W Qi wireless fast-charging base, and memory function.',
        details: JSON.stringify({
          'Light Source': 'Energy-efficient flicker-free LED',
          'Brightness': '800 Lumens (Continuous dimming)',
          'Color Temp': '5 Presets (Warm White to Cool Daylight)',
          'Charging Base': '15W Qi Wireless Fast Charger + 5V/2A USB port',
          'Material': 'Anodized Aluminum Alloy + ABS'
        }),
        image_url: 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 28,
        rating: 4.7,
        reviews_count: 82,
        badge: 'Eco Friendly'
      },
      {
        title: 'Vacuum Insulated Stainless Steel Tumbler 32oz',
        category: 'Home & Living',
        price: 32.99,
        original_price: 42.00,
        description: 'Double-wall vacuum insulation keeps ice cold for up to 36 hours or steaming hot for 12 hours. Sweat-proof powder coat finish with leakproof flip lid and stainless steel reusable straw.',
        details: JSON.stringify({
          'Capacity': '32 fl oz (946 ml)',
          'Material': 'Pro-grade 18/8 Stainless Steel (BPA-free)',
          'Insulation': 'TempShield double-wall vacuum',
          'Dishwasher Safe': 'Yes, top rack recommended',
          'Fits Cup Holders': 'Yes'
        }),
        image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 50,
        rating: 4.8,
        reviews_count: 120,
        badge: 'Top Rated'
      },
      {
        title: 'Dell UltraSharp 27 4K USB-C Hub Monitor (U2723QE)',
        category: 'Electronics',
        price: 579.99,
        original_price: 649.99,
        description: 'Be your most productive on a 27-inch 4K monitor with IPS Black technology delivering 2000:1 contrast ratio, 90W USB-C power delivery, and built-in RJ45 Ethernet hub.',
        details: JSON.stringify({
          'Screen Size': '27-inch 4K UHD (3840 x 2160) at 60Hz',
          'Panel': 'IPS Black Technology, 2000:1 contrast ratio',
          'Color Gamut': '100% sRGB, 98% DCI-P3, VESA DisplayHDR 400',
          'Ports': 'HDMI 2.0, DP 1.4, USB-C upstream (90W PD), 4x USB-A 10Gbps, RJ45 Ethernet',
          'Stand': 'Height-adjustable, tilt, swivel, and pivot'
        }),
        image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 9,
        rating: 4.9,
        reviews_count: 64,
        badge: 'Pro Pick'
      },
      {
        title: 'Ergonomic Breathable Mesh Executive Chair',
        category: 'Home & Living',
        price: 289.00,
        original_price: 360.00,
        description: 'Engineered for full day support. Dynamic adaptive lumbar support, 3D adjustable armrests, 135-degree recline with tilt-lock, and heavy-duty class-4 gas lift certified to 300 lbs.',
        details: JSON.stringify({
          'Material': 'High-elastic breathable Korean mesh',
          'Weight Capacity': 'Up to 300 lbs (136 kg)',
          'Armrests': '3D adjustable (height, forward/back, angle)',
          'Recline': '90° - 135° with tension control',
          'Warranty': '5 Years Manufacturer Warranty'
        }),
        image_url: 'https://images.unsplash.com/photo-1580481077195-c3a82474c84b?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1580481077195-c3a82474c84b?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 16,
        rating: 4.7,
        reviews_count: 88,
        badge: 'Comfort'
      },
      {
        title: 'SanDisk 1TB Extreme Portable External SSD',
        category: 'Accessories',
        price: 109.99,
        original_price: 139.99,
        description: 'High-speed NVMe solid state performance with read speeds up to 1050MB/s and write speeds up to 1000MB/s. Rugged IP65 water & dust resistance with 3-meter drop protection.',
        details: JSON.stringify({
          'Capacity': '1TB NVMe Solid State Storage',
          'Speed': 'Up to 1050 MB/s Read, 1000 MB/s Write',
          'Interface': 'USB 3.2 Gen 2 (Type-C)',
          'Durability': 'IP65 water and dust resistance, 3-meter drop protection',
          'Security': '256-bit AES hardware encryption'
        }),
        image_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 30,
        rating: 4.8,
        reviews_count: 177,
        badge: 'Fast Storage'
      },
      {
        title: 'Premium Heavyweight Organic Cotton Hoodie',
        category: 'Fashion',
        price: 78.00,
        original_price: 95.00,
        description: 'Structured 450 GSM French Terry crafted from 100% certified organic ring-spun combed cotton. Preshrunk with double-needle flatlock seams and ribbed side panels for comfort.',
        details: JSON.stringify({
          'Fabric': '100% Organic Ring-spun Cotton (450 GSM)',
          'Fit': 'Relaxed unisex modern streetwear fit',
          'Construction': 'Flatlock stitching, metal aglets on drawcord',
          'Care': 'Machine wash cold inside out, tumble dry low'
        }),
        image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80'
        ]),
        stock: 22,
        rating: 4.6,
        reviews_count: 49,
        badge: 'Organic'
      }
    ];

    for (const p of initialProducts) {
      insertProduct.run(
        p.title,
        p.category,
        p.price,
        p.original_price,
        p.description,
        p.details,
        p.image_url,
        p.gallery,
        p.stock,
        p.rating,
        p.reviews_count,
        p.badge
      );
    }

    console.log(`✔ Catalog seeded with ${initialProducts.length} high-quality products.`);
  }

  // Seed sample initial order for demo user so order history is immediately visible
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (orderCount === 0) {
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@codealpha.com');
    if (demoUser) {
      const orderNumber = 'CA-' + Math.floor(100000 + Math.random() * 900000);
      const insertOrder = db.prepare(`
        INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address, city, postal_code, payment_method, payment_status, order_status, subtotal, discount, shipping_fee, tax, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderInfo = insertOrder.run(
        orderNumber,
        demoUser.id,
        'Alex Johnson',
        'demo@codealpha.com',
        '+1 (555) 234-5678',
        '742 Evergreen Terrace',
        'San Francisco',
        '94103',
        'Credit Card (Demo)',
        'Paid',
        'Delivered',
        349.99,
        35.00,
        0.00,
        25.20,
        340.19
      );

      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, title, price, quantity, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertOrderItem.run(
        orderInfo.lastInsertRowid,
        1,
        'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
        349.99,
        1,
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      );

      console.log(`✔ Sample demo order created: ${orderNumber}`);
    }
  }
}

// Database helper functions
module.exports = {
  db,
  initDatabase,
  getUserByEmail: (email) => {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },
  getUserById: (id) => {
    return db.prepare('SELECT id, name, email, role, phone, address, city, postal_code, created_at FROM users WHERE id = ?').get(id);
  },
  createUser: ({ name, email, password_hash, phone = '', address = '', city = '', postal_code = '' }) => {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, address, city, postal_code)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, password_hash, phone, address, city, postal_code);
    return result.lastInsertRowid;
  },
  updateUserProfile: (id, { name, phone, address, city, postal_code }) => {
    const stmt = db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          postal_code = COALESCE(?, postal_code)
      WHERE id = ?
    `);
    stmt.run(name, phone, address, city, postal_code, id);
    return db.prepare('SELECT id, name, email, role, phone, address, city, postal_code FROM users WHERE id = ?').get(id);
  },
  getProducts: ({ category, search, minPrice, maxPrice, sort } = {}) => {
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category.toLowerCase() !== 'all') {
      sql += ' AND LOWER(category) = LOWER(?)';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    if (minPrice !== undefined && minPrice !== null && !isNaN(minPrice)) {
      sql += ' AND price >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== null && !isNaN(maxPrice)) {
      sql += ' AND price <= ?';
      params.push(Number(maxPrice));
    }

    switch (sort) {
      case 'price-asc':
        sql += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        sql += ' ORDER BY price DESC';
        break;
      case 'rating':
        sql += ' ORDER BY rating DESC';
        break;
      case 'newest':
        sql += ' ORDER BY id DESC';
        break;
      default:
        sql += ' ORDER BY id ASC';
    }

    return db.prepare(sql).all(...params);
  },
  getProductById: (id) => {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },
  getCategories: () => {
    return db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM products 
      GROUP BY category 
      ORDER BY category ASC
    `).all();
  },
  getCart: (userId) => {
    return db.prepare(`
      SELECT 
        c.id as cart_item_id,
        c.quantity,
        p.id as product_id,
        p.title,
        p.price,
        p.original_price,
        p.image_url,
        p.stock,
        p.category
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(userId);
  },
  addToCart: (userId, productId, quantity = 1) => {
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(userId, productId, quantity);
    }
  },
  updateCartQuantity: (userId, productId, quantity) => {
    if (quantity <= 0) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(quantity, userId, productId);
    }
  },
  removeFromCart: (userId, productId) => {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
  },
  clearCart: (userId) => {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  },
  syncCart: (userId, clientItems = []) => {
    for (const item of clientItems) {
      if (!item.id || !item.quantity) continue;
      const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, item.id);
      if (existing) {
        // Keep maximum of local or server quantity
        const finalQty = Math.max(existing.quantity, item.quantity);
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(finalQty, existing.id);
      } else {
        const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(item.id);
        if (prod) {
          db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(userId, item.id, item.quantity);
        }
      }
    }
  },
  createOrder: ({
    userId = null,
    customerName,
    customerEmail,
    customerPhone = '',
    shippingAddress,
    city,
    postalCode,
    paymentMethod,
    items,
    subtotal,
    discount = 0,
    shippingFee = 0,
    tax = 0,
    totalAmount
  }) => {
    const orderNumber = 'CA-' + Math.floor(100000 + Math.random() * 900000);

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, city, postal_code, payment_method, payment_status,
        order_status, subtotal, discount, shipping_fee, tax, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', 'Processing', ?, ?, ?, ?, ?)
    `);

    const orderResult = insertOrder.run(
      orderNumber,
      userId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      city,
      postalCode,
      paymentMethod,
      subtotal,
      discount,
      shippingFee,
      tax,
      totalAmount
    );

    const orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, title, price, quantity, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
    `);

    for (const item of items) {
      insertItem.run(
        orderId,
        item.product_id || item.id,
        item.title,
        item.price,
        item.quantity,
        item.image_url
      );
      updateStock.run(item.quantity, item.product_id || item.id);
    }

    if (userId) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    }

    return {
      orderId,
      orderNumber,
      customerName,
      customerEmail,
      totalAmount,
      orderStatus: 'Processing',
      createdAt: new Date().toISOString()
    };
  },
  getOrdersByUser: (userId) => {
    const orders = db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);

    const getItems = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `);

    return orders.map(ord => ({
      ...ord,
      items: getItems.all(ord.id)
    }));
  },
  getOrderByNumber: (orderNumber) => {
    const order = db.prepare(`
      SELECT * FROM orders WHERE order_number = ?
    `).get(orderNumber);

    if (!order) return null;

    const items = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `).all(order.id);

    return { ...order, items };
  },
  getAllOrders: () => {
    const orders = db.prepare(`
      SELECT * FROM orders ORDER BY created_at DESC
    `).all();

    const getItems = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `);

    return orders.map(ord => ({
      ...ord,
      items: getItems.all(ord.id)
    }));
  }
};
