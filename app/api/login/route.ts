import { NextResponse } from 'next/server'
import { z } from 'zod'
import * as bcrypt from 'bcryptjs'
import { db } from '@/src'
import { users } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ status: 'error', message: 'Invalid input', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { email, password } = parsed.data

    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = userRows[0]

    if (!user) {
      return NextResponse.json({ status: 'error', message: 'Invalid email or password.' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return NextResponse.json({ status: 'error', message: 'Invalid email or password.' }, { status: 401 })
    }

    return NextResponse.json({ status: 'success', message: 'Login successful!', userId: user.id })
  } catch (e) {
    console.error('Login API Error', e)
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 })
  }
}
