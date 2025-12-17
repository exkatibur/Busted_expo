# Payments Setup Guide - Busted

Complete guide to setting up Stripe (Web) and RevenueCat (Mobile) payments for Busted.

## Overview

| Platform | Provider | Purpose |
|----------|----------|---------|
| Web | Stripe | Credit purchases via checkout |
| iOS | RevenueCat -> Apple IAP | In-app purchases |
| Android | RevenueCat -> Google Play | In-app purchases |

All payments add credits to the global `credits` table in Supabase.

---

## Prerequisites

1. Supabase project (already set up)
2. Stripe account
3. RevenueCat account
4. Apple Developer Account (for iOS)
5. Google Play Developer Account (for Android)

---

## Part 1: Database Setup

### 1. Run Migration

```bash
cd Apps/Busted

# Push migration to Supabase
supabase db push
```

This creates:
- `profiles` - Global user profiles
- `credits` - Credits per user per app
- `transactions` - Payment history
- `app_access` - App usage tracking

### 2. Verify Tables

Login to Supabase Dashboard -> Table Editor

Check that these tables exist:
- ✅ `public.profiles`
- ✅ `public.credits`
- ✅ `public.transactions`
- ✅ `public.app_access`

---

## Part 2: Stripe Setup (Web)

### 1. Create Stripe Account

1. Go to https://stripe.com
2. Sign up / Login
3. Create a new account for "Busted"

### 2. Get API Keys

1. Dashboard -> Developers -> API Keys
2. Copy:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

### 3. Create Products

1. Dashboard -> Products -> Add Product

**Product 1: 100 Credits**
- Name: `100 Credits`
- Price: `€4.99`
- Type: `One-time payment`
- Metadata:
  - `credits`: `100`
  - `app`: `busted`

**Product 2: 500 Credits**
- Name: `500 Credits`
- Price: `€19.99`
- Type: `One-time payment`
- Metadata:
  - `credits`: `500`
  - `app`: `busted`

**Product 3: 1000 Credits**
- Name: `1000 Credits`
- Price: `€34.99`
- Type: `One-time payment`
- Metadata:
  - `credits`: `1000`
  - `app`: `busted`

Copy each **Price ID** (starts with `price_...`)

### 4. Configure Environment Variables

Edit `app/.env`:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

EXPO_PUBLIC_STRIPE_PRICE_100=price_...
EXPO_PUBLIC_STRIPE_PRICE_500=price_...
EXPO_PUBLIC_STRIPE_PRICE_1000=price_...
```

### 5. Deploy Edge Functions

```bash
# Deploy Stripe checkout function
supabase functions deploy stripe-checkout

# Deploy Stripe webhook function
supabase functions deploy stripe-webhook

# Deploy Stripe verify function
supabase functions deploy stripe-verify
```

### 6. Set Edge Function Secrets

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Set webhook secret (see step 7)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 7. Configure Webhook

1. Stripe Dashboard -> Developers -> Webhooks
2. Add endpoint
3. URL: `https://[your-project-ref].supabase.co/functions/v1/stripe-webhook`
4. Events to send:
   - `checkout.session.completed`
5. Copy **Signing secret** (starts with `whsec_...`)
6. Update secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 8. Test Stripe

1. Start app: `npm run web`
2. Go to `/pricing`
3. Click "Buy Now"
4. Use test card: `4242 4242 4242 4242`
5. Check credits updated in Supabase

---

## Part 3: RevenueCat Setup (Mobile)

### 1. Create RevenueCat Account

1. Go to https://www.revenuecat.com
2. Sign up / Login
3. Create new project: "Busted"

### 2. Connect App Stores

**For iOS:**
1. RevenueCat Dashboard -> Apps -> Add App
2. Select "iOS"
3. Bundle ID: `com.exkatibur.busted` (or your bundle ID)
4. Connect to App Store Connect:
   - Go to App Store Connect
   - Users and Access -> Keys -> App Store Connect API
   - Create new key (name: "RevenueCat")
   - Download key (`.p8` file)
   - Upload to RevenueCat

**For Android:**
1. RevenueCat Dashboard -> Apps -> Add App
2. Select "Android"
3. Package name: `com.exkatibur.busted`
4. Connect to Google Play:
   - Go to Google Play Console
   - Setup -> API access
   - Create service account
   - Download JSON key
   - Upload to RevenueCat

### 3. Create Products in App Stores

**Apple App Store Connect:**

1. App Store Connect -> Your App -> In-App Purchases
2. Create 3 consumable products:

Product 1:
- Reference Name: `100 Credits`
- Product ID: `busted_credits_100`
- Price: `€4.99`

Product 2:
- Reference Name: `500 Credits`
- Product ID: `busted_credits_500`
- Price: `€19.99`

Product 3:
- Reference Name: `1000 Credits`
- Product ID: `busted_credits_1000`
- Price: `€34.99`

**Google Play Console:**

1. Google Play Console -> Your App -> Monetize -> Products -> In-app products
2. Create 3 products (same IDs as iOS):

