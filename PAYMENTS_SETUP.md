# Payments Setup Guide - Exkatibur Apps

Complete guide to setting up Stripe (Web) and RevenueCat (Mobile) payments for all Exkatibur apps.

## Overview

**Ein Stripe/RevenueCat Account für alle Apps!**

```
Stripe Account (Exkatibur)
├── Produkte für Busted
│   ├── Party Pass (€1,99)
│   └── Premium Monat (€2,99)
├── Produkte für TidySnap (später)
│   └── ...
└── Produkte für weitere Apps...
```

| Platform | Provider | Purpose |
|----------|----------|---------|
| Web | Stripe | Subscriptions via Checkout |
| iOS | RevenueCat -> Apple IAP | In-App Purchases |
| Android | RevenueCat -> Google Play | In-App Purchases |

Alle Zahlungen werden in einer zentralen Supabase-Datenbank gespeichert, mit `app`-Spalte zur Unterscheidung.

---

## Prerequisites

1. Supabase project (bereits eingerichtet)
2. **Ein** Stripe Account (für alle Apps)
3. **Ein** RevenueCat Account (für alle Apps)
4. Apple Developer Account (für iOS)
5. Google Play Developer Account (für Android)

---

## Part 1: Stripe Account Setup (Einmalig)

### 1. Create Stripe Account

1. Go to https://stripe.com
2. Sign up with your Exkatibur business email
3. Account name: **"Exkatibur"** (nicht pro App!)

### 2. Get API Keys

1. Dashboard -> Developers -> API Keys
2. Copy:
   - **Publishable key** (starts with `pk_test_...` / `pk_live_...`)
   - **Secret key** (starts with `sk_test_...` / `sk_live_...`)

**Diese Keys gelten für ALLE Apps!**

---

## Part 2: Stripe Products für Busted

### 1. Create Products

Dashboard -> Products -> Add Product

**WICHTIG:** Verwende Metadata `app: busted` um Produkte zuzuordnen!

**Product 1: Party Pass**
- Name: `Busted Party Pass`
- Price: `€1,99` (One-time)
- Metadata:
  - `app`: `busted`
  - `plan`: `party_pass`
  - `duration`: `24h`

**Product 2: Premium**
- Name: `Busted Premium`
- Price: `€2,99` (Recurring monthly)
- Metadata:
  - `app`: `busted`
  - `plan`: `premium`
  - `duration`: `month`

### 2. Copy Price IDs

Nach dem Erstellen, kopiere die **Price IDs** (starts with `price_...`):
- Party Pass: `price_xxx...`
- Premium: `price_yyy...`

### 3. Configure Environment Variables

Edit `Apps/Busted/app/.env`:

```bash
# Stripe (same keys for all apps)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Busted-specific Price IDs
EXPO_PUBLIC_STRIPE_PARTY_PASS_PRICE=price_xxx...
EXPO_PUBLIC_STRIPE_PREMIUM_PRICE=price_yyy...
```

---

## Part 3: Database Setup

### 1. Run Migrations

Die Migrationen erstellen eine **zentrale** Payment-Struktur:

```bash
cd Apps/Busted

# Falls noch nicht geschehen
# Migration 010 & 011 in Supabase SQL Editor ausführen
```

### 2. Tabellen-Struktur

```sql
-- Zentrale Subscription-Tabelle (für alle Apps)
busted_subscriptions (
  id UUID,
  user_id TEXT,
  plan TEXT,           -- 'party_pass' oder 'premium'
  status TEXT,         -- 'active', 'expired', 'cancelled'
  expires_at TIMESTAMP,
  provider TEXT,       -- 'stripe' oder 'revenuecat'
  provider_id TEXT,    -- Stripe Session ID oder RevenueCat Transaction ID
  app TEXT DEFAULT 'busted',  -- App-Identifier
  created_at TIMESTAMP
)
```

---

## Part 4: Edge Functions

### 1. Deploy Functions

```bash
# Supabase CLI installieren (falls noch nicht)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all payment functions
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy stripe-verify
supabase functions deploy revenuecat-webhook
```

### 2. Set Secrets

```bash
# Stripe Secret Key (same for all apps)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Webhook Secret (from Stripe Dashboard)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat Webhook Secret
supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_secret_token
```

### 3. Configure Stripe Webhook

1. Stripe Dashboard -> Developers -> Webhooks
2. Add endpoint:
   - URL: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy **Signing secret** -> update `STRIPE_WEBHOOK_SECRET`

**Ein Webhook für alle Apps!** Die Edge Function unterscheidet anhand der Metadata.

---

## Part 5: RevenueCat Setup (Mobile)

### 1. Create RevenueCat Account

