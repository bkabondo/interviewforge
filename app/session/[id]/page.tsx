'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AnswerResult {
  score: number
  feedback: string
  question_number: number
  session_complete: boolean
  next_question?: string
  total_score: number
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialQuestion = searchParams.get('q') || ''
  const initialQN = parseInt(searchParams.get('qn') || '1', 10)

  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion)
  const [questionNumber, setQuestionNumber] = useState(initialQN)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [phase, setPhase] = useState<'answering' | 'feedback' | 'complete'>('answering')
  const totalQuestions = 5

  async function handleSubmit() {
    if (!answer.trim()) {
      toast.error('Please write an answer before submitting')
      return
    }
    if (answer.trim().length < 10) {
      toast.error('Please provide a more detailed answer')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion, answer: answer.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit answer')
        return
      }
      setResult(data)
      setPhase(data.session_complete ? 'complete' : 'feedback')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNextQuestion() {
    if (!result?.next_question) return
    setCurrentQuestion(result.next_question)
    setQuestionNumber((n) => n + 1)
    setAnswer('')
    setResult(null)
    setPhase('answering')
  }

  function handleViewResults() {
    router.push(`/session/${sessionId}/results`)
  }

  const progress = ((questionNumber - 1) / totalQuestions) * 100

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl tracking-tight">
            InterviewForge
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Exit Session</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Question {questionNumber} of {totalQuestions}</span>
            {result && (
              <span className="font-medium">
                Running avg: {result.total_score.toFixed(1)}/10
              </span>
            )}
          </div>
          <Progress value={phase === 'feedback' || phase === 'complete' ? (questionNumber / totalQuestions) * 100 : progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">Question {questionNumber}</Badge>
            </div>
            <CardTitle className="text-xl font-semibold leading-relaxed">
              {currentQuestion}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Answer Phase */}
        {phase === 'answering' && (
          <div className="space-y-4">
            <Textarea
              placeholder="Type your answer here... Be specific, use examples from your experience, and explain your reasoning."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={8}
              className="resize-none text-base"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {answer.length} characters
              </span>
              <Button onClick={handleSubmit} disabled={submitting} size="lg">
                {submitting ? 'Scoring your answer...' : 'Submit Answer'}
              </Button>
            </div>
          </div>
        )}

        {/* Feedback Phase */}
        {(phase === 'feedback' || phase === 'complete') && result && (
          <div className="space-y-4">
            {/* Your Answer */}
            <Card className="bg-muted/50">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Your Answer</p>
                <p className="text-sm leading-relaxed">{answer}</p>
              </CardContent>
            </Card>

            {/* Score */}
            <Card className={cn(
              'border-2',
              result.score >= 8
                ? 'border-green-300 bg-green-50'
                : result.score >= 5
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-red-300 bg-red-50'
            )}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-lg">Score</p>
                  <span className={cn(
                    'text-3xl font-bold',
                    result.score >= 8
                      ? 'text-green-700'
                      : result.score >= 5
                        ? 'text-yellow-700'
                        : 'text-red-700'
                  )}>
                    {result.score}/10
                  </span>
                </div>
                <Progress
                  value={(result.score / 10) * 100}
                  className={cn(
                    'h-2 mb-3',
                    result.score >= 8
                      ? '[&>div]:bg-green-500'
                      : result.score >= 5
                        ? '[&>div]:bg-yellow-500'
                        : '[&>div]:bg-red-500'
                  )}
                />
                <p className="text-sm leading-relaxed">{result.feedback}</p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end">
              {phase === 'complete' ? (
                <div className="flex flex-col items-end gap-2">
                  <p className="text-sm text-muted-foreground">
                    Interview complete! Final avg: <strong>{result.total_score.toFixed(1)}/10</strong>
                  </p>
                  <Button onClick={handleViewResults} size="lg">
                    View Full Results
                  </Button>
                </div>
              ) : (
                <Button onClick={handleNextQuestion} size="lg">
                  Next Question
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
