// ============================================================================
// usePremium Hook
// ============================================================================
// Hook to check and manage subscription status
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  APP_NAME,
  type SubscriptionStatus,
  type PremiumFeature,
  PLAN_FEATURES,
} from '@/types/payments';

// ----------------------------------------------------------------------------
// Get Subscription Status
// ----------------------------------------------------------------------------
export const usePremium = (userId?: string) => {
  return useQuery({
    queryKey: ['subscription', userId, APP_NAME],
    queryFn: async (): Promise<SubscriptionStatus> => {
      if (!userId) {
        return {
          isPremium: false,
          hasPartyPass: false,
          premiumUntil: null,
          partyPassUntil: null,
          features: [],
        };
      }

      // Get subscription status from database
      const { data, error } = await supabase
        .from('busted_subscriptions')
        .select('premium_until, party_pass_until')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        throw error;
      }

      const now = new Date();
      const premiumUntil = data?.premium_until ? new Date(data.premium_until) : null;
      const partyPassUntil = data?.party_pass_until ? new Date(data.party_pass_until) : null;

      const isPremium = premiumUntil !== null && premiumUntil > now;
      const hasPartyPass = partyPassUntil !== null && partyPassUntil > now;

      // Determine active features
      let features: PremiumFeature[] = [];
      if (isPremium) {
        features = PLAN_FEATURES.premium;
      } else if (hasPartyPass) {
        features = PLAN_FEATURES.party_pass;
      }

      return {
        isPremium,
        hasPartyPass,
        premiumUntil: data?.premium_until || null,
        partyPassUntil: data?.party_pass_until || null,
        features,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Every minute
  });
};

// ----------------------------------------------------------------------------
// Check if user has a specific feature
// ----------------------------------------------------------------------------
export const useHasFeature = (userId?: string, feature?: PremiumFeature): boolean => {
  const { data } = usePremium(userId);

  if (!data || !feature) {
    return false;
  }

  return data.features.includes(feature);
};

// ----------------------------------------------------------------------------
// Check if user has any active subscription
// ----------------------------------------------------------------------------
export const useHasActiveSubscription = (userId?: string): boolean => {
  const { data } = usePremium(userId);
  return data?.isPremium || data?.hasPartyPass || false;
};

// ----------------------------------------------------------------------------
// Subscribe to Subscription Changes (Realtime)
// ----------------------------------------------------------------------------
export const useSubscriptionListener = (userId?: string) => {
  const queryClient = useQueryClient();

  if (userId) {
    supabase
      .channel(`subscription:${userId}:${APP_NAME}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'busted_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          queryClient.invalidateQueries({
            queryKey: ['subscription', userId, APP_NAME],
          });
        }
      )
      .subscribe();
  }
};

// ----------------------------------------------------------------------------
// Helper: Format expiry time
// ----------------------------------------------------------------------------
export const formatExpiryTime = (isoDate: string | null): string => {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return 'Abgelaufen';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `Noch ${days} Tag${days > 1 ? 'e' : ''}`;
  }

  if (hours > 0) {
    return `Noch ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  }

  const minutes = Math.floor(diff / (1000 * 60));
  return `Noch ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
};
