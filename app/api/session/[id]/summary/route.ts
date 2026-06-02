import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateOverallAssessment(
  jobRole: string,
  difficulty: string,
  answers: Array<{ question: string; answer: string; score: number; feedback: string }>,
  averageScore: number
): Promise<string> {
  const qaList = answers
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}\nScore: ${a.score}/10`
    )
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an expert interviewer. Provide an overall assessment for a candidate interviewing for a ${jobRole} position (${difficulty} level).

Their average score was ${averageScore.toFixed(1)}/10.

Interview Q&A:
${qaList}

Write a 2-3 paragraph overall assessment covering:
1. Key strengths demonstrated
2. Areas for improvement
3. Overall readiness for the role

Be specific, constructive, and encouraging. Return only the assessment text.`,
      },
    ],
  })

  return (message.content[0] as { type: string; text: string }).text.trim()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('interviewforge_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all answers
    const { data: answers, error: answersError } = await supabase
      .from('interviewforge_answers')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    const avgScore =
      answers && answers.length > 0
        ? answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length
        : 0

    // Generate overall assessment if session is completed
    let overallAssessment = null
    if (session.status === 'completed' && answers && answers.length > 0) {
      overallAssessment = await generateOverallAssessment(
        session.job_role,
        session.difficulty,
        answers,
        avgScore
      )
    }

    return NextResponse.json({
      session,
      answers: answers || [],
      average_score: avgScore,
      overall_assessment: overallAssessment,
    })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
