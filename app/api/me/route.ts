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

      // Try to include company base currency if possible
      let companyBaseCurrency = null
      if (u.companyId) {
        try {
          const company = await db.select().from((await import('@/src/db/schema')).companies).where((await import('drizzle-orm')).eq((await import('@/src/db/schema')).companies.id, u.companyId)).limit(1)
          if (company && company.length > 0) companyBaseCurrency = company[0].baseCurrencyCode
        } catch (e) {
          // ignore
        }
      }

      return NextResponse.json({ id: u.id, name: u.name, role: u.role, managerId: u.managerId, companyId: u.companyId, companyBaseCurrency })
    }

    // fallback: return the first user
    const all = await db.select().from(users).limit(1)
    const u = all[0]
    if (!u) return NextResponse.json({})

    let companyBaseCurrency = null
    if (u.companyId) {
      try {
        const company = await db.select().from((await import('@/src/db/schema')).companies).where((await import('drizzle-orm')).eq((await import('@/src/db/schema')).companies.id, u.companyId)).limit(1)
        if (company && company.length > 0) companyBaseCurrency = company[0].baseCurrencyCode
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ id: u.id, name: u.name, role: u.role, managerId: u.managerId, companyId: u.companyId, companyBaseCurrency })
  } catch (e) {
    console.error(e)
    return NextResponse.json({}, { status: 500 })
  }
}
