"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ref, onValue, update, get, remove } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, CheckCircle2, Clock } from "lucide-react"
import type { Player } from "@/lib/types"

function LobbyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!playerId) {
      router.push("/")
      return
    }

    const playersRef = ref(database, "players")
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setPlayers(data)
        setCurrentPlayer(data[playerId])
      }
    })

    return () => unsubscribe()
  }, [playerId, router])

  useEffect(() => {
    const gameStateRef = ref(database, "gameState")
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      const gameState = snapshot.val()
      if (gameState?.status === "playing") {
        router.push(`/game?playerId=${playerId}`)
      }
    })

    return () => unsubscribe()
  }, [playerId, router])

  const handleReady = async () => {
    if (!playerId || !currentPlayer) return

    setLoading(true)
    try {
      const playerRef = ref(database, `players/${playerId}`)
      await update(playerRef, { isReady: !currentPlayer.isReady })

      // Check if all players are ready
      const playersSnapshot = await get(ref(database, "players"))
      const allPlayers = playersSnapshot.val()
      const allReady = Object.values(allPlayers as Record<string, Player>).every(
        (player) => player.isReady
      )

      if (allReady && Object.keys(allPlayers).length > 1) {
        // Start the game
        const gameStateRef = ref(database, "gameState")
        await update(gameStateRef, {
          status: "playing",
          currentQuestion: 0,
        })
      }
    } catch (error) {
      console.error("Error updating ready status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveLobby = async () => {
    if (!playerId) return
    
    if (!confirm("هل أنت متأكد من مغادرة اللعبة؟")) return

    setLeaving(true)
    try {
      await remove(ref(database, `players/${playerId}`))
      router.push("/")
    } catch (error) {
      console.error("Error leaving lobby:", error)
      alert("حدث خطأ أثناء المغادرة")
      setLeaving(false)
    }
  }

  const playersList = Object.entries(players)
  const readyCount = playersList.filter(([, player]) => player.isReady).length
  const totalPlayers = playersList.length

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-3">قاعة الانتظار</h1>
          <p className="text-muted-foreground text-lg">
            انتظر حتى يصبح جميع اللاعبين جاهزين
          </p>
          <div className="mt-4">
            <Badge variant="secondary" className="text-xl px-6 py-2">
              {readyCount} / {totalPlayers} جاهز
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {playersList.map(([id, player]) => (
            <Card
              key={id}
              className={`p-6 border-2 transition-all ${
                id === playerId
                  ? "border-primary bg-primary/5"
                  : player.isReady
                    ? "border-secondary/50 bg-secondary/5"
                    : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <User className="w-8 h-8 text-primary" />
                {player.isReady ? (
                  <CheckCircle2 className="w-6 h-6 text-secondary" />
                ) : (
                  <Clock className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-xl font-bold mb-2 text-right" dir="rtl">
                {player.name}
              </h3>
              {id === playerId && (
                <Badge variant="default" className="text-sm">
                  أنت
                </Badge>
              )}
            </Card>
          ))}
        </div>

        {currentPlayer && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Button
                onClick={handleReady}
                disabled={loading || leaving}
                size="lg"
                className="h-16 px-12 text-xl font-bold"
                variant={currentPlayer.isReady ? "secondary" : "default"}
              >
                {currentPlayer.isReady ? "إلغاء الجاهزية" : "جاهز للعب"}
              </Button>

              <Button
                onClick={handleLeaveLobby}
                disabled={loading || leaving}
                size="lg"
                variant="outline"
                className="h-16 px-8 text-xl font-bold"
              >
                {leaving ? "جاري المغادرة..." : "مغادرة"}
              </Button>
            </div>
            
            {totalPlayers < 2 && (
              <p className="text-muted-foreground text-center">
                انتظر انضمام لاعبين آخرين...
              </p>
            )}
            
            {totalPlayers >= 2 && !Object.values(players).every((p) => p.isReady) && (
              <p className="text-muted-foreground text-center">
                انتظر حتى يصبح جميع اللاعبين جاهزين للبدء
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          جاري التحميل...
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  )
}