1. Go to https://www.revenuecat.com
2. Sign up with Exkatibur email
3. Create project: **"Exkatibur"** (nicht pro App!)

### 2. Add App: Busted iOS

1. Dashboard -> Apps -> Add App
2. Platform: iOS
3. Bundle ID: `com.exkatibur.busted`
4. App Name: `Busted`

### 3. Add App: Busted Android

1. Dashboard -> Apps -> Add App
2. Platform: Android
3. Package Name: `com.exkatibur.busted`
4. App Name: `Busted`

### 4. Create Products in App Stores

**Apple App Store Connect:**

1. App Store Connect -> Busted -> In-App Purchases
2. Create:
   - `busted_party_pass` - Consumable, €1,99
   - `busted_premium_monthly` - Auto-Renewable Subscription, €2,99/month

**Google Play Console:**

1. Play Console -> Busted -> Monetize -> Products
2. Create:
   - `busted_party_pass` - One-time product, €1,99
   - `busted_premium_monthly` - Subscription, €2,99/month

### 5. Link Products in RevenueCat

1. RevenueCat Dashboard -> Products
2. Add products and link to store products
3. Create Entitlements:
   - `busted_premium` -> linked to premium products
   - `busted_party_pass` -> linked to party pass products

### 6. Get API Keys

RevenueCat Dashboard -> Project Settings -> API Keys:
- iOS: `appl_xxx...`
- Android: `goog_xxx...`

### 7. Configure Environment

Edit `Apps/Busted/app/.env`:

```bash
# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxx...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxx...
```

### 8. Configure RevenueCat Webhook

1. RevenueCat Dashboard -> Integrations -> Webhooks
2. Add:
   - URL: `https://[project-ref].supabase.co/functions/v1/revenuecat-webhook`
   - Auth Header: `Bearer YOUR_SECRET_TOKEN`

---

## Part 6: Adding Another App (z.B. TidySnap)

### Stripe Products

1. Stripe Dashboard -> Products -> Add Product
2. Name: `TidySnap Pro`
3. Metadata:
   - `app`: `tidysnap`  ← Andere App!
   - `plan`: `pro`
4. Price ID in TidySnap's `.env` eintragen

### RevenueCat

1. Add new Apps in RevenueCat (iOS + Android für TidySnap)
2. Create products with prefix `tidysnap_`
3. Separate API Keys pro App (normale RevenueCat Struktur)

### Database

Die `busted_subscriptions` Tabelle hat eine `app` Spalte - für neue Apps entweder:
- Dieselbe Tabelle nutzen (umbenennen zu `subscriptions`)
- Oder eigene Tabelle pro App erstellen

---

## Testing

### Stripe Test Cards

```
Success:     4242 4242 4242 4242
Decline:     4000 0000 0000 0002
3D Secure:   4000 0027 6000 3184
```

### Test Flow

1. Start app: `npx expo start --web`
2. Go to pricing page
3. Select plan -> Stripe Checkout opens
4. Use test card
5. Redirect to success page
6. Check `busted_subscriptions` table in Supabase

---

## Production Checklist

### Stripe
- [ ] Switch to **live** API keys (`pk_live_...`, `sk_live_...`)
- [ ] Update webhook to production endpoint
- [ ] Create live products (copy from test)
- [ ] Test with real €1 payment
- [ ] Set up payout schedule

### RevenueCat
- [ ] App approved in App Store / Play Store
- [ ] Products approved and active
- [ ] Test sandbox purchases
- [ ] Test real purchase

### Environment
- [ ] Update all `.env` files to production values
- [ ] Update Supabase secrets
- [ ] Test full flow end-to-end

---

## Troubleshooting

### "Stripe configuration missing"

Check `.env` file has:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Webhook not working

1. Check URL is correct in Stripe Dashboard
2. Check signing secret matches:
   ```bash
   supabase secrets list
   ```
3. Check Edge Function logs:
   ```bash
   supabase functions logs stripe-webhook
   ```

### Subscription not appearing

1. Check webhook received (Stripe Dashboard -> Webhooks -> Events)
2. Check Edge Function logs for errors
3. Verify metadata contains `app: busted`

---

## Cost Summary

| Platform | Fee | €10 Purchase → You Get |
|----------|-----|------------------------|
| Stripe (Web) | ~3% + €0.25 | ~€9.45 |
| Apple (iOS) | 15-30% | €7.00 - €8.50 |
| Google (Android) | 15% | ~€8.50 |

**Tip:** Web-Käufe sind günstiger - ermutige User, über Web zu kaufen!

---

## Quick Reference

```bash
# Deploy functions
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Check logs
supabase functions logs stripe-webhook --tail

# Test locally
supabase functions serve stripe-webhook --env-file .env.local
```
