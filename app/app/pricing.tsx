// ============================================================================
// Pricing Page - Subscription Model
// ============================================================================
// Party Pass (24h) und Premium (Monat) kaufen
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePayments } from '@/hooks/usePayments';
import { usePremium, formatExpiryTime } from '@/hooks/usePremium';
import { useUser } from '@/hooks/useUser';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/types/payments';

export default function PricingScreen() {
  const { id: userId } = useUser();
  const { data: subscription, isLoading: subscriptionLoading } = usePremium(userId);
  const { paymentState, purchasePlan, restoreSubscription, availablePaymentMethod } =
    usePayments(userId);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!userId) {
      Alert.alert('Login erforderlich', 'Bitte melde dich an, um zu kaufen');
      router.push('/auth');
      return;
    }

    setSelectedPlan(plan.id);
    await purchasePlan(plan);
    setSelectedPlan(null);
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    await restoreSubscription();

    if (paymentState.status === 'success') {
      Alert.alert('Erfolg', 'Käufe wiederhergestellt');
    } else {
      Alert.alert('Info', 'Keine Käufe zum Wiederherstellen');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-200">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="p-6 border-b border-white/10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4"
          >
            <Text className="text-orange-500 text-lg">← Zurück</Text>
          </TouchableOpacity>

          <Text className="text-white font-bold text-3xl mb-2">
            Premium werden 🔥
          </Text>
          <Text className="text-white/60 text-base">
            Schalte KI-Fragen, Spicy Vibes und mehr frei!
          </Text>

          {/* Current Status */}
          {subscription && (subscription.isPremium || subscription.hasPartyPass) && (
            <View className="mt-4 bg-green-500/20 rounded-xl p-4 border border-green-500">
              {subscription.isPremium && (
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl">👑</Text>
                  <View>
                    <Text className="text-green-400 font-bold">Premium aktiv</Text>
                    <Text className="text-green-400/80 text-sm">
                      {formatExpiryTime(subscription.premiumUntil)}
                    </Text>
                  </View>
                </View>
              )}
              {subscription.hasPartyPass && !subscription.isPremium && (
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl">🎉</Text>
                  <View>
                    <Text className="text-green-400 font-bold">Party Pass aktiv</Text>
                    <Text className="text-green-400/80 text-sm">
                      {formatExpiryTime(subscription.partyPassUntil)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Subscription Plans */}
        <View className="p-6 gap-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onPurchase={handlePurchase}
              loading={selectedPlan === plan.id && paymentState.status === 'processing'}
              disabled={!availablePaymentMethod}
              isActive={
                (plan.id === 'premium' && subscription?.isPremium) ||
                (plan.id === 'party_pass' && subscription?.hasPartyPass)
              }
            />
          ))}
        </View>

        {/* Payment Method Info */}
        <View className="px-6 pb-4">
          <View className="bg-dark-100/50 rounded-xl p-4 border border-white/10">
            <Text className="text-white/60 text-sm text-center">
              {availablePaymentMethod === 'stripe' && 'Sichere Zahlung via Stripe'}
              {availablePaymentMethod === 'revenuecat' &&
                `Zahlung via ${Platform.OS === 'ios' ? 'Apple' : 'Google'} In-App Kauf`}
              {!availablePaymentMethod && 'Zahlung nicht verfügbar'}
            </Text>
          </View>
        </View>

        {/* Features Comparison */}
        <View className="px-6 pb-6">
          <Text className="text-white font-bold text-xl mb-4">
            Was ist enthalten?
          </Text>

          <View className="bg-dark-100 rounded-xl p-4 gap-3">
            <FeatureRow
              icon="🤖"
              title="KI-generierte Fragen"
              partyPass={true}
              premium={true}
            />
            <FeatureRow
              icon="🌶️"
              title="Spicy Vibe"
              partyPass={true}
              premium={true}
            />
            <FeatureRow
              icon="🎭"
              title="Premium Vibes"
              partyPass={true}
              premium={true}
            />
            <FeatureRow
              icon="💾"
              title="Fragen dauerhaft speichern"
              partyPass={false}
              premium={true}
            />
            <FeatureRow
              icon="🚫"
              title="Werbefrei"
              partyPass={false}
              premium={true}
            />
          </View>
        </View>

        {/* Restore Purchases (Mobile only) */}
        {Platform.OS !== 'web' && (
          <View className="px-6 pb-6">
            <TouchableOpacity
              onPress={handleRestore}
              className="bg-white/5 rounded-xl py-3 active:bg-white/10"
            >
              <Text className="text-white/60 text-center font-semibold">
                Käufe wiederherstellen
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Status Message */}
        {paymentState.status === 'error' && (
          <View className="px-6 pb-6">
            <View className="bg-red-500/20 rounded-xl p-4 border border-red-500">
              <Text className="text-red-400 text-center">
                {paymentState.error || 'Kauf fehlgeschlagen. Bitte versuche es erneut.'}
              </Text>
            </View>
          </View>
        )}

        {paymentState.status === 'success' && (
          <View className="px-6 pb-6">
            <View className="bg-green-500/20 rounded-xl p-4 border border-green-500">
              <Text className="text-green-400 text-center font-bold">
                Kauf erfolgreich! 🎉
              </Text>
            </View>
          </View>
        )}

        {/* FAQs */}
        <View className="px-6 pb-12">
          <Text className="text-white font-bold text-xl mb-4">
            Häufige Fragen
          </Text>

          <View className="gap-4">
            <FAQItem
              question="Was ist der Unterschied?"
              answer="Party Pass ist für eine einmalige Party (24h). Premium ist ein Monatsabo mit allen Features inkl. Speichern und werbefrei."
            />
            <FAQItem
              question="Kann ich kündigen?"
              answer="Premium kannst du jederzeit kündigen. Der Zugang bleibt bis zum Ende des Abrechnungszeitraums bestehen."
            />
            <FAQItem
              question="Sind Zahlungen sicher?"
              answer="Ja! Alle Zahlungen werden sicher über vertrauenswürdige Zahlungsanbieter abgewickelt."
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ----------------------------------------------------------------------------
// Plan Card Component
// ----------------------------------------------------------------------------
interface PlanCardProps {
  plan: SubscriptionPlan;
  onPurchase: (plan: SubscriptionPlan) => void;
  loading?: boolean;
  disabled?: boolean;
  isActive?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onPurchase,
  loading,
  disabled,
  isActive,
}) => {
  const isPremium = plan.id === 'premium';

  return (
    <View
      className={`rounded-2xl overflow-hidden border-2 ${
        isPremium
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-white/20 bg-dark-100'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <View className="bg-orange-500 py-1">
          <Text className="text-white text-center font-bold text-sm">
            EMPFOHLEN
          </Text>
        </View>
      )}

      <View className="p-5">
        {/* Plan Name & Price */}
        <View className="flex-row items-baseline justify-between mb-3">
          <View>
            <Text className="text-white font-bold text-2xl">{plan.name}</Text>
            <Text className="text-white/60">
              {plan.duration === '24h' ? '24 Stunden' : 'Monatlich'}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-orange-500 font-bold text-3xl">
              €{plan.price.toFixed(2)}
            </Text>
            {plan.duration === 'month' && (
              <Text className="text-white/60 text-sm">/Monat</Text>
            )}
          </View>
        </View>

        {/* Features List */}
        <View className="gap-2 mb-4">
          {plan.features.map((feature, index) => (
            <View key={index} className="flex-row items-center gap-2">
              <Text className="text-green-400">✓</Text>
              <Text className="text-white">{feature}</Text>
            </View>
          ))}
        </View>

        {/* Purchase Button */}
        {isActive ? (
          <View className="bg-green-500/20 rounded-xl py-3">
            <Text className="text-green-400 text-center font-bold">
              ✓ Aktiv
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onPurchase(plan)}
            disabled={disabled || loading}
            className={`rounded-xl py-3 ${
              disabled
                ? 'bg-white/20'
                : isPremium
                ? 'bg-orange-500 active:bg-orange-600'
                : 'bg-white/10 active:bg-white/20 border border-white/20'
            }`}
          >
            <Text
              className={`text-center font-bold text-lg ${
                disabled ? 'text-white/40' : isPremium ? 'text-white' : 'text-white'
              }`}
            >
              {loading ? 'Laden...' : `${plan.name} holen`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ----------------------------------------------------------------------------
// Feature Row Component
// ----------------------------------------------------------------------------
interface FeatureRowProps {
  icon: string;
  title: string;
  partyPass: boolean;
  premium: boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ icon, title, partyPass, premium }) => (
  <View className="flex-row items-center justify-between py-2">
    <View className="flex-row items-center gap-3 flex-1">
      <Text className="text-xl">{icon}</Text>
      <Text className="text-white">{title}</Text>
    </View>
    <View className="flex-row gap-6">
      <Text className={partyPass ? 'text-green-400' : 'text-white/30'}>
        {partyPass ? '✓' : '—'}
      </Text>
      <Text className={premium ? 'text-green-400' : 'text-white/30'}>
        {premium ? '✓' : '—'}
      </Text>
    </View>
  </View>
);

// ----------------------------------------------------------------------------
// FAQ Item Component
// ----------------------------------------------------------------------------
interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => (
  <View className="bg-dark-100 rounded-xl p-4">
    <Text className="text-white font-semibold mb-2">{question}</Text>
    <Text className="text-white/60 text-sm">{answer}</Text>
  </View>
);
