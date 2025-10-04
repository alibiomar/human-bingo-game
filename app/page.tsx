"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ref, push, set, get } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      alert("الرجاء إدخال اسمك")
      return
    }

    setLoading(true)
    try {
      // Check if game is already in progress
      const gameStateRef = ref(database, "gameState")
      const gameStateSnapshot = await get(gameStateRef)
      const gameState = gameStateSnapshot.val()

      if (gameState?.status === "playing") {
        alert("اللعبة قيد التقدم بالفعل. انتظر حتى تنتهي الجولة الحالية")
        setLoading(false)
        return
      }

      // Create new player
      const playersRef = ref(database, "players")
      const newPlayerRef = push(playersRef)
      const playerId = newPlayerRef.key

      await set(newPlayerRef, {
        name: playerName.trim(),
        isReady: false,
        answers: {},
        score: 0,
      })

      // Initialize game state if it doesn't exist
      if (!gameState) {
        await set(gameStateRef, {
          status: "waiting",
          currentQuestion: 0,
        })
      }

      // Redirect to lobby
      router.push(`/lobby?playerId=${playerId}`)
    } catch (error) {
      console.error("Error joining game:", error)
      alert("حدث خطأ أثناء الانضمام. حاول مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 border-2">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center">
            <Image src="/logo.webp" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-5xl font-bold mb-3 text-balance">Human Bingo</h1>
          <p className="text-muted-foreground text-lg">أدخل اسمك وابدأ اللعب</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-right">
              اسم اللاعب
            </label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="أدخل اسمك"
              className="text-right text-lg h-12"
              dir="rtl"
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === "Enter" && playerName.trim()) {
                  handleJoinGame()
                }
              }}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-right" dir="rtl">
            <h3 className="font-semibold mb-2">كيف تلعب:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• أدخل اسمك وانتظر اللاعبين الآخرين</li>
              <li>• عندما يكون الجميع جاهزين، ستبدأ اللعبة</li>
              <li>• أجب عن كل سؤال باختيار اللاعب المناسب</li>
              <li>• أول من ينهي جميع الأسئلة يفوز!</li>
            </ul>
          </div>

          <Button
            onClick={handleJoinGame}
            disabled={loading || !playerName.trim()}
            className="w-full h-14 text-lg font-bold"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري الانضمام...
              </>
            ) : (
              "انضم للعبة"
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}