'use client'

import { createContext, useContext, useMemo, useState } from 'react'

type UserContextType = {
  userName: string
  setUserName: (name: string) => void
}

const UserContext = createContext<UserContextType>({ userName: '', setUserName: () => {} })

export function UserProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [userName, setUserName] = useState('')
  const value = useMemo(() => ({ userName, setUserName }), [userName])
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
