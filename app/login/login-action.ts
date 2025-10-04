"use server";

import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { db } from '@/src';
import { companies, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

const LoginSchema = z.object({
    email: z.string().email("Invalid email address."),
    password: z.string().min(1, "Password is required."),
});

type LoginInput = z.infer<typeof LoginSchema>;

type LoginResult = {
    status: 'success' | 'error';
    message: string;
    errors?: Record<string, string[]>;
    userId?: string;
};

// --- 2. SERVER ACTION ---

/**
 * Handles the user login process, verifying credentials against the database.
 * This function runs on the server.
 * @param prevState The previous state returned by the action.
 * @param formData The form data object submitted by the client.
 * @returns A status object indicating success or failure.
 */
export async function loginAction(prevState: any, formData: FormData): Promise<LoginResult> {
    'use server';

    const input: LoginInput = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    // Input Validation
    const validatedFields = LoginSchema.safeParse(input);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Validation failed.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { email, password } = validatedFields.data;

    try {
        // 1. Find the user by email
        // Using Drizzle's select for explicit query
        const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const existingUser = userRecords[0];

        if (!existingUser) {
            // Return generic error message for security (don't reveal if email exists)
            return {
                status: 'error',
                message: 'Invalid email or password.',
                errors: { general: ['Invalid email or password.'] },
            };
        }

        // 2. Compare the provided password with the stored hash
        const passwordMatch = await bcrypt.compare(password, existingUser.passwordHash);

        if (!passwordMatch) {
            // Return generic error message for security
            return {
                status: 'error',
                message: 'Invalid email or password.',
                errors: { general: ['Invalid email or password.'] },
            };
        }

        // SUCCESS: In a real app, you would start a session here (e.g., set an auth cookie)
        // redirect('/dashboard');

        return {
            status: 'success',
            message: 'Login successful!',
            userId: existingUser.id,
        };

    } catch (error) {
        console.error('Login Action Failed:', error);
        return {
            status: 'error',
            message: 'A critical server error occurred. Please try again.',
        };
    }
}
