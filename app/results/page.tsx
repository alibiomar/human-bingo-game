"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ref, onValue, remove } from "firebase/database"
import { database } from "@/lib/firebase"
import { questions } from "@/lib/questions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, User, RotateCcw, X, Eye } from "lucide-react"
import type { Player } from "@/lib/types"

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  useEffect(() => {
    const playersRef = ref(database, "players")
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const playersArray = Object.entries(data).map(([id, player]) => ({
          id,
          ...(player as Player),
        }))
        // Sort by score descending (number of correct answers)
        playersArray.sort((a, b) => b.score - a.score)
        setPlayers(playersArray)

        if (playerId) {
          const current = playersArray.find((p) => p.id === playerId)
          setCurrentPlayer(current || null)
        }
      }
    })

    return () => unsubscribe()
  }, [playerId])

  const handlePlayAgain = async () => {
    try {
      // Reset game state
      await remove(ref(database, "gameState"))
      await remove(ref(database, "players"))
      router.push("/")
    } catch (error) {
      console.error("Error resetting game:", error)
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-12 h-12 text-yellow-500" />
      case 1:
        return <Medal className="w-10 h-10 text-gray-400" />
      case 2:
        return <Award className="w-10 h-10 text-amber-700" />
      default:
        return <User className="w-8 h-8 text-muted-foreground" />
    }
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return "المركز الأول"
      case 1:
        return "المركز الثاني"
      case 2:
        return "المركز الثالث"
      default:
        return `المركز ${index + 1}`
    }
  }

  if (players.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const winner = players[0]
  const isWinner = currentPlayer?.id === winner.id

  // Get player's answers with questions
  const getPlayerAnswers = (player: Player) => {
    if (!player.answers) return []
    
    return Object.entries(player.answers).map(([questionIndex, answer]) => ({
      questionIndex: parseInt(questionIndex),
      question: questions[parseInt(questionIndex)],
      answer: answer,
    }))
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Player Details Modal */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-1" dir="rtl">
                    إجابات {selectedPlayer.name}
                  </h2>
                  <p className="text-muted-foreground">
                    مجموع الإجابات: {Object.keys(selectedPlayer.answers || {}).length}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPlayer(null)}
                  className="h-10 w-10"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                {getPlayerAnswers(selectedPlayer).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>لا توجد إجابات</p>
                  </div>
                ) : (
                  getPlayerAnswers(selectedPlayer).map((item, index) => (
                    <Card key={index} className="p-5 border-2">
                      <div className="flex items-start gap-3 mb-3">
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          #{item.questionIndex + 1}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">السؤال:</p>
                          <p className="text-lg font-medium" dir="rtl">
                            {item.question}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">الإجابة:</p>
                          <Badge variant="default" className="text-lg px-4 py-2">
                            {item.answer}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              <div className="sticky bottom-0 bg-card border-t p-6">
                <Button
                  onClick={() => setSelectedPlayer(null)}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  إغلاق
                </Button>
              </div>
            </Card>
          </div>
        )}
        {/* Winner Announcement */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 mb-6">
            <Trophy className="w-16 h-16 text-yellow-500" />
          </div>
          <h1 className="text-6xl font-bold mb-4">انتهت اللعبة!</h1>
          <div className="text-3xl font-bold mb-2" dir="rtl">
            الفائز: {winner.name}
          </div>
          <p className="text-xl text-muted-foreground">
            بعدد {winner.score} إجابة صحيحة
          </p>
          {isWinner && (
            <Badge variant="default" className="text-xl px-6 py-3 mt-4">
              🎉 تهانينا! أنت الفائز! 🎉
            </Badge>
          )}
        </div>

        {/* Your Result */}
        {currentPlayer && !isWinner && (
          <Card className="p-8 mb-8 border-2 border-primary bg-primary/5">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" dir="rtl">
                نتيجتك: {currentPlayer.name}
              </h2>
              <div className="flex items-center justify-center gap-4">
                <Badge variant="secondary" className="text-xl px-6 py-2">
                  النقاط: {currentPlayer.score}
                </Badge>
                <Badge variant="outline" className="text-xl px-6 py-2">
                  {getRankBadge(players.findIndex((p) => p.id === currentPlayer.id))}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6 text-center">لوحة المتصدرين</h2>
          <div className="space-y-4">
            {players.map((player, index) => (
              <Card
                key={player.id}
                className={`p-6 border-2 transition-all ${
                  player.id === playerId
                    ? "border-primary bg-primary/5"
                    : index === 0
                      ? "border-yellow-500/50 bg-yellow-500/5"
                      : "border-border"
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">{getRankIcon(index)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold" dir="rtl">
                        {player.name}
                      </h3>
                      {player.id === playerId && (
                        <Badge variant="default" className="text-sm">
                          أنت
                        </Badge>
                      )}
                      {index === 0 && (
                        <Badge variant="secondary" className="text-sm">
                          الفائز
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getRankBadge(index)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-muted-foreground mb-1">النقاط</p>
                    <p className="text-4xl font-bold">{player.score}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Play Again Button */}
        <div className="flex justify-center">
          <Button
            onClick={handlePlayAgain}
            size="lg"
            className="h-16 px-12 text-xl font-bold gap-3"
          >
            <RotateCcw className="w-6 h-6" />
            لعب مرة أخرى
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
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
      <ResultsContent />
    </Suspense>
  )
}