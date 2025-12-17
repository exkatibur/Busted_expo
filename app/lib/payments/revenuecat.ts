// ============================================================================
// RevenueCat Payment Integration (iOS & Android) - Subscription Model
// ============================================================================

import { Platform } from 'react-native';
import { APP_NAME, type RevenueCatProduct, type RevenueCatPurchase } from '@/types/payments';

// ----------------------------------------------------------------------------
// Environment Check
// ----------------------------------------------------------------------------
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;

// ----------------------------------------------------------------------------
// RevenueCat Availability
// ----------------------------------------------------------------------------
export const isRevenueCatAvailable = (): boolean => {
  // RevenueCat ist nur für iOS und Android verfügbar
  if (Platform.OS === 'web') {
    return false;
  }

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.error(`RevenueCat API key for ${Platform.OS} not configured`);
    return false;
  }

  return true;
};

// ----------------------------------------------------------------------------
// Initialize RevenueCat
// ----------------------------------------------------------------------------
export const initializeRevenueCat = async (userId: string): Promise<void> => {
  if (!isRevenueCatAvailable()) {
    console.warn('RevenueCat not available on this platform');
    return;
  }

  try {
    // Dynamically import RevenueCat (nur auf nativen Plattformen)
    const Purchases = require('react-native-purchases').default;

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    await Purchases.configure({
      apiKey: apiKey!,
      appUserID: userId, // Wichtig: Supabase User ID verwenden!
    });

    console.log('RevenueCat initialized for user:', userId);
  } catch (error) {
    console.error('RevenueCat initialization error:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// Get Available Products
// ----------------------------------------------------------------------------
export const getProducts = async (productIds: string[]): Promise<RevenueCatProduct[]> => {
  if (!isRevenueCatAvailable()) {
    throw new Error('RevenueCat not available');
  }

  try {
    const Purchases = require('react-native-purchases').default;

    const offerings = await Purchases.getOfferings();

    // Products aus current offering
    if (offerings.current !== null) {
      const packages = offerings.current.availablePackages;

      return packages
        .filter((pkg: any) => productIds.includes(pkg.product.identifier))
        .map((pkg: any) => ({
          identifier: pkg.product.identifier,
          description: pkg.product.description,
          title: pkg.product.title,
          price: pkg.product.price,
          priceString: pkg.product.priceString,
          currencyCode: pkg.product.currencyCode,
        }));
    }

    return [];
  } catch (error) {
    console.error('RevenueCat getProducts error:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------------
// Purchase Subscription
// ----------------------------------------------------------------------------
export interface PurchaseResult {
  success: boolean;
  purchase?: RevenueCatPurchase;
  error?: string;
  userCancelled?: boolean;
}

export const purchaseSubscription = async (productId: string): Promise<PurchaseResult> => {
  if (!isRevenueCatAvailable()) {
    return {
      success: false,
      error: 'RevenueCat not available',
    };
  }

  try {
    const Purchases = require('react-native-purchases').default;

    // Get offerings
    const offerings = await Purchases.getOfferings();

    if (offerings.current === null) {
      return {
        success: false,
        error: 'No offerings available',
      };
    }

    // Find package
    const packageToPurchase = offerings.current.availablePackages.find(
      (pkg: any) => pkg.product.identifier === productId
    );

    if (!packageToPurchase) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    // Purchase
    const purchaseResult = await Purchases.purchasePackage(packageToPurchase);

    // Webhook wird automatisch aufgerufen und Subscription aktualisiert

    return {
      success: true,
      purchase: {
        productIdentifier: purchaseResult.productIdentifiers[0],
        transactionIdentifier: purchaseResult.originalPurchaseDate,
        purchaseDate: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('RevenueCat purchase error:', error);

    // Check if user cancelled
    if (error.userCancelled) {
      return {
        success: false,
        userCancelled: true,
      };
    }

    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
};

// ----------------------------------------------------------------------------
// Restore Purchases
// ----------------------------------------------------------------------------
export const restorePurchases = async (): Promise<boolean> => {
  if (!isRevenueCatAvailable()) {
    return false;
  }

  try {
    const Purchases = require('react-native-purchases').default;

    const customerInfo = await Purchases.restorePurchases();

    // Check if there are any active entitlements (subscriptions)
    const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;

    return hasActiveEntitlements;
  } catch (error) {
    console.error('RevenueCat restore error:', error);
    return false;
  }
};

// ----------------------------------------------------------------------------
// Get Customer Info
// ----------------------------------------------------------------------------
export const getCustomerInfo = async (): Promise<any> => {
  if (!isRevenueCatAvailable()) {
    return null;
  }

  try {
    const Purchases = require('react-native-purchases').default;
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('RevenueCat getCustomerInfo error:', error);
    return null;
  }
};

// ----------------------------------------------------------------------------
// Check Active Subscription
// ----------------------------------------------------------------------------
export const hasActiveSubscription = async (): Promise<{
  premium: boolean;
  partyPass: boolean;
  expiresAt?: string;
}> => {
  if (!isRevenueCatAvailable()) {
    return { premium: false, partyPass: false };
  }

  try {
    const customerInfo = await getCustomerInfo();

    if (!customerInfo) {
      return { premium: false, partyPass: false };
    }

    const entitlements = customerInfo.entitlements.active;

    return {
      premium: 'premium' in entitlements,
      partyPass: 'party_pass' in entitlements,
      expiresAt: entitlements.premium?.expirationDate || entitlements.party_pass?.expirationDate,
    };
  } catch (error) {
    console.error('Check subscription error:', error);
    return { premium: false, partyPass: false };
  }
};
