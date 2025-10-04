"use client"

import { useEffect, useState } from "react"
import { ref, onValue, remove, update } from "firebase/database"
import { database } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  Trash2, 
  RotateCcw, 
  PlayCircle, 
  StopCircle,
  Users,
  User,
  Shield
} from "lucide-react"
import type { Player, GameState } from "@/lib/types"

export default function AdminPage() {
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const ADMIN_PASSWORD = "enitje2025" 

  useEffect(() => {
    if (!isAuthenticated) return

    const playersRef = ref(database, "players")
    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val()
      setPlayers(data || {})
    })

    return () => unsubscribe()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    const gameStateRef = ref(database, "gameState")
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      const data = snapshot.val()
      setGameState(data)
    })

    return () => unsubscribe()
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
    } else {
      alert("كلمة مرور خاطئة")
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا اللاعب؟")) return

    setLoading(playerId)
    try {
      await remove(ref(database, `players/${playerId}`))
    } catch (error) {
      console.error("Error deleting player:", error)
      alert("حدث خطأ أثناء حذف اللاعب")
    } finally {
      setLoading(null)
    }
  }

  const handleForceEndGame = async () => {
    if (!confirm("هل أنت متأكد من إنهاء اللعبة؟ سيتم إعادة جميع اللاعبين إلى شاشة النتائج.")) return

    setLoading("endGame")
    try {
      const gameStateRef = ref(database, "gameState")
      await update(gameStateRef, {
        status: "finished",
      })
    } catch (error) {
      console.error("Error ending game:", error)
      alert("حدث خطأ أثناء إنهاء اللعبة")
    } finally {
      setLoading(null)
    }
  }

  const handleResetGame = async () => {
    if (!confirm("هل أنت متأكد من إعادة تعيين اللعبة؟ سيتم حذف جميع اللاعبين والبيانات!")) return

    setLoading("reset")
    try {
      await remove(ref(database, "gameState"))
      await remove(ref(database, "players"))
      alert("تم إعادة تعيين اللعبة بنجاح")
    } catch (error) {
      console.error("Error resetting game:", error)
      alert("حدث خطأ أثناء إعادة التعيين")
    } finally {
      setLoading(null)
    }
  }

  const handleForceStartGame = async () => {
    if (Object.keys(players).length < 2) {
      alert("يجب أن يكون هناك لاعبان على الأقل لبدء اللعبة")
      return
    }

    if (!confirm("هل تريد بدء اللعبة الآن؟")) return

    setLoading("start")
    try {
      const gameStateRef = ref(database, "gameState")
      await update(gameStateRef, {
        status: "playing",
        currentQuestion: 0,
      })
    } catch (error) {
      console.error("Error starting game:", error)
      alert("حدث خطأ أثناء بدء اللعبة")
    } finally {
      setLoading(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">لوحة الإدارة</h1>
            <p className="text-muted-foreground">أدخل كلمة المرور للوصول</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full h-12 px-4 border rounded-lg text-center"
              dir="rtl"
            />
            <Button type="submit" className="w-full h-12" size="lg">
              تسجيل الدخول
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  const playersList = Object.entries(players)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="secondary">في الانتظار</Badge>
      case "playing":
        return <Badge variant="default">قيد اللعب</Badge>
      case "finished":
        return <Badge variant="outline">انتهت</Badge>
      default:
        return <Badge variant="outline">غير معروف</Badge>
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">لوحة الإدارة</h1>
            <p className="text-muted-foreground">إدارة اللعبة واللاعبين</p>
          </div>
          {gameState && getStatusBadge(gameState.status)}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Button
            onClick={handleForceStartGame}
            disabled={loading !== null || gameState?.status === "playing"}
            size="lg"
            className="h-20 text-lg"
            variant="default"
          >
            <PlayCircle className="w-6 h-6 ml-2" />
            {loading === "start" ? "جاري البدء..." : "بدء اللعبة"}
          </Button>

          <Button
            onClick={handleForceEndGame}
            disabled={loading !== null || gameState?.status !== "playing"}
            size="lg"
            className="h-20 text-lg"
            variant="destructive"
          >
            <StopCircle className="w-6 h-6 ml-2" />
            {loading === "endGame" ? "جاري الإنهاء..." : "إنهاء اللعبة"}
          </Button>

          <Button
            onClick={handleResetGame}
            disabled={loading !== null}
            size="lg"
            className="h-20 text-lg"
            variant="outline"
          >
            <RotateCcw className="w-6 h-6 ml-2" />
            {loading === "reset" ? "جاري إعادة التعيين..." : "إعادة تعيين الكل"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي اللاعبين</p>
                <p className="text-3xl font-bold">{playersList.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <User className="w-10 h-10 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">اللاعبون الجاهزون</p>
                <p className="text-3xl font-bold">
                  {playersList.filter(([, p]) => p.isReady).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">حالة اللعبة</p>
                <p className="text-2xl font-bold">
                  {gameState?.status === "waiting" && "انتظار"}
                  {gameState?.status === "playing" && "قيد اللعب"}
                  {gameState?.status === "finished" && "انتهت"}
                  {!gameState && "غير نشطة"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Players List */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-right">اللاعبون المتصلون</h2>
          
          {playersList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>لا يوجد لاعبون حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playersList.map(([id, player]) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <User className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-bold text-lg" dir="rtl">
                        {player.name}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        {player.isReady ? (
                          <Badge variant="secondary" className="text-xs">
                            جاهز
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            غير جاهز
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          النقاط: {player.score}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDeletePlayer(id)}
                    disabled={loading === id}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    {loading === id ? "جاري الحذف..." : "حذف"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}