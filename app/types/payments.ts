// ============================================================================
// Payment Types for Busted - Subscription Model
// ============================================================================

export const APP_NAME = 'busted';

// ----------------------------------------------------------------------------
// Subscription Plans
// ----------------------------------------------------------------------------
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in Euro
  duration: '24h' | 'month';
  features: string[];
  stripePriceId?: string;
  revenueCatProductId?: string;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'party_pass',
    name: 'Party Pass',
    price: 1.99,
    duration: '24h',
    features: [
      'KI-generierte Fragen',
      'Spicy Vibe',
      'Premium Vibes',
      '24 Stunden Zugang',
    ],
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PARTY_PASS_PRICE,
    revenueCatProductId: 'busted_party_pass',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2.99,
    duration: 'month',
    features: [
      'Alles aus Party Pass',
      'Fragen dauerhaft speichern',
      'Werbefrei',
      'Monatlich kündbar',
    ],
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE,
    revenueCatProductId: 'busted_premium_monthly',
    popular: true,
  },
];

// ----------------------------------------------------------------------------
// Premium Features
// ----------------------------------------------------------------------------
export type PremiumFeature =
  | 'ai_questions'      // KI-generierte Fragen
  | 'spicy_vibe'        // Spicy Fragenkategorie
  | 'premium_vibes'     // Alle Premium Vibes
  | 'save_questions'    // Fragen dauerhaft speichern
  | 'ad_free';          // Keine Werbung

// What each plan includes
export const PLAN_FEATURES: Record<string, PremiumFeature[]> = {
  party_pass: ['ai_questions', 'spicy_vibe', 'premium_vibes'],
  premium: ['ai_questions', 'spicy_vibe', 'premium_vibes', 'save_questions', 'ad_free'],
};

// ----------------------------------------------------------------------------
// User Subscription Status
// ----------------------------------------------------------------------------
export interface SubscriptionStatus {
  isPremium: boolean;
  hasPartyPass: boolean;
  premiumUntil: string | null;     // ISO timestamp
  partyPassUntil: string | null;   // ISO timestamp
  features: PremiumFeature[];
}

// ----------------------------------------------------------------------------
// Payment Methods
// ----------------------------------------------------------------------------
export type PaymentMethod = 'stripe' | 'revenuecat';

export interface PaymentProvider {
  method: PaymentMethod;
  available: boolean;
  reason?: string;
}

// ----------------------------------------------------------------------------
// Stripe Types
// ----------------------------------------------------------------------------
export interface StripeCheckoutSession {
  checkoutUrl: string;
  sessionId: string;
}

// ----------------------------------------------------------------------------
// RevenueCat Types
// ----------------------------------------------------------------------------
export interface RevenueCatProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

export interface RevenueCatPurchase {
  productIdentifier: string;
  transactionIdentifier: string;
  purchaseDate: string;
}

// ----------------------------------------------------------------------------
// Payment Status
// ----------------------------------------------------------------------------
export type PaymentStatus =
  | 'idle'
  | 'loading'
  | 'processing'
  | 'success'
  | 'error'
  | 'cancelled';

export interface PaymentState {
  status: PaymentStatus;
  error?: string;
  lastPurchase?: {
    plan: string;
    timestamp: string;
  };
}
