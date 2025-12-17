// ============================================================================
// Stripe Webhook Edge Function - Subscription Model
// ============================================================================
// Empfängt Stripe Webhooks und aktiviert Subscriptions
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'No signature' }),
      { status: 400 }
    );
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Stripe webhook event:', event.type);

    // Handle checkout.session.completed (for one-time payments like Party Pass)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;
      const app = session.metadata?.app;
      const planId = session.metadata?.plan_id;
      const planDuration = session.metadata?.plan_duration;

      if (!userId || !app || !planId) {
        console.error('Missing metadata in session:', session.id);
        return new Response(
          JSON.stringify({ error: 'Invalid metadata' }),
          { status: 400 }
        );
      }

      // Get line items to get price info
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceInCents = lineItems.data[0]?.amount_total || 0;

      console.log('Activating subscription:', { userId, app, planId, priceInCents });

      // Call activate_subscription function
      const { error } = await supabase.rpc('busted_activate_subscription', {
        p_user_id: userId,
        p_plan_id: planId,
        p_price_cents: priceInCents,
        p_source: 'stripe',
        p_external_id: session.id,
      });

      if (error) {
        console.error('Error activating subscription:', error);
        throw error;
      }

      console.log('Subscription activated successfully');
    }

    // Handle subscription renewed (for monthly Premium)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;

      // Only process for subscription renewals
      if (invoice.billing_reason !== 'subscription_cycle') {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const userId = subscription.metadata?.user_id;
      const app = subscription.metadata?.app;
      const planId = subscription.metadata?.plan_id || 'premium';

      if (!userId || !app) {
        console.error('Missing metadata in subscription:', subscription.id);
        return new Response(
          JSON.stringify({ error: 'Invalid metadata' }),
          { status: 400 }
        );
      }

      console.log('Renewing subscription:', { userId, app, planId });

      const { error } = await supabase.rpc('busted_activate_subscription', {
        p_user_id: userId,
        p_plan_id: planId,
        p_price_cents: invoice.amount_paid,
        p_source: 'stripe',
        p_external_id: invoice.id,
      });

      if (error) {
        console.error('Error renewing subscription:', error);
        throw error;
      }

      console.log('Subscription renewed successfully');
    }

    // Handle subscription cancelled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      console.log('Subscription cancelled:', subscription.id);
      // No action needed - subscription just won't be renewed
      // The existing expiry date will remain
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Stripe webhook error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
