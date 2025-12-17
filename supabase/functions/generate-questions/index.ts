// ============================================================================
// AI Question Generation Edge Function
// ============================================================================
// Generiert "Wer würde am ehesten..." Fragen per OpenAI
// Premium Feature für BUSTED!
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vibe-specific prompts für bessere Fragen
const VIBE_PROMPTS: Record<string, string> = {
  party: 'lustige, alberne Party-Situationen',
  date_night: 'romantische oder peinliche Dating-Situationen',
  family: 'familienfreundliche, harmlose Situationen',
  spicy: 'freche, pikante aber nicht vulgäre Situationen',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { topic, vibe, count, roomId, userId, playerNames } = await req.json();

    // Validation
    if (!topic || !roomId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: topic, roomId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questionCount = Math.min(count || 5, 10); // Max 10 Fragen pro Request
    const selectedVibe = vibe || 'party';
    const vibeDescription = VIBE_PROMPTS[selectedVibe] || VIBE_PROMPTS.party;

    // Check subscription status (Premium or Party Pass required)
    const { data: subscription } = await supabase
      .from('busted_subscriptions')
      .select('premium_until, party_pass_until')
      .eq('user_id', userId)
      .single();

    const now = new Date();
    const isPremium = subscription?.premium_until && new Date(subscription.premium_until) > now;
    const hasPartyPass = subscription?.party_pass_until && new Date(subscription.party_pass_until) > now;

    if (!isPremium && !hasPartyPass) {
      return new Response(
        JSON.stringify({
          error: 'Premium or Party Pass required',
          code: 'SUBSCRIPTION_REQUIRED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt
    let playerContext = '';
    if (playerNames && playerNames.length > 0) {
      playerContext = `\nOptional kannst du auch diese Spielernamen in einigen Fragen verwenden: ${playerNames.join(', ')}`;
    }

    const systemPrompt = `Du bist ein kreativer Fragengenerator für das Partyspiel "BUSTED!".
Das Spiel funktioniert so: Eine Frage wird gestellt die mit "Wer würde am ehesten..." beginnt,
und die Spieler stimmen ab, wer aus der Gruppe am ehesten diese Sache tun würde.

Generiere Fragen die:
- Immer mit "Wer würde am ehesten..." beginnen
- Zum Thema "${topic}" passen
- Den Stil "${selectedVibe}" haben (${vibeDescription})
- Lustig und unterhaltsam sind
- Nicht beleidigend oder verletzend sind
- Für eine Gruppe von Freunden geeignet sind
${playerContext}

Antworte NUR mit einem JSON Array von Strings. Keine Erklärungen, nur das Array.`;

    const userPrompt = `Generiere ${questionCount} verschiedene "Wer würde am ehesten..." Fragen zum Thema "${topic}".`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate questions');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON array from the response
    let questions: string[];
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse generated questions');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format');
    }

    // Save questions to database
    const questionsToInsert = questions.map((text: string) => ({
      room_id: roomId,
      user_id: userId,
      text: text.trim(),
      source: 'ai',
      ai_topic: topic,
    }));

    const { data: savedQuestions, error: insertError } = await supabase
      .from('busted_custom_questions')
      .insert(questionsToInsert)
      .select('id, text, source');

    if (insertError) {
      console.error('Error saving questions:', insertError);
      throw new Error('Failed to save questions');
    }

    // Log the generation for tracking
    await supabase
      .from('busted_ai_generations')
      .insert({
        user_id: userId,
        room_id: roomId,
        topic: topic,
        question_count: questions.length,
      });

    return new Response(
      JSON.stringify({
        success: true,
        questions: savedQuestions,
        count: savedQuestions?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate questions error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate questions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
