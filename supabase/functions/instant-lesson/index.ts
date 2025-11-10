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
    const { studentId, level } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Finding instant lesson for student:', studentId, 'level:', level);

    // Get current day and time
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    console.log('Current day:', dayOfWeek, 'Current time:', currentTime);

    // Find teachers available RIGHT NOW
    const { data: teachers, error: teachersError } = await supabase
      .from('teacher_availability')
      .select('teacher_id, profiles!inner(full_name, teacher_levels)')
      .eq('day_of_week', dayOfWeek)
      .eq('level', level)
      .eq('is_available', true)
      .lte('start_time', currentTime)
      .gte('end_time', currentTime);

    if (teachersError) {
      console.error('Teachers query error:', teachersError);
      throw new Error('Failed to query teachers');
    }

    console.log('Found teachers:', teachers?.length || 0);

    if (!teachers || teachers.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No teachers available right now. Please try booking a lesson for later.',
        available: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to select best teacher
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const teachersList = teachers.map((t: any) => ({
      teacher_id: t.teacher_id,
      name: t.profiles?.full_name || 'Unknown',
      levels: t.profiles?.teacher_levels || []
    }));

    const systemPrompt = `You are an instant lesson matching system. Select the best available teacher for an immediate lesson.
Return ONLY a JSON object with the teacher_id.`;

    const userPrompt = `Student needs an INSTANT ${level} level lesson right now.
Available teachers: ${JSON.stringify(teachersList)}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI teacher selection failed');
    }

    const aiData = await aiResponse.json();
    let selectedTeacherId;
    
    try {
      const aiContent = aiData.choices[0].message.content;
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
      selectedTeacherId = parsed.teacher_id;
    } catch (e) {
      console.error('AI response parsing failed:', e);
      selectedTeacherId = teachersList[0].teacher_id;
    }

    console.log('Selected teacher:', selectedTeacherId);

    // Create lesson starting NOW
    const scheduledDateTime = now.toISOString();
    
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        student_id: studentId,
        teacher_id: selectedTeacherId,
        scheduled_at: scheduledDateTime,
        duration_minutes: 50,
        lesson_type: level,
        status: 'scheduled',
        is_video_lesson: true,
      })
      .select()
      .single();

    if (lessonError) {
      console.error('Lesson creation error:', lessonError);
      throw new Error('Failed to create instant lesson');
    }

    // Create video lesson record
    const { data: videoLesson, error: videoLessonError } = await supabase
      .from('video_lessons')
      .insert({
        lesson_id: lesson.id,
        student_id: studentId,
        teacher_id: selectedTeacherId,
        status: 'scheduled',
      })
      .select()
      .single();

    if (videoLessonError) {
      console.error('Video lesson creation error:', videoLessonError);
      throw new Error('Failed to create video lesson');
    }

    console.log('Successfully created instant lesson:', lesson.id);

    return new Response(JSON.stringify({ 
      success: true,
      available: true,
      lesson,
      videoLesson,
      message: 'Instant lesson created! Starting now...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in instant-lesson:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
