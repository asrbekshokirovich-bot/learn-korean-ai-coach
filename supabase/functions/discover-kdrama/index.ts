import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching already shown series to avoid repeats...');
    const { data: shownSeries } = await supabase
      .from('shown_drama_series')
      .select('series_name');
    
    const shownSeriesNames = shownSeries?.map(s => s.series_name) || [];
    console.log('Already shown series:', shownSeriesNames);

    // Use AI to discover new K-drama series from YouTube
    console.log('Calling Lovable AI to discover new K-drama series...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a K-drama expert that helps find Korean dramas on YouTube for language learning. 
            
            ALREADY SHOWN SERIES (DO NOT REPEAT): ${shownSeriesNames.join(', ')}
            
            Your task: Find ONE new K-drama series available on YouTube that:
            1. Has NOT been shown before (not in the list above)
            2. Has multiple episodes available on YouTube
            3. Is suitable for Korean language learning
            4. Has English subtitles or is beginner-friendly
            
            Return ONLY valid JSON in this exact format:
            {
              "series_name": "Drama Title",
              "description": "Brief description",
              "difficulty_level": "beginner|intermediate|advanced",
              "episodes": [
                {
                  "episode_number": 1,
                  "title": "Episode title",
                  "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID",
                  "duration_minutes": 45
                }
              ]
            }
            
            CRITICAL: Provide real YouTube URLs for actual K-drama episodes. Search your knowledge for popular K-dramas available on YouTube.`
          },
          {
            role: 'user',
            content: 'Find a new K-drama series on YouTube that has not been shown yet.'
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI response error:', await aiResponse.text());
      throw new Error('Failed to get AI response');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    console.log('AI response:', content);

    // Parse AI response
    const dramaData = JSON.parse(content);
    console.log('Parsed drama data:', dramaData);

    // Check if series already exists
    const { data: existingSeries } = await supabase
      .from('shown_drama_series')
      .select('series_name')
      .eq('series_name', dramaData.series_name)
      .single();

    if (existingSeries) {
      return new Response(
        JSON.stringify({ 
          message: 'Series already exists, try again',
          series_name: dramaData.series_name 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert episodes into k_dramas table
    const episodesToInsert = dramaData.episodes.map((ep: any) => {
      // Extract YouTube ID from URL
      const youtubeId = ep.youtube_url.includes('watch?v=') 
        ? ep.youtube_url.split('watch?v=')[1].split('&')[0]
        : ep.youtube_url.split('/').pop();

      return {
        series_name: dramaData.series_name,
        title: `${dramaData.series_name} - Episode ${ep.episode_number}`,
        description: dramaData.description,
        video_url: `https://www.youtube.com/embed/${youtubeId}`,
        youtube_id: youtubeId,
        episode_number: ep.episode_number,
        difficulty_level: dramaData.difficulty_level,
        duration_minutes: ep.duration_minutes || 45,
        tags: ['korean-learning', dramaData.difficulty_level, 'ai-discovered'],
        is_ai_discovered: true,
        discovery_date: new Date().toISOString(),
        is_live: false,
      };
    });

    console.log('Inserting episodes:', episodesToInsert);
    const { error: insertError, data: insertedEpisodes } = await supabase
      .from('k_dramas')
      .insert(episodesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting episodes:', insertError);
      throw insertError;
    }

    // Mark series as shown
    const { error: seriesError } = await supabase
      .from('shown_drama_series')
      .insert({
        series_name: dramaData.series_name,
        episode_count: dramaData.episodes.length,
      });

    if (seriesError) {
      console.error('Error marking series as shown:', seriesError);
    }

    console.log('Successfully added new K-drama series:', dramaData.series_name);
    return new Response(
      JSON.stringify({
        success: true,
        series_name: dramaData.series_name,
        episode_count: dramaData.episodes.length,
        episodes: insertedEpisodes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in discover-kdrama function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});