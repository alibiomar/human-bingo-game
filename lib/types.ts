export interface Team {
  id: string
  name: string
  members: string[]
  isReady: boolean
  answers: Record<number, string>
  score: number
}

export interface Player {
  id?: string
  name: string
  isReady: boolean
  answers: Record<number, string>
  score: number
}

export interface GameState {
  status: "waiting" | "playing" | "finished"
  currentQuestion: number
  winnerId?: string
}