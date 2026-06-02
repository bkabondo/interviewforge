import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateQuestion(
  jobRole: string,
  difficulty: string,
  questionNumber: number,
  previousQuestions: string[]
): Promise<string> {
  const difficultyDesc = {
    easy: 'introductory, fundamental concepts',
    medium: 'intermediate, requiring practical experience',
    hard: 'advanced, senior-level depth and complexity',
  }[difficulty] || 'intermediate'

  const prevQList =
    previousQuestions.length > 0
      ? `\n\nPrevious questions asked (do NOT repeat these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an expert technical interviewer. Generate interview question #${questionNumber} of 5 for a ${jobRole} position at ${difficultyDesc} level.${prevQList}

Requirements:
- Ask ONE clear, specific question
- Appropriate for a ${jobRole} role
- ${difficultyDesc} difficulty
- Varies from previous questions in topic/angle
- Return ONLY the question text, no preamble or numbering`,
      },
    ],
  })

  return (message.content[0] as { type: string; text: string }).text.trim()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_role, difficulty } = body

    if (!job_role || !difficulty) {
      return NextResponse.json(
        { error: 'job_role and difficulty are required' },
        { status: 400 }
      )
    }

    // Generate first question
    const firstQuestion = await generateQuestion(job_role, difficulty, 1, [])

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('interviewforge_sessions')
      .insert({
        user_id: user.id,
        job_role,
        difficulty,
        questions_count: 5,
        status: 'in_progress',
      })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      session,
      question: firstQuestion,
      question_number: 1,
    })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
