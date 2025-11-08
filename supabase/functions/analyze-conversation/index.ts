import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the recording
    const { data: recording, error: recordingError } = await supabaseClient
      .from("conversation_recordings")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      throw new Error("Recording not found");
    }

    if (!recording.transcription) {
      throw new Error("No transcription available");
    }

    console.log("Analyzing transcription...");

    // Use Lovable AI to analyze the conversation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert Korean language teacher analyzing a student's daily conversation practice. 
Analyze the transcription and provide insights in JSON format with these fields:
- topics_discussed: array of conversation topics
- struggle_areas: array of areas where the student struggled (grammar, vocabulary, pronunciation, etc.)
- vocabulary_gaps: array of Korean words/phrases the student should learn
- grammar_issues: array of grammar points that need improvement
- confidence_score: number 1-100 indicating overall confidence
- ai_recommendations: string with detailed recommendations
- practice_suggestions: array of specific practice exercises

Be encouraging but honest about areas for improvement.`
          },
          {
            role: "user",
            content: `Analyze this Korean conversation practice:\n\n${recording.transcription}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", errorText);
      throw new Error("Failed to analyze conversation");
    }

    const analysisData = await analysisResponse.json();
    const analysis = JSON.parse(analysisData.choices[0].message.content);

    console.log("Analysis complete:", analysis);

    // Store the analysis
    const { data: savedAnalysis, error: analysisError } = await supabaseClient
      .from("conversation_analysis")
      .insert({
        recording_id: recordingId,
        student_id: recording.student_id,
        analysis_date: recording.recording_date,
        topics_discussed: analysis.topics_discussed || [],
        struggle_areas: analysis.struggle_areas || [],
        vocabulary_gaps: analysis.vocabulary_gaps || [],
        grammar_issues: analysis.grammar_issues || [],
        confidence_score: analysis.confidence_score || 50,
        ai_recommendations: analysis.ai_recommendations || "",
        practice_suggestions: analysis.practice_suggestions || [],
      })
      .select()
      .single();

    if (analysisError) {
      console.error("Error saving analysis:", analysisError);
      throw analysisError;
    }

    // Update recording status
    await supabaseClient
      .from("conversation_recordings")
      .update({ status: "completed" })
      .eq("id", recordingId);

    return new Response(
      JSON.stringify({ analysis: savedAnalysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-conversation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
