// ============================================================================
// RevenueCat Webhook Edge Function - Subscription Model
// ============================================================================
// Empfängt RevenueCat Webhooks und aktiviert Subscriptions
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const revenuecatWebhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Product ID -> Plan Mapping
const PRODUCT_PLAN: Record<string, { planId: string; app: string }> = {
  'busted_party_pass': { planId: 'party_pass', app: 'busted' },
  'busted_premium_monthly': { planId: 'premium', app: 'busted' },
};

serve(async (req) => {
  try {
    // Optional: Verify webhook signature
    const authHeader = req.headers.get('authorization');
    if (revenuecatWebhookSecret && authHeader !== `Bearer ${revenuecatWebhookSecret}`) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const event = await req.json();

    console.log('RevenueCat webhook event:', event.type);

    // Handle INITIAL_PURCHASE and RENEWAL events
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
      const userId = event.app_user_id; // Dies ist die Supabase User ID
      const productId = event.product_id;
      const store = event.store; // 'APP_STORE' oder 'PLAY_STORE'
      const transactionId = event.id;

      // Get plan info from product mapping
      const productInfo = PRODUCT_PLAN[productId];

      if (!productInfo) {
        console.error('Unknown product:', productId);
        return new Response(
          JSON.stringify({ error: 'Unknown product' }),
          { status: 400 }
        );
      }

      // Get price info (if available)
      const priceInCents = event.price_in_purchased_currency
        ? Math.round(event.price_in_purchased_currency * 100)
        : 0;

      const source = store === 'APP_STORE' ? 'revenuecat_apple' : 'revenuecat_google';

      console.log('Activating subscription:', {
        userId,
        planId: productInfo.planId,
        source,
        transactionId,
      });

      // Call activate_subscription function
      const { error } = await supabase.rpc('busted_activate_subscription', {
        p_user_id: userId,
        p_plan_id: productInfo.planId,
        p_price_cents: priceInCents,
        p_source: source,
        p_external_id: transactionId,
      });

      if (error) {
        console.error('Error activating subscription:', error);
        throw error;
      }

      console.log('Subscription activated successfully');
    }

    // Handle CANCELLATION
    if (event.type === 'CANCELLATION') {
      // No action needed - subscription just won't be renewed
      // The existing expiry date will remain
      console.log('Cancellation received:', event.app_user_id);
    }

    // Handle EXPIRATION
    if (event.type === 'EXPIRATION') {
      // No action needed - subscription expired naturally
      console.log('Subscription expired:', event.app_user_id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('RevenueCat webhook error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
