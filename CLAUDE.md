@AGENTS.md

# Mobile Shop Inventory App

## Project Purpose
Expo v54 React Native app for a mobile accessories shopkeeper to manage inventory, purchases, sales, and view profit/loss reports. Single user now; multi-user architecture from day one.

## Stack
- **Framework:** Expo v54 + Expo Router (file-based routing)
- **Backend:** Supabase Cloud (PostgreSQL + Auth + RLS)
- **API:** @supabase/supabase-js + TanStack Query + axios
- **State:** Zustand (auth-store, ui-store)
- **Forms:** React Hook Form + Zod
- **Charts:** Victory Native
- **Lists:** @shopify/flash-list
- **Font:** Montserrat only (@expo-google-fonts/montserrat)
- **Barcode:** expo-camera
- **Date:** date-fns

## Design Rules
- **All design tokens** (colors, font sizes, spacing, radii) live in `constants/theme.ts`. Never hardcode them.
- **All text** uses `ThemedText` with a `type` prop mapping to the Montserrat typography scale.
- **Theme:** Futuristic light. Primary #00B4E6, accent #00F5FF, bg #F4F8FB, cards #FFFFFF.
- Font weights loaded: 300, 400, 500, 600, 700, 800.

## Architecture Rules
- **Every DB table** must have both `user_id` (auth.users.id) and `tenant_id` (from profiles.tenant_id).
- **Always use Supabase RPC** `record_purchase` and `record_sale` — never raw inserts for stock-affecting operations.
- **API calls** live in `api/` directory, one file per domain. They are called only via TanStack Query hooks.
- **Query keys** come from `constants/query-keys.ts` (QK factory). Always invalidate related keys after mutations.
- **Auth guard** lives in `app/(app)/_layout.tsx`. Reads Zustand auth-store. Redirects to `(auth)/login` if no session.
- **Soft delete** products via `deleted_at` timestamp; never hard delete.
- FIFO cost allocation: sales pull cost from oldest purchase_batches first via `sale_batch_lines`.

## Key File Locations
- Design tokens: `constants/theme.ts`
- Query keys: `constants/query-keys.ts`
- Supabase client: `lib/supabase.ts`
- API layer: `api/` (products, sales, purchases, reports, auth, categories)
- Zustand stores: `store/auth-store.ts`, `store/ui-store.ts`
- DB types: `types/database.ts` (generated), `types/app.ts` (manual)

## Business Logic
- **Purchase:** records cost_price + selling_price per batch; increments `products.current_stock`
- **Sale:** validates qty ≤ current_stock; FIFO cost snapshot; decrements `products.current_stock`
- **Low-stock alert:** when `current_stock ≤ reorder_point`
- **Profit:** `gross_profit = total_revenue - total_cost` (computed via GENERATED columns in DB)

## File & Folder Conventions
- **All files and folders: kebab-case** (e.g., `product-card.tsx`, `add-sale.tsx`, `kpi-row.tsx`)
- **`views/` folder:** Each screen has its own subfolder (e.g., `views/dashboard/`). Each subfolder has `index.tsx` as the screen entry point. Feature-specific components used only by that screen live inside that folder.
- **`components/ui/`:** Shared reusable components only — used across multiple screens.
- Do NOT put feature-specific components in `components/ui/`.

```
views/
  dashboard/
    index.tsx          ← screen entry point
    kpi-row.tsx        ← dashboard-only component
    sparkline-card.tsx
    low-stock-list.tsx
  inventory/
    index.tsx
    product-card.tsx
    inventory-filters.tsx
  add-sale/
    index.tsx
    sale-form.tsx
  add-purchase/
    index.tsx
    purchase-form.tsx
  ...

components/ui/
  button.tsx, input.tsx, badge.tsx, search-bar.tsx  ← shared across screens
```

## Screens (Expo Router)
```
app/
  (auth)/login.tsx
  (app)/
    (tabs)/dashboard/index.tsx, inventory/index.tsx, sales/index.tsx, reports/index.tsx, settings/index.tsx
    add-sale.tsx, add-purchase.tsx, add-product.tsx (modals)
    edit-product/[id].tsx (modal)
    purchases/index.tsx
```
