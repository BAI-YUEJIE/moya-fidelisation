'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type UserContextType = {
  userId: string | null
  setUserId: (id: string) => void
  userName: string
  setUserName: (name: string) => void
  points: number
  setPoints: (p: number) => void
}

const UserContext = createContext<UserContextType>({
  userId: null, setUserId: () => {},
  userName: '', setUserName: () => {},
  points: 0, setPoints: () => {},
})

export function UserProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [points, setPoints] = useState(0)
  const value = useMemo(
    () => ({ userId, setUserId, userName, setUserName, points, setPoints }),
    [userId, userName, points]
  )
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
