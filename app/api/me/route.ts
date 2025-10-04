import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/src'
import { users } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (userId) {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
      const u = rows[0]
      if (!u) return NextResponse.json({})
      return NextResponse.json({ id: u.id, name: u.name, role: u.role, managerId: u.managerId })
    }

    // fallback: return the first user
    const all = await db.select().from(users).limit(1)
    const u = all[0]
    if (!u) return NextResponse.json({})
    return NextResponse.json({ id: u.id, name: u.name, role: u.role, managerId: u.managerId })
  } catch (e) {
    console.error(e)
    return NextResponse.json({}, { status: 500 })
  }
}
