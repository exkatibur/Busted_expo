// ============================================================================
// SubscriptionBadge Component
// ============================================================================
// Zeigt den aktuellen Subscription-Status als Badge
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { usePremium, formatExpiryTime } from '@/hooks/usePremium';

interface SubscriptionBadgeProps {
  userId?: string;
  showUpgrade?: boolean;
  compact?: boolean;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  userId,
  showUpgrade = true,
  compact = false,
}) => {
  const { data: subscription, isLoading } = usePremium(userId);

  if (isLoading) {
    return null;
  }

  // User has Premium
  if (subscription?.isPremium) {
    return (
      <View
        className={`bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl border border-orange-500/50 ${
          compact ? 'px-3 py-1' : 'px-4 py-2'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Text className={compact ? 'text-base' : 'text-lg'}>👑</Text>
          <View>
            <Text className="text-orange-400 font-bold">Premium</Text>
            {!compact && (
              <Text className="text-orange-400/70 text-xs">
                {formatExpiryTime(subscription.premiumUntil)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // User has Party Pass
  if (subscription?.hasPartyPass) {
    return (
      <View
        className={`bg-purple-500/20 rounded-xl border border-purple-500/50 ${
          compact ? 'px-3 py-1' : 'px-4 py-2'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Text className={compact ? 'text-base' : 'text-lg'}>🎉</Text>
          <View>
            <Text className="text-purple-400 font-bold">Party Pass</Text>
            {!compact && (
              <Text className="text-purple-400/70 text-xs">
                {formatExpiryTime(subscription.partyPassUntil)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // No subscription - show upgrade button
  if (showUpgrade) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/pricing')}
        className={`bg-orange-500/20 rounded-xl border border-orange-500 ${
          compact ? 'px-3 py-1' : 'px-4 py-2'
        }`}
      >
        <Text className="text-orange-500 font-bold text-center">
          {compact ? '🔥 Upgrade' : '🔥 Premium werden'}
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
};
