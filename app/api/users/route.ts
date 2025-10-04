import { NextRequest, NextResponse } from 'next/server';
import { getUsersAction, deleteUsersAction } from '@/app/dashboard/user/user-actions';

// GET /api/users - Fetch all users. Supports optional ?role=Manager to filter by role.
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url)
        const role = url.searchParams.get('role')

        let users = await getUsersAction()

        if (role) {
            users = users.filter((u: any) => u.role === role)
        }

        return NextResponse.json(users)
    } catch (error) {
        console.error('Error fetching users:', error)
        // Return empty array instead of error to prevent frontend crash
        return NextResponse.json([])
    }
}

// DELETE /api/users - Delete multiple users
export async function DELETE(request: NextRequest) {
    try {
        const { userIds } = await request.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: 'No user IDs provided' },
                { status: 400 }
            );
        }

        const result = await deleteUsersAction(userIds);
        return NextResponse.json({ message: result });
    } catch (error) {
        console.error('Error deleting users:', error);
        return NextResponse.json(
            { error: 'Failed to delete users' },
            { status: 500 }
        );
    }
}
