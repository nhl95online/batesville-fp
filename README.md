# Batesville-FP: Supabase Analytics & Showroom Price Card Studio

A complete web application tailored for funeral products management, multi-year sales analytics, and showroom display price card generation.

---

## Quick Start (Visual Studio & VS Code)

### 1. Installation
In your terminal or PowerShell inside `C:\Users\wn95h\Batesville-FP`:
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

In VS Code or Visual Studio:
- Press `Ctrl + Shift + B` to run the **`npm: dev`** build task.
- Press `F5` to start debugging with the configured Chrome profile (`.vscode/launch.json`).

---

## Features & Modules

### 1. Showroom Price Card Studio
Supports exact showroom display dimensions:
- **6" × 6" Square**: Casket cap insert / corner card.
- **2" × 12" Rail Strip**: Horizontal casket rail / front ledge display card.
- **8.5" × 11" Letter**: Showroom catalog sheet / presentation binder display.
- **11" × 17" Tabloid**: Large selection room tribute board & poster.

**Customization Capabilities**:
- **Customer-Specific Pricing**: Select a funeral home account to auto-apply their specific markup multiplier (e.g. `+140%`, `+150%`) or enter a custom price override.
- **Visual Themes**: Classic Burgundy, Slate Luxury Dark, Crisp Showroom White, Prestige Navy, and Warm Champagne.
- **Display Toggles**: Product photography, specifications, Batesville model SKU, funeral home branding/logo, craftsmanship features, and monthly financing estimates.
- **Print Fidelity**: CSS `@page` print media queries tailored for each physical dimension. Use browser Print (`Ctrl + P`) and select **Actual Size / 100% Scale**.

### 2. Sales Analytics (Monthly, Yearly & Year-over-Year)
- Multi-year comparative analytics (2023, 2024, 2025, 2026).
- **YoY Growth Rate (%)**: Automatic calculation of dollar differences and percentage changes month by month.
- **Interactive Visualizations**: Toggle between Gross Revenue ($) and Units Delivered.
- **Filters**: Filter by specific customer account, product line, or comparative year range.
- **Data Export**: One-click CSV export of YoY metrics.

### 3. Customer Breakdown
- Complete funeral home directory categorized by tier (Platinum, Gold, Silver, Standard).
- **Customer 360 View**: Contact information, location, account notes, and default showroom markup percentage.
- **Purchase History**: Multi-year volume breakdown and order logs.
- **One-Click Price Card Generation**: Quick action button to immediately generate cards for that specific funeral home.

### 4. Product Catalog & Performance
- Full Batesville merchandise catalog: Metal Caskets (18G, 20G, Bronze), Hardwood Caskets (Mahogany, Oak, Walnut, Cherry), Cremation & Urns, and Burial Vaults.
- Technical specifications: Material, interior fabric, exterior finish, dimensions, and weight.
- **Year-to-Year Product Breakdown**: Track historical performance and units delivered for every individual casket model over 2023–2026.

### 5. Supabase Integration & Portable Database
- **Portable Local Database**: Powered by client-side IndexedDB (`Dexie.js`). Works 100% offline out-of-the-box with pre-loaded Batesville sample data.
- **Supabase Cloud Sync**:
  1. Click **Connect Supabase** in the top navigation bar.
  2. Enter your **Supabase URL** and **Anon Key**.
  3. Run the generated SQL script located at `supabase/schema.sql` inside your Supabase SQL Editor.
  4. Click **Sync From Supabase** or **Push** to synchronize records between local and cloud databases.
- **Backup & Export**: Export the entire database anytime as a `.json` snapshot or restore from a previous backup file.
