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

    // Get all active groups for the detected level
    const { data: groups, error: groupsError } = await supabase
      .from('lesson_groups')
      .select(`
        *,
        teacher:profiles!lesson_groups_teacher_id_fkey(full_name, email)
      `)
      .eq('level', detectedLevel)
      .eq('is_active', true)
      .order('current_students', { ascending: true });

    if (groupsError) throw groupsError;

    // Get enrollments for each group to understand student composition
    const groupIds = (groups || []).map(g => g.id);
    const { data: enrollments } = await supabase
      .from('group_enrollments')
      .select(`
        group_id,
        student_id,
        profiles!group_enrollments_student_id_fkey(topik_level)
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
- Detected Level: ${detectedLevel}
- Coordinator Notes: ${coordinatorNotes || 'None'}

Available Groups for Level ${detectedLevel}:
${(groups || []).map((g: any, i: number) => {
  const groupEnrollments = (enrollments || []).filter((e: any) => e.group_id === g.id);
  const studentLevels = groupEnrollments.map((e: any) => e.profiles?.topik_level || 'Unknown').join(', ');
  
  return `
${i + 1}. ${g.name}
   - Teacher: ${g.teacher?.full_name || 'Unknown'}
   - Current Students: ${g.current_students}/${g.max_students}
   - Duration: ${g.duration_minutes} minutes
   - Schedule: Day ${g.schedule_day} at ${g.schedule_time}
   - Student Levels in Group: ${studentLevels || 'New group'}
`;
}).join('\n')}

Recommend the best 1-3 groups for this student.`;

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
      // Fallback: recommend group with most space at the right level
      const groupsArray = groups || [];
      recommendations = groupsArray.slice(0, 3).map((g: any, i: number) => ({
        group_id: g.id,
        confidence: 80 - (i * 10),
        reasoning: `Group has ${g.max_students - g.current_students} available spots and matches the student's level.`,
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
        groups: (groups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          teacher: g.teacher?.full_name || 'Unknown',
          current_students: g.current_students,
          max_students: g.max_students,
          duration_minutes: g.duration_minutes
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