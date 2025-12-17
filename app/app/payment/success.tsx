// ============================================================================
// Payment Success Page (Web only - Stripe Redirect)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verifyCheckoutSession } from '@/lib/payments/stripe';
import { useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/stores/userStore';
import { APP_NAME } from '@/types/payments';

export default function PaymentSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const { authUser: user } = useUserStore();
  const queryClient = useQueryClient();

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session_id) {
      verifyCheckoutSession(session_id)
        .then((isSuccess) => {
          setSuccess(isSuccess);
          setVerifying(false);

          if (isSuccess && user) {
            // Invalidate credits query to show updated balance
            queryClient.invalidateQueries({
              queryKey: ['credits', user.id, APP_NAME],
            });
          }
        })
        .catch((err) => {
          setError(err.message);
          setVerifying(false);
        });
    } else {
      setError('No session ID provided');
      setVerifying(false);
    }
  }, [session_id, user, queryClient]);

  if (verifying) {
    return (
      <SafeAreaView className="flex-1 bg-dark-200 items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-white/60 mt-4">Verifying payment...</Text>
      </SafeAreaView>
    );
  }

  if (error || !success) {
    return (
      <SafeAreaView className="flex-1 bg-dark-200">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-6xl mb-6">❌</Text>
          <Text className="text-white font-bold text-2xl mb-2 text-center">
            Payment Failed
          </Text>
          <Text className="text-white/60 text-center mb-8">
            {error || 'Something went wrong with your payment'}
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/pricing')}
            className="bg-orange-500 rounded-xl px-8 py-4 active:bg-orange-600"
          >
            <Text className="text-white font-bold text-lg">Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/')}
            className="mt-4"
          >
            <Text className="text-white/60 text-center">Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-200">
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-6xl mb-6">🎉</Text>
        <Text className="text-white font-bold text-2xl mb-2 text-center">
          Payment Successful!
        </Text>
        <Text className="text-white/60 text-center mb-8">
          Your credits have been added to your account
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/')}
          className="bg-orange-500 rounded-xl px-8 py-4 active:bg-orange-600"
        >
          <Text className="text-white font-bold text-lg">Start Playing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/pricing')}
          className="mt-4"
        >
          <Text className="text-white/60 text-center">Buy More Credits</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
