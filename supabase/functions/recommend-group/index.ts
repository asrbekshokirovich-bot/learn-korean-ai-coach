import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, demoLessonId, coordinatorNotes, detectedLevel } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', studentId)
      .single();

    if (studentError) throw studentError;

    // Get all active groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .eq('status', 'active')
      .order('current_students_count', { ascending: true });

    if (groupsError) throw groupsError;

    if (!groups || groups.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          recommendations: [],
          groups: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${groups.length} groups for student level: ${detectedLevel}`);

    // Analyze all groups to get current level data
    for (const group of groups) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/analyze-group-level`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ groupId: group.id }),
        });
      } catch (e) {
        console.error(`Failed to analyze group ${group.id}:`, e);
      }
    }

    // Refresh groups data to get analysis
    const { data: analyzedGroups } = await supabase
      .from("groups")
      .select("*")
      .eq("status", "active");

    // Get enrollments for each group
    const groupIds = (analyzedGroups || []).map((g: any) => g.id);
    const { data: enrollments } = await supabase
      .from('group_enrollments')
      .select(`
        group_id,
        student_id
      `)
      .in('group_id', groupIds)
      .eq('status', 'active');

    // Prepare AI prompt
    const systemPrompt = `You are an expert Korean language education coordinator. Your role is to recommend the best group class for a new student based on their demo lesson performance and available groups.

Consider:
1. Group capacity (groups with 1-13 students have 90min classes, 14-18 students have 120min classes)
2. Level compatibility (students should be with peers at similar levels)
3. Teacher expertise
4. Current group size (smaller groups may offer more attention)
5. Schedule compatibility

Return a JSON array of recommendations with this exact structure:
[
  {
    "group_id": "uuid",
    "confidence": 0-100,
    "reasoning": "brief explanation",
    "priority": 1-3
  }
]`;

    const userPrompt = `Student Information:
- Name: ${student.full_name}
- Detected Level from Demo: ${detectedLevel}
- Coordinator Notes: ${coordinatorNotes || 'None'}

Available Groups:
${(analyzedGroups || []).map((g: any, i: number) => {
  const groupEnrollments = (enrollments || []).filter((e: any) => e.group_id === g.id);
  const analysis = g.group_level_analysis;
  
  return `
${i + 1}. ${g.name}
   - Declared Level: ${g.level}
   - AI Assessed Level: ${analysis?.averageLevel || 'Not analyzed'}
   - Group Cohesion Score: ${analysis?.groupCohesion || 'N/A'}
   - Suitable for ${detectedLevel}: ${analysis?.suitableForNewStudent?.[detectedLevel] ? 'Yes' : 'No'}
   - Current Students: ${g.current_students_count}/${g.max_students}
   - Duration: ${g.duration_minutes} minutes
   - Schedule: Days ${Array.isArray(g.day_of_week) ? g.day_of_week.join(', ') : g.day_of_week} at ${g.start_time}
   - Level Distribution: ${analysis ? JSON.stringify(analysis.levelDistribution) : 'Unknown'}
`;
}).join('\n')}

Recommend the best 1-3 groups for this student considering ACTUAL group levels from AI analysis.`;

    console.log('Calling Lovable AI for group recommendation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded. Using fallback recommendation.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Using fallback recommendation.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    let recommendations;
    try {
      recommendations = JSON.parse(aiContent);
    } catch (e) {
      console.error('Failed to parse AI response, using fallback:', e);
      // Fallback: recommend group with most space that matches level
      const groupsArray = analyzedGroups || [];
      const matchingGroups = groupsArray.filter((g: any) => 
        g.level === detectedLevel || 
        g.group_level_analysis?.averageLevel === detectedLevel
      );
      recommendations = (matchingGroups.length > 0 ? matchingGroups : groupsArray)
        .slice(0, 3)
        .map((g: any, i: number) => ({
          group_id: g.id,
          confidence: 70 - (i * 10),
          reasoning: `Group has ${g.max_students - g.current_students_count} available spots.`,
          priority: i + 1
        }));
    }

    // Update demo lesson with recommendations
    const { error: updateError } = await supabase
      .from('demo_lessons')
      .update({
        ai_recommendations: recommendations,
        recommended_group_id: recommendations[0]?.group_id,
        detected_level: detectedLevel,
        coordinator_notes: coordinatorNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', demoLessonId);

    if (updateError) throw updateError;

    console.log('Successfully generated group recommendations');

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        groups: (analyzedGroups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          level: g.level,
          assessedLevel: g.group_level_analysis?.averageLevel,
          current_students: g.current_students_count,
          max_students: g.max_students,
          duration_minutes: g.duration_minutes,
          cohesionScore: g.group_level_analysis?.groupCohesion
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in recommend-group:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});