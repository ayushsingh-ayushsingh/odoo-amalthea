import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as any
    const expenseId = formData.get('expenseId')?.toString()

    if (!file || !expenseId) {
      return new Response('Missing file or expenseId', { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const mime = file.type || 'image/png'
    const ext = mime.split('/')?.[1] || 'png'
    const filename = `${crypto.randomUUID()}.${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.promises.mkdir(uploadDir, { recursive: true })
    const dest = path.join(uploadDir, filename)
    await fs.promises.writeFile(dest, buffer)

    // Persist receipt in DB
    const { db } = await import('@/src')
    const { receipts } = await import('@/src/db/schema')
    const [newRec] = await db.insert(receipts).values({ expenseId, imageUrl: `/uploads/${filename}` }).returning({ id: receipts.id, imageUrl: receipts.imageUrl, expenseId: receipts.expenseId })

    return new Response(JSON.stringify({ id: newRec.id, imageUrl: newRec.imageUrl }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Error uploading receipt', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const expenseId = url.searchParams.get('expenseId')
    if (!expenseId) return new Response('Missing expenseId', { status: 400 })

    const { db } = await import('@/src')
    const { receipts } = await import('@/src/db/schema')

    const rows = await db.select().from(receipts).where((await import('drizzle-orm')).eq(receipts.expenseId, expenseId)).orderBy(receipts.createdAt)
    return new Response(JSON.stringify(rows || []), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Error fetching receipts', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
