# Payment Setup - BUSTED! Subscription Model

## Übersicht

BUSTED! verwendet ein einfaches Subscription-Modell:

| Plan | Preis | Dauer | Features |
|------|-------|-------|----------|
| **Party Pass** | €1,99 | 24 Stunden | KI-Fragen, Spicy Vibe, Premium Vibes |
| **Premium** | €2,99/Mo | Monatlich | Alles + Fragen speichern + Werbefrei |

---

## 1. Supabase Migration ausführen

Die neue Migration muss in Supabase ausgeführt werden:

```bash
# Option A: Via Supabase CLI
cd Apps/Busted
supabase db push

# Option B: Manuell im Supabase Dashboard
# SQL Editor → Paste content of:
# supabase/migrations/011_create_busted_subscriptions.sql
```

### Was die Migration erstellt:
- `busted_subscriptions` - Tabelle für User Subscription-Status
- `busted_payments` - Tabelle für Payment History
- `busted_activate_subscription()` - Function zum Aktivieren
- `busted_check_subscription()` - Function zum Status prüfen

---

## 2. Stripe Setup (Web)

### 2.1 Produkte erstellen

Im [Stripe Dashboard](https://dashboard.stripe.com/products):

#### Party Pass (Einmalzahlung)
1. **Create Product** → Name: "BUSTED! Party Pass"
2. **Pricing**: €1,99 (One-time)
3. **Metadata** hinzufügen:
   - `plan_id`: `party_pass`
   - `app`: `busted`
4. **Price ID** kopieren (z.B. `price_xxx`)

#### Premium (Subscription)
1. **Create Product** → Name: "BUSTED! Premium"
2. **Pricing**: €2,99/month (Recurring)
3. **Metadata** hinzufügen:
   - `plan_id`: `premium`
   - `app`: `busted`
4. **Price ID** kopieren (z.B. `price_yyy`)

### 2.2 Webhook einrichten

Im [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

1. **Add Endpoint**
2. **URL**: `https://YOUR_SUPABASE_URL/functions/v1/stripe-webhook`
3. **Events** auswählen:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
4. **Signing Secret** kopieren

### 2.3 Environment Variables

```bash
# In Supabase Dashboard → Edge Functions → Secrets:
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# In Apps/Busted/app/.env:
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EXPO_PUBLIC_STRIPE_PARTY_PASS_PRICE=price_xxx
EXPO_PUBLIC_STRIPE_PREMIUM_PRICE=price_yyy
```

---

## 3. RevenueCat Setup (iOS/Android)

### 3.1 Produkte in App Stores erstellen

#### Apple App Store Connect
1. **My Apps** → BUSTED! → **In-App Purchases**
2. Erstelle **Non-Consumable** für Party Pass:
   - Product ID: `busted_party_pass`
   - Reference Name: "Party Pass 24h"
   - Price: €1,99
3. Erstelle **Auto-Renewable Subscription** für Premium:
   - Product ID: `busted_premium_monthly`
   - Reference Name: "Premium Monthly"
   - Price: €2,99/month

#### Google Play Console
1. **Monetization** → **Products** → **In-app products**
2. Erstelle für Party Pass:
   - Product ID: `busted_party_pass`
   - Price: €1,99
3. **Subscriptions** → Erstelle für Premium:
   - Product ID: `busted_premium_monthly`
   - Price: €2,99/month

### 3.2 RevenueCat Dashboard

Im [RevenueCat Dashboard](https://app.revenuecat.com):

1. **Project Settings** → App erstellen (iOS & Android)
2. **Products** → App Store/Play Store Produkte verknüpfen
3. **Entitlements** erstellen:
   - `party_pass` → `busted_party_pass` verknüpfen
   - `premium` → `busted_premium_monthly` verknüpfen
4. **Offerings** → Default Offering mit beiden Produkten

### 3.3 Webhook einrichten

1. **Project Settings** → **Webhooks**
2. **Add Webhook**:
   - URL: `https://YOUR_SUPABASE_URL/functions/v1/revenuecat-webhook`
   - Authorization: Bearer Token erstellen
3. Events auswählen:
   - `INITIAL_PURCHASE`
   - `RENEWAL`
   - `CANCELLATION`
   - `EXPIRATION`

### 3.4 Environment Variables

```bash
# In Supabase Dashboard → Edge Functions → Secrets:
REVENUECAT_WEBHOOK_SECRET=your_bearer_token

# In Apps/Busted/app/.env:
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxx
```

---

## 4. OpenAI Setup (KI-Fragen)

Die KI-Fragengenerierung erfordert einen OpenAI API Key.

### 4.1 API Key erstellen

1. Auf [platform.openai.com](https://platform.openai.com) einloggen
2. **API Keys** → **Create new secret key**
3. Key kopieren (beginnt mit `sk-`)

### 4.2 Supabase Secret setzen

```bash
# Via Supabase CLI
supabase secrets set OPENAI_API_KEY=sk-xxx

# Oder im Dashboard:
# Edge Functions → Secrets → Add new secret
```

### 4.3 Migration ausführen

```bash
# Die Custom Questions Tabelle erstellen
# supabase/migrations/012_create_busted_custom_questions.sql

supabase db push
# Oder manuell im SQL Editor einfügen
```

---

## 5. Edge Functions deployen

```bash
cd Apps/Busted

# Alle Functions deployen
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy stripe-verify
supabase functions deploy revenuecat-webhook
supabase functions deploy generate-questions    # KI-Fragen
```

---

## 6. Testen

### Web (Stripe)
1. Stripe Test-Modus aktivieren (Dashboard → Developers → Test mode)
2. Test-Karten verwenden:
   - Erfolg: `4242 4242 4242 4242`
   - Ablehnung: `4000 0000 0000 0002`

### Mobile (RevenueCat)
1. RevenueCat Sandbox-Modus
2. Apple Sandbox Account / Google Test Account verwenden

### Webhook testen
```bash
# Stripe CLI für lokales Testen
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

---

## 7. Checkliste

### Stripe (Web)
- [ ] Party Pass Produkt erstellt (€1,99 one-time)
- [ ] Premium Produkt erstellt (€2,99/month subscription)
- [ ] Webhook eingerichtet
- [ ] Environment Variables gesetzt
- [ ] Edge Functions deployed
- [ ] Test-Kauf erfolgreich

### RevenueCat (Mobile)
- [ ] App Store Connect Produkte erstellt
- [ ] Play Store Produkte erstellt
- [ ] RevenueCat Entitlements konfiguriert
- [ ] Webhook eingerichtet
- [ ] Environment Variables gesetzt
- [ ] Sandbox-Test erfolgreich

### Supabase
- [ ] Migration 011 ausgeführt (Subscriptions)
- [ ] Migration 012 ausgeführt (Custom Questions)
- [ ] RLS Policies aktiv
- [ ] Realtime für `busted_subscriptions` aktiviert

### OpenAI (KI-Fragen)
- [ ] OpenAI API Key erstellt
- [ ] OPENAI_API_KEY Secret gesetzt
- [ ] generate-questions Function deployed
- [ ] Test-Generierung erfolgreich

---

## Fehlerbehebung

### "Payment not available"
- Environment Variables prüfen
- Stripe Publishable Key korrekt?

### Webhook schlägt fehl
- Supabase Logs prüfen: `supabase functions logs stripe-webhook`
- Webhook Secret korrekt?
- Function deployed?

### Subscription wird nicht aktiviert
- Supabase Logs prüfen
- User ID in Metadata vorhanden?
- `busted_activate_subscription` Function existiert?

---

## Dateien Übersicht

```
Apps/Busted/
├── app/
│   ├── hooks/
│   │   ├── usePremium.ts      # Subscription Status Hook
│   │   └── usePayments.ts     # Payment Flow Hook
│   ├── lib/payments/
│   │   ├── stripe.ts          # Stripe Integration (Web)
│   │   └── revenuecat.ts      # RevenueCat Integration (Mobile)
│   ├── services/
│   │   └── aiQuestionService.ts # KI-Fragen Service
│   ├── types/
│   │   └── payments.ts        # Subscription Types & Plans
│   ├── components/
│   │   ├── payments/
│   │   │   └── SubscriptionBadge.tsx
│   │   └── ui/
│   │       └── AIQuestionGenerator.tsx  # KI-Fragen Modal
│   └── app/
│       └── pricing.tsx        # Pricing Page
└── supabase/
    ├── migrations/
    │   ├── 011_create_busted_subscriptions.sql
    │   └── 012_create_busted_custom_questions.sql
    └── functions/
        ├── stripe-checkout/   # Creates Checkout Session
        ├── stripe-webhook/    # Handles Stripe Events
        ├── stripe-verify/     # Verifies Payment Success
        ├── revenuecat-webhook/ # Handles RevenueCat Events
        └── generate-questions/ # KI-Fragen generieren
```
