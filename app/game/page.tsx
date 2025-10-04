"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ref, onValue, update, get } from "firebase/database"
import { database } from "@/lib/firebase"
import { questions } from "@/lib/questions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { User, Trophy } from "lucide-react"
import type { GameState, Player } from "@/lib/types"

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [questionOrder, setQuestionOrder] = useState<number[]>([])

  // Initialize random question order when component mounts
  useEffect(() => {
    if (playerId && questionOrder.length === 0) {
      // Check if order exists in storage
      const storedOrder = sessionStorage.getItem(`questionOrder_${playerId}`)
      if (storedOrder) {
        setQuestionOrder(JSON.parse(storedOrder))
      } else {
        // Create new random order
        const indices = Array.from({ length: questions.length }, (_, i) => i)
        const shuffled = indices.sort(() => Math.random() - 0.5)
        setQuestionOrder(shuffled)
        sessionStorage.setItem(`questionOrder_${playerId}`, JSON.stringify(shuffled))
      }
    }
  }, [playerId, questionOrder.length])

  useEffect(() => {
    if (!playerId) {
      router.push("/")
      return
    }

    const gameStateRef = ref(database, "gameState")
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setGameState(data)
        if (data.status === "finished") {
          router.push(`/results?playerId=${playerId}`)
        }
      }
    })

    return () => unsubscribe()
  }, [playerId, router])

  useEffect(() => {
    if (!playerId) return

    const playerRef = ref(database, `players/${playerId}`)
    const unsubscribe = onValue(playerRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setCurrentPlayer(data)
      }
    })

    return () => unsubscribe()
  }, [playerId])

  useEffect(() => {
    const playersRef = ref(database, "players")
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setPlayers(data)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleSubmitAnswer = async () => {
    if (!playerId || !currentPlayer || !selectedAnswer) return

    try {
      const currentQuestionIndex = Object.keys(currentPlayer.answers || {}).length
      
      const playerRef = ref(database, `players/${playerId}`)
      const newAnswers = {
        ...currentPlayer.answers,
        [currentQuestionIndex]: selectedAnswer,
      }

      await update(playerRef, {
        answers: newAnswers,
        score: Object.keys(newAnswers).length,
      })

      // Check if this player finished all questions
      if (Object.keys(newAnswers).length >= questions.length) {
        // Check if this is the first player to finish
        const playersSnapshot = await get(ref(database, "players"))
        const allPlayers = playersSnapshot.val() as Record<string, Player>
        
        const finishedPlayers = Object.values(allPlayers).filter(
          (p) => Object.keys(p.answers || {}).length >= questions.length
        )

        // If this is the first player to finish, end the game
        if (finishedPlayers.length === 1) {
          const gameStateRef = ref(database, "gameState")
          await update(gameStateRef, {
            status: "finished",
            winnerId: playerId,
          })
        }
      }

      setSelectedAnswer("")
    } catch (error) {
      console.error("Error submitting answer:", error)
    }
  }

  if (!gameState || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const currentQuestionIndex = Object.keys(currentPlayer.answers || {}).length
  const currentQuestion = questions[currentQuestionIndex]
  const hasAnswered = currentPlayer.answers && currentQuestionIndex in currentPlayer.answers
  const isFinished = currentQuestionIndex >= questions.length
  const progress = (currentQuestionIndex / questions.length) * 100

  // Get all player names for answer options
  const playerNames = Object.values(players).map((p) => p.name)

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-12 text-center max-w-2xl">
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">أحسنت!</h1>
          <p className="text-2xl text-muted-foreground mb-6">
            لقد أكملت جميع الأسئلة
          </p>
          <p className="text-lg text-muted-foreground">
            انتظر حتى ينتهي اللاعبون الآخرون...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <User className="w-4 h-4 mr-2" />
            {currentPlayer.name}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            النقاط: {currentPlayer.score}
          </Badge>
        </div>

        {/* Progress */}
        <Card className="p-8 mb-8 border-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">التقدم</p>
              <p className="text-4xl font-bold">
                {currentQuestionIndex}/{questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">السؤال الحالي</p>
              <p className="text-4xl font-bold">#{currentQuestionIndex + 1}</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </Card>

        {/* Question */}
        <Card className="p-10 mb-8 border-2 bg-card">
          <h2 className="text-4xl font-bold text-center mb-2 text-balance" dir="rtl">
            {currentQuestion}
          </h2>
          <p className="text-center text-muted-foreground text-lg">
            اختر اللاعب الذي ينطبق عليه الوصف
          </p>
        </Card>

        {/* Player Selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {playerNames.map((name, idx) => (
            <Button
              key={idx}
              variant={selectedAnswer === name ? "default" : "outline"}
              size="lg"
              className="h-20 text-xl font-bold"
              onClick={() => setSelectedAnswer(name)}
            >
              <span dir="rtl">{name}</span>
            </Button>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitAnswer}
          disabled={!selectedAnswer}
          size="lg"
          className="w-full h-16 text-xl font-bold"
        >
          إرسال الإجابة
        </Button>
      </div>
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  )
}