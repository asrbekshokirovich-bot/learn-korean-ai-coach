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
    const { groupId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing group level for group ${groupId}`);

    // Get group details
    const { data: group } = await supabase
      .from("groups")
      .select("name, level, current_students_count")
      .eq("id", groupId)
      .single();

    // Get all enrolled students
    const { data: enrollments } = await supabase
      .from("group_enrollments")
      .select("student_id")
      .eq("group_id", groupId)
      .eq("status", "active");

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          groupId,
          analysis: {
            averageLevel: group?.level || "beginner",
            studentCount: 0,
            levelDistribution: {},
            groupCohesion: "N/A - No students enrolled",
            recommendation: "Group is empty"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze each student's performance
    const studentAnalyses = [];
    for (const enrollment of enrollments) {
      const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-student-performance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: enrollment.student_id,
          groupId: groupId,
        }),
      });

      if (analysisResponse.ok) {
        const result = await analysisResponse.json();
        studentAnalyses.push(result.analysis);
      }
    }

    // Use AI to synthesize group-level analysis
    const prompt = `Analyze the following group of Korean language learners:

Group Name: ${group?.name}
Declared Level: ${group?.level}
Number of Students: ${enrollments.length}

Individual Student Analyses:
${studentAnalyses.map((a, i) => `
Student ${i + 1}:
- Assessed Level: ${a.assessedLevel}
- Performance Score: ${a.performanceScore}
- Homework Completion: ${a.metrics.homeworkCompletionRate.toFixed(1)}%
- AI Performance Score: ${a.metrics.avgAiScore.toFixed(1)}
`).join('\n')}

Based on this data, provide:
1. The actual average level of the group (beginner/intermediate/advanced)
2. Level distribution (how many in each level)
3. Group cohesion score (0-100) - how well-matched the students are
4. Whether the declared group level matches the actual level
5. Recommendations for the group

Return in this JSON format:
{
  "averageLevel": "beginner|intermediate|advanced",
  "levelDistribution": {
    "beginner": <count>,
    "intermediate": <count>,
    "advanced": <count>
  },
  "groupCohesion": <number 0-100>,
  "levelMatch": true|false,
  "recommendations": ["rec1", "rec2"],
  "suitableForNewStudent": {
    "beginner": true|false,
    "intermediate": true|false,
    "advanced": true|false
  }
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
          { role: "system", content: "You are an expert Korean language teacher analyzing group composition." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to analyze group with AI");
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    // Update group with analysis
    await supabase
      .from("groups")
      .update({
        group_level_analysis: {
          ...analysis,
          analyzedAt: new Date().toISOString(),
          studentCount: enrollments.length,
        }
      })
      .eq("id", groupId);

    console.log("Group Analysis:", analysis);

    return new Response(
      JSON.stringify({
        success: true,
        groupId,
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-group-level:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});