Product 1:
- Product ID: `busted_credits_100`
- Name: `100 Credits`
- Price: `€4.99`

Product 2:
- Product ID: `busted_credits_500`
- Name: `500 Credits`
- Price: `€19.99`

Product 3:
- Product ID: `busted_credits_1000`
- Name: `1000 Credits`
- Price: `€34.99`

### 4. Configure Products in RevenueCat

1. RevenueCat Dashboard -> Products
2. Add Product for each:
   - Identifier: `busted_credits_100`, `busted_credits_500`, `busted_credits_1000`
   - Link to iOS Product ID
   - Link to Android Product ID

3. Create Offering:
   - Name: "Default"
   - Add all 3 products

### 5. Get API Keys

1. RevenueCat Dashboard -> Settings -> API Keys
2. Copy:
   - iOS API Key (starts with `appl_...`)
   - Android API Key (starts with `goog_...`)

### 6. Configure Environment Variables

Edit `app/.env`:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...
```

### 7. Deploy Webhook

```bash
# Deploy RevenueCat webhook function
supabase functions deploy revenuecat-webhook
```

### 8. Configure RevenueCat Webhook

1. RevenueCat Dashboard -> Integrations -> Webhooks
2. Add Webhook:
   - URL: `https://[your-project-ref].supabase.co/functions/v1/revenuecat-webhook`
   - Authorization Header: Create a secret token
3. Set webhook secret:

```bash
supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_secret_token
```

### 9. Test RevenueCat

**iOS:**
```bash
# Install RevenueCat
npm install react-native-purchases

# Build
eas build --platform ios --profile development

# Install on device
# Go to /pricing
# Test purchase (sandbox mode)
```

**Android:**
```bash
# Build
eas build --platform android --profile development

# Install on device
# Go to /pricing
# Test purchase
```

---

## Part 4: Usage in App

### Show Credits Balance

```tsx
import { CreditsDisplay } from '@/components/payments/CreditsDisplay';

<CreditsDisplay userId={user.id} />
```

### Use Credits for Feature

```tsx
import { useUseCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/types/payments';

const { mutateAsync: useCredits } = useUseCredits();

const unlockPremiumVibe = async () => {
  try {
    await useCredits({
      userId: user.id,
      amount: FEATURE_COSTS.PREMIUM_VIBE,
      description: 'Unlocked Premium Vibe'
    });

    // Feature unlocked!
  } catch (error) {
    // Not enough credits
    router.push('/pricing');
  }
};
```

### Navigate to Pricing

```tsx
import { router } from 'expo-router';

router.push('/pricing');
```

---

## Testing

### Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

### RevenueCat Sandbox

- iOS: Automatic sandbox mode with test Apple ID
- Android: Use test account in Google Play Console

### Verify Credits

After purchase, check in Supabase:

```sql
SELECT * FROM credits WHERE user_id = 'user-id' AND app = 'busted';
SELECT * FROM transactions WHERE user_id = 'user-id' AND app = 'busted';
```

---

## Production Checklist

Before going live:

### Stripe
- [ ] Switch to live mode API keys
- [ ] Update webhook URL to production
- [ ] Test live payment (small amount)
- [ ] Set up payout schedule

### RevenueCat
- [ ] Submit app for review (iOS)
- [ ] Publish app (Android)
- [ ] Test with real purchases
- [ ] Set up revenue notifications

### General
- [ ] Update environment variables to production
- [ ] Test full flow: purchase -> webhook -> credits added
- [ ] Set up error monitoring (Sentry)
- [ ] Test refund flow

---

## Troubleshooting

### Stripe Webhook Not Working

1. Check webhook secret is correct:
```bash
supabase secrets list
```

2. Check Edge Function logs:
```bash
supabase functions logs stripe-webhook
```

3. Test webhook in Stripe Dashboard -> Webhooks -> Test

### RevenueCat Webhook Not Working

1. Check webhook URL is correct
2. Check authorization header matches secret
3. Check logs:
```bash
supabase functions logs revenuecat-webhook
```

### Credits Not Added

1. Check transaction was logged:
```sql
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
```

2. Check RLS policies allow insert:
```sql
-- Should return rows
SELECT * FROM credits WHERE user_id = 'test-user' AND app = 'busted';
```

3. Check Edge Function has service role key:
```bash
# Service role key should be available by default
supabase secrets list
```

### Mobile: RevenueCat Not Initializing

1. Check API keys are correct in `.env`
2. Check bundle ID matches RevenueCat dashboard
3. Check app is configured in App Store Connect / Play Console
4. Rebuild app after changing config

---

## Cost Comparison

For a €10 purchase:

| Platform | Fees | You Get |
|----------|------|---------|
| Stripe (Web) | ~€0.60 (6%) | ~€9.40 |
| Apple (iOS) | ~€3.00 (30%) | ~€7.00 |
| Google (Android) | ~€1.50 (15%) | ~€8.50 |

**Tip:** Encourage users to buy via web for better value!

---

## Support

For issues:
- Stripe: https://support.stripe.com
- RevenueCat: https://community.revenuecat.com
- Supabase: https://supabase.com/docs
