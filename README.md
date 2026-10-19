# CodeAlpha E-Commerce Store

A modern, full-stack, responsive E-commerce platform built as a project for the **CodeAlpha Internship Task** ([www.codealpha.tech](https://www.codealpha.tech)).

---

## 🌟 Key Features

### 1. 🛍️ Product Listings & Catalog
- **Multi-category filtering**: Electronics, Accessories, Fashion, Home & Living.
- **Instant Search**: Real-time debounced title & description search.
- **Dynamic Sorting**: Filter by Featured, Price (Low to High / High to Low), Customer Rating, and Newest Arrivals.
- **Product Cards**: High-resolution imagery, discount tags, rating stars, stock counts, and **Quick View** modal.

### 2. 🔍 Dedicated Product Details Page (`/product.html?id=...`)
- Interactive multi-angle image gallery with thumbnail preview.
- Dynamic breadcrumb navigation.
- In-depth product specifications and technical details table.
- Stock availability indicator & live quantity selector.
- **"Add to Cart"** and **"Buy Now"** fast-checkout flows.
- Automated **Related Products** recommendations.

### 3. 🛒 Interactive Shopping Cart
- Slide-out **Quick Cart Drawer** accessible from any page.
- Dedicated **Full Cart & Checkout Page** (`/cart.html`).
- Adjust quantities (`+` / `-`), remove items, and instant subtotal calculation.
- **15% Coupon Code Support**: Enter promo code `CODEALPHA` for instant 15% discount.
- Cart syncs to localStorage for guests and automatically persists to the SQLite database for logged-in users.

### 4. 💳 Multi-Step Order Processing & Checkout
- Order details form with pre-filled profile information for signed-in users.
- Live pricing breakdown: Subtotal, Promotional Discount, Free Shipping (orders over $100), and 8% Sales Tax.
- Payment selection options: **Credit / Debit Card (Demo)**, **UPI / Instant Pay**, and **Cash on Delivery**.
- Instant stock deduction and database order record generation.
- Order confirmation modal with unique **Order Tracking ID** (e.g. `CA-828945`) and itemized receipt.

### 5. 📦 Order Tracking & History (`/orders.html`)
- **Public / Guest Order Tracker**: Track any order in real-time by entering the Order Number.
- **Visual Order Timeline**: Order Placed ➔ Shipped ➔ Delivered.
- **User Order History**: Logged-in accounts can view all past orders, dates, item thumbnails, and total costs.

### 6. 👤 User Registration & Authentication
- Secure account creation and login with **Bcrypt** password hashing.
- **JSON Web Token (JWT)** session persistence in `localStorage`.
- Profile menu in navbar displaying initials, user details, and one-click sign-out.
- One-click **Demo Account Auto-Fill** button for easy testing.

### 7. 🗄️ Database Architecture (SQLite)
Uses Node's built-in SQLite engine (`node:sqlite`) with zero external native C++ compilation issues:
- `users`: User profiles, hashed passwords, roles (`customer` / `admin`), and shipping addresses.
- `products`: Seeded with 12 high-quality products across 4 categories with specs and gallery photos.
- `cart_items`: Database-backed persistent cart per user.
- `orders`: Order tracking numbers, delivery addresses, payment methods, and totals.
- `order_items`: Line items with quantities, prices, and product links.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid, Glassmorphism), Vanilla ES6+ JavaScript.
- **Backend**: Node.js & Express.js.
- **Database**: SQLite (`node:sqlite DatabaseSync`).
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`.
- **Styling**: Responsive design optimized for desktop, tablet, and mobile screens.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended, fully compatible with Node 22 & 25).
- **npm** (included with Node.js).

### 2. Installation
Open your terminal in the project root directory and run:

```bash
npm install
```

### 3. Start the Server
Run the following command:

```bash
npm start
```

You will see:
```text
====================================================
🚀 CodeAlpha E-Commerce Store Server is running!
📡 Local URL: http://localhost:3000
🌐 Official Site: https://www.codealpha.tech
🔑 Demo User: demo@codealpha.com / password123
👑 Admin User: admin@codealpha.com / admin123
====================================================
```

### 4. Open in Browser
Open your browser and navigate to:
[**http://localhost:3000**](http://localhost:3000)

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Customer** | `demo@codealpha.com` | `password123` |
| **Admin** | `admin@codealpha.com` | `admin123` |

*(You can also click the "Customer" or "Admin" quick-fill button inside the Sign In modal!)*

---

## 🏷️ Special Promo Code
- Promo Code: `CODEALPHA`
- Benefit: **15% OFF** on any order at checkout.

---

## 📡 API Reference Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in and receive JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/products` | Retrieve catalog with category/search/sort filters |
| `GET` | `/api/products/categories` | List distinct categories & product counts |
| `GET` | `/api/products/:id` | Single product details & related products |
| `GET` | `/api/cart` | Get authenticated user's cart |
| `POST` | `/api/cart` | Add item to user's cart |
| `PUT` | `/api/cart/:productId` | Update item quantity |
| `DELETE` | `/api/cart/:productId` | Remove item from cart |
| `POST` | `/api/orders` | Place a new order (guest or authenticated) |
| `GET` | `/api/orders/my-orders` | Retrieve authenticated user's order history |
| `GET` | `/api/orders/:orderNumber` | Lookup order by order tracking number |

---

## 📁 Project Directory Structure

```text
E- commerce store/
├── package.json          # Dependencies & npm scripts
├── server.js             # Express.js server & REST APIs
├── database.js           # SQLite schema, queries & product seeding
├── ecommerce.db          # Persistent SQLite database file
├── README.md             # Project documentation & run guide
└── public/               # Frontend Assets
    ├── index.html        # Storefront catalog, hero, quick view & search
    ├── product.html      # Dedicated product details page & gallery
    ├── cart.html         # Full shopping cart & multi-step checkout
    ├── orders.html       # Live shipment tracking & order history
    ├── css/
    │   ├── style.css     # Global styles, variables, navigation & modals
    │   └── product.css   # Product detail & checkout custom styling
    └── js/
        ├── app.js        # Core state, auth, quick-cart, toasts & catalog
        ├── product.js    # Single product loader & gallery thumbnails
        ├── cart.js       # Cart calculation, promo codes & checkout
        └── orders.js     # Live order lookup & timeline tracking
```

---

## 🏆 CodeAlpha Task Verification

- **Task Name**: Simple E-commerce Store
- **Organization**: CodeAlpha ([www.codealpha.tech](https://www.codealpha.tech))
- **Status**: Completed & Verified
