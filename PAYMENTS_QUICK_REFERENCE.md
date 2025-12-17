# Payments Quick Reference

Quick guide for using the payment system in Busted.

---

## Show Credits in UI

```tsx
import { CreditsDisplay } from '@/components/payments';

// Full display with buy button
<CreditsDisplay userId={user.id} />

// Compact display (badge only)
<CreditsDisplay userId={user.id} compact showBuyButton={false} />
```

---

## Check Credits Balance

```tsx
import { useCredits, useHasCredits } from '@/hooks/useCredits';

// Get balance
const { data: balance, isLoading } = useCredits(user?.id);

// Check if user has enough credits
const hasEnoughCredits = useHasCredits(user?.id, 50);

if (!hasEnoughCredits) {
  router.push('/pricing');
}
```

---

## Use Credits

```tsx
import { useUseCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/types/payments';

const { mutateAsync: useCredits, isPending } = useUseCredits();

const unlockFeature = async () => {
  try {
    const success = await useCredits({
      userId: user.id,
      amount: FEATURE_COSTS.PREMIUM_VIBE,
      description: 'Unlocked Premium Vibe: Party Hard'
    });

    if (success) {
      // Feature unlocked!
      console.log('Feature unlocked');
    }
  } catch (error) {
    // Not enough credits
    Alert.alert('Not Enough Credits', 'Buy more credits to unlock this feature');
    router.push('/pricing');
  }
};
```

---

## Navigate to Pricing

```tsx
import { router } from 'expo-router';

router.push('/pricing');
```

---

## Feature Costs

```tsx
import { FEATURE_COSTS } from '@/types/payments';

FEATURE_COSTS.PREMIUM_VIBE              // 50 credits
FEATURE_COSTS.AI_QUESTION_GENERATION    // 10 credits per question
FEATURE_COSTS.AI_QUESTION_BATCH         // 100 credits (20 questions)
FEATURE_COSTS.SAVE_CUSTOM_QUESTION      // 5 credits
FEATURE_COSTS.UNLIMITED_CUSTOM_QUESTIONS // 200 credits (one-time)
FEATURE_COSTS.AD_FREE_24H               // 20 credits
FEATURE_COSTS.AD_FREE_7D                // 50 credits
FEATURE_COSTS.AD_FREE_30D               // 150 credits
FEATURE_COSTS.AD_FREE_FOREVER           // 500 credits
```

---

## Purchase Flow

```tsx
import { usePayments } from '@/hooks/usePayments';
import { CREDIT_PACKAGES } from '@/types/payments';

const { purchaseCredits, paymentState } = usePayments(user?.id);

const handleBuyCredits = async () => {
  const package = CREDIT_PACKAGES[1]; // 500 credits
  await purchaseCredits(package);

  // Web: User is redirected to Stripe
  // Mobile: Purchase dialog opens
};

// Check payment status
if (paymentState.status === 'success') {
  console.log('Purchase successful!');
}
```

---

## Restore Purchases (Mobile Only)

```tsx
import { usePayments } from '@/hooks/usePayments';

const { restoreCredits } = usePayments(user?.id);

const handleRestore = async () => {
  await restoreCredits();
  Alert.alert('Success', 'Purchases restored');
};
```

---

## Transaction History

```tsx
import { useTransactions } from '@/hooks/useCredits';

const { data: transactions, isLoading } = useTransactions(user?.id);

transactions?.map(tx => (
  <View key={tx.id}>
    <Text>{tx.description}</Text>
    <Text>{tx.amount > 0 ? '+' : ''}{tx.amount} credits</Text>
    <Text>{new Date(tx.created_at).toLocaleDateString()}</Text>
  </View>
));
```

---

## Realtime Credits Updates

```tsx
import { useCreditsSubscription } from '@/hooks/useCredits';

// Subscribe to credits changes
useCreditsSubscription(user?.id);

// Credits will auto-update when changed (e.g., after purchase)
```

---

## Check Platform & Payment Method

```tsx
import { usePayments } from '@/hooks/usePayments';

const { availablePaymentMethod } = usePayments(user?.id);

if (availablePaymentMethod === 'stripe') {
  // Web - Stripe checkout
}

if (availablePaymentMethod === 'revenuecat') {
  // Mobile - In-app purchase
}

if (!availablePaymentMethod) {
  // Payment not available
}
```

