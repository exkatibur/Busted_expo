// ============================================================================
// Stripe Payment Integration (Web only) - Subscription Model
// ============================================================================

import { Platform } from 'react-native';
import { APP_NAME, type StripeCheckoutSession } from '@/types/payments';

// ----------------------------------------------------------------------------
// Environment Check
// ----------------------------------------------------------------------------
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set');
}

if (!SUPABASE_URL) {
  console.warn('EXPO_PUBLIC_SUPABASE_URL not set');
}

// ----------------------------------------------------------------------------
// Stripe Availability
// ----------------------------------------------------------------------------
export const isStripeAvailable = (): boolean => {
  // Stripe ist nur für Web verfügbar
  if (Platform.OS !== 'web') {
    return false;
  }

  if (!STRIPE_PUBLISHABLE_KEY || !SUPABASE_URL) {
    console.error('Stripe configuration missing');
    return false;
  }

  return true;
};

// ----------------------------------------------------------------------------
// Create Checkout Session for Subscription
// ----------------------------------------------------------------------------
export interface CreateCheckoutParams {
  priceId: string;
  userId: string;
  planId: string;
  planDuration: '24h' | 'month';
  successUrl?: string;
  cancelUrl?: string;
}

export const createCheckoutSession = async (
  params: CreateCheckoutParams
): Promise<StripeCheckoutSession> => {
  if (!isStripeAvailable()) {
    throw new Error('Stripe is not available on this platform');
  }

  const { priceId, userId, planId, planDuration, successUrl, cancelUrl } = params;

  // Default URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const finalSuccessUrl = successUrl || `${origin}/payment/success`;
  const finalCancelUrl = cancelUrl || `${origin}/pricing`;

  try {
    // Call Supabase Edge Function to create checkout session
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId,
          app: APP_NAME,
          planId,
          planDuration,
          successUrl: finalSuccessUrl,
          cancelUrl: finalCancelUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return {
      checkoutUrl: data.url,
      sessionId: data.sessionId,
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// Redirect to Checkout
// ----------------------------------------------------------------------------
export const redirectToCheckout = async (
  params: CreateCheckoutParams
): Promise<void> => {
  const session = await createCheckoutSession(params);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = session.checkoutUrl;
  } else {
    throw new Error('Redirect only available on web');
  }
};

// ----------------------------------------------------------------------------
// Verify Session (after redirect back)
// ----------------------------------------------------------------------------
export const verifyCheckoutSession = async (
  sessionId: string
): Promise<boolean> => {
  if (!isStripeAvailable()) {
    return false;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/stripe-verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Stripe verification error:', error);
    return false;
  }
};
