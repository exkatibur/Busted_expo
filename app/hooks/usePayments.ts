// ============================================================================
// usePayments Hook - Subscription Model
// ============================================================================
// Main hook for all payment operations
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  type PaymentMethod,
  type PaymentState,
  type SubscriptionPlan,
  APP_NAME,
} from '@/types/payments';
import { isStripeAvailable, redirectToCheckout } from '@/lib/payments/stripe';
import {
  isRevenueCatAvailable,
  initializeRevenueCat,
  purchaseSubscription,
  getProducts as getRevenueCatProducts,
  restorePurchases,
} from '@/lib/payments/revenuecat';

// ----------------------------------------------------------------------------
// Main Payment Hook
// ----------------------------------------------------------------------------
export const usePayments = (userId?: string) => {
  const queryClient = useQueryClient();
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: 'idle',
  });

  // Determine available payment method
  const getAvailablePaymentMethod = useCallback((): PaymentMethod | null => {
    if (Platform.OS === 'web' && isStripeAvailable()) {
      return 'stripe';
    }

    if ((Platform.OS === 'ios' || Platform.OS === 'android') && isRevenueCatAvailable()) {
      return 'revenuecat';
    }

    return null;
  }, []);

  // Initialize RevenueCat on mobile
  useEffect(() => {
    if (userId && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      initializeRevenueCat(userId).catch((error) => {
        console.error('Failed to initialize RevenueCat:', error);
      });
    }
  }, [userId]);

  // ----------------------------------------------------------------------------
  // Purchase Subscription
  // ----------------------------------------------------------------------------
  const purchasePlan = useCallback(
    async (plan: SubscriptionPlan) => {
      if (!userId) {
        setPaymentState({
          status: 'error',
          error: 'User not authenticated',
        });
        return;
      }

      setPaymentState({ status: 'processing' });

      const method = getAvailablePaymentMethod();

      if (!method) {
        setPaymentState({
          status: 'error',
          error: 'No payment method available',
        });
        return;
      }

      try {
        if (method === 'stripe') {
          // Web: Stripe Checkout
          const priceId = plan.stripePriceId;

          if (!priceId) {
            throw new Error('Stripe price ID not configured');
          }

          await redirectToCheckout({
            priceId,
            userId,
            planId: plan.id,
            planDuration: plan.duration,
          });

          // User wird zu Stripe weitergeleitet
          // State wird nach Redirect zurück aktualisiert
        } else if (method === 'revenuecat') {
          // Mobile: RevenueCat
          const productId = plan.revenueCatProductId;

          if (!productId) {
            throw new Error('RevenueCat product ID not configured');
          }

          const result = await purchaseSubscription(productId);

          if (result.success) {
            setPaymentState({
              status: 'success',
              lastPurchase: {
                plan: plan.id,
                timestamp: new Date().toISOString(),
              },
            });

            // Invalidate subscription query
            queryClient.invalidateQueries({
              queryKey: ['subscription', userId, APP_NAME],
            });
          } else if (result.userCancelled) {
            setPaymentState({ status: 'cancelled' });
          } else {
            setPaymentState({
              status: 'error',
              error: result.error || 'Purchase failed',
            });
          }
        }
      } catch (error: any) {
        console.error('Purchase error:', error);
        setPaymentState({
          status: 'error',
          error: error.message || 'Purchase failed',
        });
      }
    },
    [userId, getAvailablePaymentMethod, queryClient]
  );

  // ----------------------------------------------------------------------------
  // Restore Purchases (Mobile only)
  // ----------------------------------------------------------------------------
  const restoreSubscription = useCallback(async () => {
    if (Platform.OS === 'web') {
      return;
    }

    setPaymentState({ status: 'loading' });

    try {
      const hasActiveEntitlements = await restorePurchases();

      if (hasActiveEntitlements) {
        setPaymentState({ status: 'success' });

        // Invalidate subscription query
        if (userId) {
          queryClient.invalidateQueries({
            queryKey: ['subscription', userId, APP_NAME],
          });
        }
      } else {
        setPaymentState({ status: 'idle' });
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      setPaymentState({
        status: 'error',
        error: error.message || 'Restore failed',
      });
    }
  }, [userId, queryClient]);

  // ----------------------------------------------------------------------------
  // Get Available Products (Mobile only)
  // ----------------------------------------------------------------------------
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  useEffect(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      getRevenueCatProducts([
        'busted_party_pass',
        'busted_premium_monthly',
      ])
        .then(setAvailableProducts)
        .catch((error) => {
          console.error('Error fetching products:', error);
        });
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Reset Payment State
  // ----------------------------------------------------------------------------
  const resetPaymentState = useCallback(() => {
    setPaymentState({ status: 'idle' });
  }, []);

  return {
    paymentState,
    purchasePlan,
    restoreSubscription,
    availableProducts,
    resetPaymentState,
    availablePaymentMethod: getAvailablePaymentMethod(),
  };
};
