import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, groupId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing performance for student ${studentId} in group ${groupId}`);

    // Get student profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, topik_level")
      .eq("user_id", studentId)
      .single();

    // Get homework completion data
    const { data: homework } = await supabase
      .from("homework_assignments")
      .select("*")
      .eq("student_id", studentId);

    const totalHomework = homework?.length || 0;
    const completedHomework = homework?.filter(h => h.status === "completed").length || 0;
    const homeworkCompletionRate = totalHomework > 0 ? (completedHomework / totalHomework * 100) : 0;

    // Get lesson performance (reviews with AI feedback)
    const { data: lessonReviews } = await supabase
      .from("lesson_reviews")
      .select("*")
      .eq("student_id", studentId);

    const avgStudentRating = (lessonReviews && lessonReviews.length > 0)
      ? lessonReviews.reduce((sum: number, r: any) => sum + (r.student_rating || 0), 0) / lessonReviews.length
      : 0;

    const avgAiScore = (lessonReviews && lessonReviews.length > 0)
      ? lessonReviews.reduce((sum: number, r: any) => sum + (r.ai_score || 0), 0) / lessonReviews.length
      : 0;

    // Get conversation practice data
    const { data: conversations } = await supabase
      .from("conversation_analysis")
      .select("*")
      .eq("student_id", studentId);

    const avgConfidence = (conversations && conversations.length > 0)
      ? conversations.reduce((sum: number, c: any) => sum + (c.confidence_score || 0), 0) / conversations.length
      : 0;

    // Get attendance data (lessons attended)
    const { data: lessons } = await supabase
      .from("lessons")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "completed");

    const lessonsAttended = lessons?.length || 0;

    // Use AI to analyze comprehensive performance
    const prompt = `Analyze the following student performance data and provide a comprehensive assessment:

Student: ${profile?.full_name || "Unknown"}
Declared TOPIK Level: ${profile?.topik_level || "Not specified"}

Performance Metrics:
- Homework Completion Rate: ${homeworkCompletionRate.toFixed(1)}% (${completedHomework}/${totalHomework})
- Average Lesson Rating: ${avgStudentRating.toFixed(1)}/5
- AI-Assessed Performance Score: ${avgAiScore.toFixed(1)}/100
- Conversation Confidence Score: ${avgConfidence.toFixed(1)}/100
- Lessons Attended: ${lessonsAttended}

Based on this data:
1. Assess the student's actual proficiency level (beginner/intermediate/advanced)
2. Calculate a performance score (0-100) that reflects their overall progress
3. Identify 2-3 key strengths
4. Identify 2-3 areas for improvement
5. Provide specific recommendations for goal achievement

Return your analysis in this exact JSON format:
{
  "assessedLevel": "beginner|intermediate|advanced",
  "performanceScore": <number 0-100>,
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "summary": "brief overall assessment"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert Korean language teacher analyzing student performance." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to analyze performance with AI");
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    console.log("AI Analysis:", analysis);

    return new Response(
      JSON.stringify({
        success: true,
        studentId,
        analysis: {
          ...analysis,
          metrics: {
            homeworkCompletionRate,
            avgStudentRating,
            avgAiScore,
            avgConfidence,
            lessonsAttended,
          }
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-student-performance:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});