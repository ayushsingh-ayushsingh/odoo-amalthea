"use client"

import React, { useEffect, useState } from 'react'
import { AppSidebar } from './app-sidebar'

export default function RoleBasedSidebar() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    const url = userId ? `/api/me?userId=${userId}` : '/api/me'
    fetch(url).then((r) => r.json()).then((data) => setUser(data)).catch(console.error)
  }, [])

  // For now we simply render the existing AppSidebar; later we can vary items by role.
  return <AppSidebar role={user?.role} />
}
