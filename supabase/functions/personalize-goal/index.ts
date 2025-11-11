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
    const { groupGoalId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the goal details
    const { data: goal, error: goalError } = await supabase
      .from("group_goals")
      .select("*, groups!inner(id, name)")
      .eq("id", groupGoalId)
      .single();

    if (goalError) throw goalError;

    // Get all enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from("group_enrollments")
      .select(`
        student_id,
        profiles:student_id (full_name)
      `)
      .eq("group_id", goal.group_id)
      .eq("status", "active");

    if (enrollError) throw enrollError;

    // For each student, use AI to personalize the goal
    for (const enrollment of enrollments) {
      const studentName = (enrollment.profiles as any)?.full_name || "Student";
      const prompt = `You are a Korean language learning coach. A teacher has set the following group goal:

Title: ${goal.title}
Description: ${goal.description}
Target: ${goal.target_value} ${goal.unit}
Duration: ${goal.start_date} to ${goal.end_date}

Create a personalized, encouraging version of this goal for student "${studentName}".
Keep it motivating, specific, and aligned with the original goal but personalized to make the student feel directly addressed.
Maximum 2-3 sentences. Be warm and supportive.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a supportive Korean language learning coach." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI API error:", await aiResponse.text());
        throw new Error("Failed to personalize goal with AI");
      }

      const aiData = await aiResponse.json();
      const personalizedDescription = aiData.choices[0].message.content;

      // Insert or update student goal progress
      const { error: upsertError } = await supabase
        .from("student_goal_progress")
        .upsert({
          group_goal_id: groupGoalId,
          student_id: enrollment.student_id,
          personalized_description: personalizedDescription,
          target_value: goal.target_value,
          current_value: 0,
        }, {
          onConflict: "group_goal_id,student_id"
        });

      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({ success: true, studentsProcessed: enrollments.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in personalize-goal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});