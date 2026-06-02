import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function scoreAnswer(
  question: string,
  answer: string,
  jobRole: string,
  difficulty: string
): Promise<{ score: number; feedback: string }> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an expert interviewer evaluating a candidate for a ${jobRole} position (${difficulty} level).

Question: ${question}

Candidate's Answer: ${answer}

Score this answer from 0-10 and provide specific, constructive feedback. Consider:
- Accuracy and correctness
- Completeness and depth
- Communication clarity
- Practical examples (if provided)

Respond in this exact JSON format:
{
  "score": <number 0-10>,
  "feedback": "<detailed feedback paragraph>"
}`,
      },
    ],
  })

  const text = (message.content[0] as { type: string; text: string }).text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid response from AI')
  return JSON.parse(jsonMatch[0])
}

async function generateNextQuestion(
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

  const prevQList = previousQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an expert technical interviewer. Generate interview question #${questionNumber} of 5 for a ${jobRole} position at ${difficultyDesc} level.

Previous questions asked (do NOT repeat these):
${prevQList}

Requirements:
- Ask ONE clear, specific question
- Appropriate for a ${jobRole} role
- ${difficultyDesc} difficulty
- Covers a different topic/angle than previous questions
- Return ONLY the question text, no preamble or numbering`,
      },
    ],
  })

  return (message.content[0] as { type: string; text: string }).text.trim()
}

export async function POST(
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

    const body = await request.json()
    const { question, answer } = body

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'question and answer are required' },
        { status: 400 }
      )
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('interviewforge_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session already completed' },
        { status: 400 }
      )
    }

    // Get existing answers for this session
    const { data: existingAnswers } = await supabase
      .from('interviewforge_answers')
      .select('question, score')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    const answerCount = (existingAnswers || []).length
    const questionNumber = answerCount + 1

    // Score the answer via Claude
    const { score, feedback } = await scoreAnswer(
      question,
      answer,
      session.job_role,
      session.difficulty
    )

    // Store the answer
    const { error: insertError } = await supabase
      .from('interviewforge_answers')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        question,
        answer,
        score,
        feedback,
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Calculate total score so far
    const allScores = [...(existingAnswers || []).map((a) => a.score || 0), score]
    const totalScore =
      allScores.reduce((sum, s) => sum + s, 0) / allScores.length

    const isLastQuestion = questionNumber >= session.questions_count

    if (isLastQuestion) {
      // Mark session as completed
      await supabase
        .from('interviewforge_sessions')
        .update({ status: 'completed', total_score: totalScore })
        .eq('id', sessionId)

      return NextResponse.json({
        score,
        feedback,
        question_number: questionNumber,
        session_complete: true,
        total_score: totalScore,
      })
    }

    // Generate next question
    const previousQuestions = [
      ...(existingAnswers || []).map((a) => a.question),
      question,
    ]
    const nextQuestion = await generateNextQuestion(
      session.job_role,
      session.difficulty,
      questionNumber + 1,
      previousQuestions
    )

    // Update session's running total
    await supabase
      .from('interviewforge_sessions')
      .update({ total_score: totalScore })
      .eq('id', sessionId)

    return NextResponse.json({
      score,
      feedback,
      question_number: questionNumber,
      session_complete: false,
      next_question: nextQuestion,
      total_score: totalScore,
    })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
