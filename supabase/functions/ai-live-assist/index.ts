import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioChunk, userLevel, topic, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // System prompt for real-time Korean lesson assistance
    const systemPrompt = `You are a real-time Korean language learning assistant. 
Analyze the student's speech and provide:
1. Pronunciation feedback (0-100 score)
2. Grammar corrections if needed
3. One helpful tip or suggestion
4. Vocabulary recommendations

Student level: ${userLevel || 'beginner'}
Current topic: ${topic || 'general conversation'}

Keep responses concise (1-2 sentences max per point). Be encouraging but accurate.
Respond in JSON format:
{
  "pronunciationScore": 85,
  "tip": "Try softening the 'ㅎ' sound",
  "grammarFix": "Use ~고 싶어요 instead of ~고 싶다",
  "suggestedPhrase": "저는 김치찌개를 먹고 싶어요"
}`;

    // Call Lovable AI for analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcribed speech: ${audioChunk}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please contact support.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse AI response
    let feedback;
    try {
      feedback = JSON.parse(aiResponse);
    } catch {
      // Fallback if AI doesn't return valid JSON
      feedback = {
        pronunciationScore: 75,
        tip: aiResponse.substring(0, 100),
        grammarFix: null,
        suggestedPhrase: null
      };
    }

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-live-assist:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to process audio'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});