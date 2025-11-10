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
    const { availabilityId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing availability request:', availabilityId);

    // Get student availability request
    const { data: availability, error: availError } = await supabase
      .from('student_availability')
      .select('*')
      .eq('id', availabilityId)
      .single();

    if (availError || !availability) {
      console.error('Availability error:', availError);
      throw new Error('Availability request not found');
    }

    // Get matching teachers based on level and day/time
    const dayOfWeek = new Date(availability.preferred_date).getDay();
    const preferredTime = availability.preferred_time;

    const { data: teachers, error: teachersError } = await supabase
      .from('teacher_availability')
      .select('teacher_id, profiles!inner(full_name, teacher_levels)')
      .eq('day_of_week', dayOfWeek)
      .eq('level', availability.preferred_level)
      .eq('is_available', true)
      .lte('start_time', preferredTime)
      .gte('end_time', preferredTime);

    if (teachersError) {
      console.error('Teachers query error:', teachersError);
      throw new Error('Failed to query teachers');
    }

    if (!teachers || teachers.length === 0) {
      throw new Error('No available teachers found for this time slot');
    }

    // Format teacher data for AI
    const teachersList = teachers.map((t: any) => ({
      teacher_id: t.teacher_id,
      name: t.profiles?.full_name || 'Unknown',
      levels: t.profiles?.teacher_levels || []
    }));

    // Use AI to select best teacher
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an intelligent lesson matching system. Select the best teacher for a student based on:
- Teacher availability
- Teacher experience with different proficiency levels
- Fair distribution of lessons among teachers

Return ONLY a JSON object with the teacher_id of the selected teacher.`;

    const userPrompt = `Student needs a ${availability.preferred_level} level lesson on ${availability.preferred_date} at ${availability.preferred_time}.
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
      // Fallback to first available teacher
      selectedTeacherId = teachersList[0].teacher_id;
    }

    // Create the lesson
    const scheduledDateTime = `${availability.preferred_date}T${availability.preferred_time}`;
    
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        student_id: availability.student_id,
        teacher_id: selectedTeacherId,
        scheduled_at: scheduledDateTime,
        duration_minutes: availability.duration_minutes,
        lesson_type: availability.preferred_level,
        status: 'scheduled',
        is_video_lesson: true,
      })
      .select()
      .single();

    if (lessonError) {
      console.error('Lesson creation error:', lessonError);
      throw new Error('Failed to create lesson');
    }

    // Create video lesson record
    const { error: videoLessonError } = await supabase
      .from('video_lessons')
      .insert({
        lesson_id: lesson.id,
        student_id: availability.student_id,
        teacher_id: selectedTeacherId,
        status: 'scheduled',
      });

    if (videoLessonError) {
      console.error('Video lesson creation error:', videoLessonError);
    }

    // Update availability status
    await supabase
      .from('student_availability')
      .update({ status: 'matched' })
      .eq('id', availabilityId);

    console.log('Successfully created lesson:', lesson.id);

    return new Response(JSON.stringify({ 
      success: true, 
      lesson,
      message: 'Lesson automatically created and teacher assigned!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-assign-lesson:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
