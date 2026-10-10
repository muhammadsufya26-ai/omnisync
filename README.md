# OmniSync — Multi-Channel Order Fulfillment & RTO Mitigation Hub for SMEs

**OmniSync** is a production-grade multi-channel e-commerce operations and Cash-on-Delivery (COD) Return-to-Origin (RTO) mitigation platform tailored for D2C brands and SMEs. It unifies orders across **WhatsApp**, **Instagram DM**, **Daraz Store**, and **Online Storefront**, scores COD parcel risk using **Google Gemini AI** (`@google/genai`), automates 1-click **WhatsApp Customer Verification**, and streamlines local courier airway bill (AWB) dispatch across **TCS Express**, **Trax Logistics**, and **Leopards Courier**.

---

## Key Features

- **Unified Multi-Channel Dispatch Queue (`/orders`)**:
  - Consolidates COD and prepaid orders from WhatsApp, Instagram DM, Daraz Mall, and Web checkout in real time via Server-Sent Events (`/api/events`).
  - Sliding filter tabs (`All`, `Pending`, `High Risk`, `Dispatched`, `Delivered`, `Today's Returns`) and instant search across Order IDs (`#OMS-1049`), phone numbers, cities, and airway bill numbers.
- **Gemini AI COD Risk Radar (`/api/ai-risk`)**:
  - Evaluates customer phone history, address completeness, and order value using Google Gemini (`gemini-3.8-flash`) with deterministic rule-based fallback.
  - Flags high-risk parcels (`⚠️ High RTO Risk (82%)`) with human-readable explanations before warehouse dispatch.
- **1-Click WhatsApp Customer Verification**:
  - Generates pre-filled `https://wa.me/` verification links containing customer name, order reference, PKR total, and localized delivery address to confirm COD intent and save two-way courier return fees.
- **Local Courier AWB & Printable Thermal Waybills**:
  - Assigns tracking codes for **TCS Express**, **Trax Logistics**, and **Leopards Courier** and renders print-ready Code-128 SVG barcode packing slips.
- **Role-Based Access Control (RBAC) & Dual Portals (`/login`, `/customer/orders`, `/track/[orderId]`)**:
  - Dedicated **Business Owner / Staff** operations portal and **Customer Track & Order Portal** with route middleware protection (`src/middleware.ts`).

---

## Environment Variables

Copy [`.env.example`](./.env.example) to `.env` locally or configure the following variables in your **Vercel Project Settings → Environment Variables**:

```env
# 1. PostgreSQL Connection String (Neon / Supabase Pooled URL for Production, or SQLite locally)
DATABASE_URL="postgresql://user:password@ep-example-pooler.region.aws.neon.tech/omnisync?sslmode=require&pgbouncer=true&connection_limit=5"

# 2. Google AI Studio API Key for Gemini COD RTO Risk Analysis
GEMINI_API_KEY="your_google_ai_studio_gemini_api_key_here"

# 3. Public Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Quick Start (Local Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Push Prisma schema to the database**:
   ```bash
   npx prisma db push
   ```

3. **Seed realistic localized Pakistani D2C orders, products, and demo accounts**:
   ```bash
   npx prisma db seed
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Login Credentials (`/login`)

- **Business Owner (Admin)**: `admin@omnisync.com` / `admin123`
- **Operations Staff**: `staff@omnisync.com` / `staff123`
- **Customer Portal**: `ayesha.malik@example.com` (Phone: `+92 333 5120987`, Order: `#OMS-1048`)

---

## Deploying to Vercel + Hosted PostgreSQL (Neon / Supabase)

1. In [`prisma/schema.prisma`](./prisma/schema.prisma), switch `provider = "postgresql"` under `datasource db`.
2. Push the repository to GitHub (`.env` and local `.db` files are automatically excluded by [`.gitignore`](./.gitignore)).
3. Import the project into **Vercel**:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `prisma generate && next build` (pre-configured in [`package.json`](./package.json) and [`vercel.json`](./vercel.json))
   - **Install Command**: `npm install` (triggers `"postinstall": "prisma generate"`)
4. Add `DATABASE_URL`, `GEMINI_API_KEY`, and `NEXT_PUBLIC_APP_URL` in Vercel Environment Variables and deploy.
