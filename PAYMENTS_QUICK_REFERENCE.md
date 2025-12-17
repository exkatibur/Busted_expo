# Payments Quick Reference - Exkatibur

Schnellreferenz für das Payment-System aller Exkatibur Apps.

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    EIN Stripe Account                           │
│                       "Exkatibur"                               │
├─────────────────────────────────────────────────────────────────┤
│  Products:                                                      │
│  ├── Busted Party Pass    (metadata: app=busted)               │
│  ├── Busted Premium       (metadata: app=busted)               │
│  ├── TidySnap Pro         (metadata: app=tidysnap)  [später]   │
│  └── ...weitere Apps                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EIN Supabase Project                         │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions:                                                │
│  ├── stripe-checkout    (erstellt Checkout Session)            │
│  ├── stripe-webhook     (empfängt Zahlungsbestätigungen)       │
│  └── stripe-verify      (prüft Session nach Redirect)          │
├─────────────────────────────────────────────────────────────────┤
│  Database:                                                      │
│  └── busted_subscriptions (mit app-Spalte für Multi-App)       │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Busted App (.env)

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe (gleiche Keys für alle Apps!)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Busted-spezifische Price IDs
EXPO_PUBLIC_STRIPE_PARTY_PASS_PRICE=price_xxx
EXPO_PUBLIC_STRIPE_PREMIUM_PRICE=price_yyy

# RevenueCat (pro App unterschiedlich)
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxx
```

### Supabase Secrets

```bash
STRIPE_SECRET_KEY=sk_test_...        # Gleich für alle Apps
STRIPE_WEBHOOK_SECRET=whsec_...      # Ein Webhook für alle Apps
REVENUECAT_WEBHOOK_SECRET=xxx        # Ein Webhook für alle Apps
```

## Stripe Products Setup

### In Stripe Dashboard erstellen:

| Product | Price | Metadata |
|---------|-------|----------|
| Busted Party Pass | €1,99 | `app: busted`, `plan: party_pass`, `duration: 24h` |
| Busted Premium | €2,99/mo | `app: busted`, `plan: premium`, `duration: month` |

**Wichtig:** Die `app` Metadata wird vom Webhook genutzt, um die richtige Datenbank-Tabelle zu finden!

## Code-Struktur

```
app/
├── types/payments.ts          # APP_NAME = 'busted'
├── lib/payments/
│   ├── stripe.ts              # Stripe Web Integration
│   └── revenuecat.ts          # RevenueCat Mobile
├── hooks/
│   ├── usePayments.ts         # Payment Logic
│   └── usePremium.ts          # Subscription Status
├── app/pricing.tsx            # Pricing Page
└── app/payment/success.tsx    # Success Redirect
```

## Flow: Web Payment (Stripe)

```
1. User klickt "Kaufen" auf /pricing
   │
2. usePayments.purchasePlan() aufgerufen
   │
3. stripe.createCheckoutSession()
   → POST /functions/v1/stripe-checkout
   → Returns checkout URL
   │
4. Redirect zu Stripe Checkout
   │
5. User zahlt
   │
6. Stripe sendet Webhook
   → POST /functions/v1/stripe-webhook
   → Liest metadata.app ('busted')
   → INSERT INTO busted_subscriptions
   │
7. Redirect zu /payment/success
   → stripe.verifyCheckoutSession()
   │
8. usePremium() zeigt neuen Status
```

## Commands

```bash
# Functions deployen
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy stripe-verify

# Secrets setzen
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Logs checken
supabase functions logs stripe-webhook --tail

# Lokal testen
supabase functions serve --env-file .env.local
```

## Test Cards

```
Erfolg:      4242 4242 4242 4242
Abgelehnt:   4000 0000 0000 0002
3D Secure:   4000 0027 6000 3184
```

## Database Queries

```sql
-- Aktive Subscriptions für User
SELECT * FROM busted_subscriptions
WHERE user_id = 'xxx'
  AND app = 'busted'
  AND status = 'active'
  AND expires_at > NOW();

-- Alle Subscriptions (Multi-App)
SELECT app, plan, COUNT(*)
FROM busted_subscriptions
WHERE status = 'active'
GROUP BY app, plan;
```

## Neue App hinzufügen

1. **Stripe:** Neue Products mit `app: neueapp` Metadata
2. **Code:** `APP_NAME = 'neueapp'` in types/payments.ts
3. **Webhook:** Prüft automatisch die `app` Metadata
4. **Database:** Nutzt dieselbe Tabelle mit `app`-Filter

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| "Stripe not available" | Check `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Webhook 400 Error | Check `STRIPE_WEBHOOK_SECRET` |
| Subscription nicht gespeichert | Check Metadata hat `app: busted` |
| RevenueCat nicht initialisiert | Check API Keys + Bundle ID |
