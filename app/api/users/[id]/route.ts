import { db } from "@/src"
import { users } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await params.id
        const data = await request.json()

        // Validate required fields
        if (!data.name || !data.email || !data.role) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        // Validate role
        const validRoles = ["Admin", "Manager", "Employee"]
        if (!validRoles.includes(data.role)) {
            return new NextResponse("Invalid role", { status: 400 })
        }

        // Update user
        await db
            .update(users)
            .set({
                name: data.name,
                email: data.email,
                role: data.role,
                managerId: data.managerId,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))

        return new NextResponse("User updated successfully", { status: 200 })
    } catch (error) {
        console.error("Error updating user:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error("Error fetching user:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id

        // Delete user
        await db.delete(users).where(eq(users.id, userId))

        return new NextResponse("User deleted successfully", { status: 200 })
    } catch (error) {
        console.error("Error deleting user:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}