---

## Example: Premium Question Category

```tsx
import { useState } from 'react';
import { useUseCredits, useHasCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/types/payments';

const PremiumVibeCard = ({ vibe, userId }) => {
  const [unlocked, setUnlocked] = useState(false);
  const { mutateAsync: useCredits } = useUseCredits();
  const hasEnoughCredits = useHasCredits(userId, FEATURE_COSTS.PREMIUM_VIBE);

  const handleUnlock = async () => {
    if (!hasEnoughCredits) {
      Alert.alert('Not Enough Credits', 'Buy more credits to unlock');
      router.push('/pricing');
      return;
    }

    try {
      await useCredits({
        userId,
        amount: FEATURE_COSTS.PREMIUM_VIBE,
        description: `Unlocked Premium Vibe: ${vibe.name}`
      });

      setUnlocked(true);
      Alert.alert('Unlocked!', `${vibe.name} is now available`);
    } catch (error) {
      Alert.alert('Error', 'Failed to unlock. Please try again.');
    }
  };

  return (
    <TouchableOpacity onPress={handleUnlock} disabled={unlocked}>
      <Text>{vibe.name}</Text>
      {!unlocked && (
        <Text>Unlock for {FEATURE_COSTS.PREMIUM_VIBE} credits</Text>
      )}
    </TouchableOpacity>
  );
};
```

---

## Example: AI Question Generation

```tsx
import { useUseCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/types/payments';

const GenerateAIQuestions = ({ userId, count = 1 }) => {
  const { mutateAsync: useCredits } = useUseCredits();

  const generateQuestions = async () => {
    const cost = count === 1
      ? FEATURE_COSTS.AI_QUESTION_GENERATION
      : FEATURE_COSTS.AI_QUESTION_BATCH;

    try {
      await useCredits({
        userId,
        amount: cost,
        description: `Generated ${count} AI questions`
      });

      // Call AI API to generate questions
      const questions = await generateWithAI(count);

      return questions;
    } catch (error) {
      router.push('/pricing');
    }
  };

  return (
    <TouchableOpacity onPress={generateQuestions}>
      <Text>Generate {count} AI Questions</Text>
      <Text>{cost} credits</Text>
    </TouchableOpacity>
  );
};
```

---

## Database Queries (Backend/Edge Functions only)

```typescript
// Add credits (webhook)
await supabase.rpc('add_credits', {
  p_user_id: userId,
  p_app: 'busted',
  p_amount: 500,
  p_source: 'stripe',
  p_external_id: 'ch_1234',
  p_price_cents: 1999,
  p_description: 'Purchased 500 credits'
});

// Use credits
const { data: success } = await supabase.rpc('use_credits', {
  p_user_id: userId,
  p_app: 'busted',
  p_amount: 50,
  p_description: 'Unlocked Premium Vibe'
});

// Get balance
const { data: balance } = await supabase.rpc('get_or_create_credits', {
  p_user_id: userId,
  p_app: 'busted'
});
```

---

## Environment Variables

```bash
# Stripe (Web)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_STRIPE_PRICE_100=price_...
EXPO_PUBLIC_STRIPE_PRICE_500=price_...
EXPO_PUBLIC_STRIPE_PRICE_1000=price_...

# RevenueCat (Mobile)
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...
```

---

## File Structure

```
app/
├── types/
│   └── payments.ts               # Payment types & constants
├── lib/
│   └── payments/
│       ├── stripe.ts             # Stripe integration
│       └── revenuecat.ts         # RevenueCat integration
├── hooks/
│   ├── useCredits.ts             # Credits management
│   └── usePayments.ts            # Purchase flow
├── components/
│   └── payments/
│       ├── CreditsDisplay.tsx    # Credits badge
│       ├── CreditPackageCard.tsx # Package card
│       └── index.ts              # Exports
└── app/
    ├── pricing.tsx               # Pricing page
    └── payment/
        └── success.tsx           # Success page (web)

supabase/
├── migrations/
│   └── 010_create_global_payment_tables.sql
└── functions/
    ├── stripe-checkout/          # Create checkout session
    ├── stripe-webhook/           # Handle Stripe webhooks
    ├── stripe-verify/            # Verify session
    └── revenuecat-webhook/       # Handle RevenueCat webhooks
```
