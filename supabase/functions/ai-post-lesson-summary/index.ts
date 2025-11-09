import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoLessonId, liveTips, transcriptSnippets } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get video lesson details
    const { data: videoLesson, error: lessonError } = await supabase
      .from('video_lessons')
      .select('*, lessons(lesson_type)')
      .eq('id', videoLessonId)
      .single();

    if (lessonError) throw lessonError;

    // System prompt for lesson summary
    const systemPrompt = `You are a Korean language teaching assistant generating a post-lesson summary.
Analyze the lesson data and create:
1. Overall performance summary (2-3 sentences)
2. Top 3 strengths
3. Top 3 areas for improvement
4. 3-5 homework suggestions
5. Recommended next topics

Be specific, actionable, and encouraging.
Respond in JSON format:
{
  "summary": "string",
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"],
  "homework": [
    {"task": "string", "description": "string", "dueInDays": 7}
  ],
  "nextTopics": ["string", "string"]
}`;

    const userPrompt = `Lesson type: ${videoLesson.lessons.lesson_type}
Duration: ${videoLesson.end_time ? Math.round((new Date(videoLesson.end_time).getTime() - new Date(videoLesson.start_time).getTime()) / 60000) : 0} minutes

Live tips during lesson:
${JSON.stringify(liveTips, null, 2)}

Key transcript moments:
${JSON.stringify(transcriptSnippets, null, 2)}`;

    // Call Lovable AI for summary
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiSummary = JSON.parse(data.choices[0].message.content);

    // Update video lesson with insights
    const { error: updateError } = await supabase
      .from('video_lessons')
      .update({ 
        ai_insights: aiSummary,
        status: 'completed'
      })
      .eq('id', videoLessonId);

    if (updateError) throw updateError;

    // Auto-create homework assignments
    if (aiSummary.homework && Array.isArray(aiSummary.homework)) {
      const homeworkPromises = aiSummary.homework.map(async (hw: any) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (hw.dueInDays || 7));

        return supabase
          .from('homework_assignments')
          .insert({
            lesson_id: videoLesson.lesson_id,
            student_id: videoLesson.student_id,
            teacher_id: videoLesson.teacher_id,
            title: hw.task,
            description: hw.description,
            due_date: dueDate.toISOString(),
            status: 'assigned'
          });
      });

      await Promise.all(homeworkPromises);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      summary: aiSummary 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-post-lesson-summary:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate summary'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});