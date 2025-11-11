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
    const { studentId, groupGoalId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Updating goal progress for student ${studentId}, goal ${groupGoalId}`);

    // Get the goal details
    const { data: goal } = await supabase
      .from("group_goals")
      .select("*, groups!inner(id)")
      .eq("id", groupGoalId)
      .single();

    if (!goal) {
      throw new Error("Goal not found");
    }

    // Get comprehensive student analysis
    const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-student-performance`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId,
        groupId: goal.group_id,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error("Failed to analyze student performance");
    }

    const { analysis } = await analysisResponse.json();

    // Calculate progress based on goal unit and performance
    let currentValue = 0;
    
    switch (goal.unit) {
      case "lessons":
        currentValue = analysis.metrics.lessonsAttended;
        break;
      case "assignments":
      case "homework":
        currentValue = Math.round(analysis.metrics.homeworkCompletionRate * goal.target_value / 100);
        break;
      case "points":
        currentValue = Math.round(analysis.performanceScore * goal.target_value / 100);
        break;
      case "hours":
        // Estimate hours from lessons attended (assuming 90 min lessons = 1.5 hours)
        currentValue = Math.round(analysis.metrics.lessonsAttended * 1.5);
        break;
      default:
        // Use performance score as a general metric
        currentValue = Math.round(analysis.performanceScore * goal.target_value / 100);
    }

    // Update student goal progress
    const { error: updateError } = await supabase
      .from("student_goal_progress")
      .update({
        current_value: currentValue,
        last_updated: new Date().toISOString(),
      })
      .eq("group_goal_id", groupGoalId)
      .eq("student_id", studentId);

    if (updateError) throw updateError;

    console.log(`Updated progress: ${currentValue}/${goal.target_value} ${goal.unit}`);

    return new Response(
      JSON.stringify({
        success: true,
        currentValue,
        targetValue: goal.target_value,
        unit: goal.unit,
        analysis: analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-goal-progress:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});