"use server";

import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { db } from '@/src';
import { companies, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

const SignupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    countryCurrency: z.string().min(4, "Please select a country and currency."),
});

type SignupInput = z.infer<typeof SignupSchema>;

type SignupResult = {
    status: 'success' | 'error';
    message: string;
    errors?: Record<string, string[]>;
    companyId?: string;
    userId?: string;
};


const parseCountryCurrency = (value: string): { currency_code: string } => {
    const parts = value.split('-');
    const currency_code = parts.pop()?.trim().toUpperCase() || 'USD';
    return { currency_code };
}

export async function signupAction(prevState: any, formData: FormData): Promise<SignupResult> {
    'use server';

    const input = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        countryCurrency: formData.get('countryCurrency') as string,
    };

    const validatedFields = SignupSchema.safeParse(input);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Validation failed.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { name, email, password, countryCurrency } = validatedFields.data;
    const { currency_code: baseCurrencyCode } = parseCountryCurrency(countryCurrency);

    try {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) {
            return {
                status: 'error',
                message: 'A user with this email already exists.',
                errors: { email: ['Email already in use.'] },
            };
        }
    } catch (dbError) {
        console.error('Database pre-check error:', dbError);
        return {
            status: 'error',
            message: 'A server error occurred during validation.',
        };
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        let newCompanyId: string = "";
        let newUserId: string = "";

        await db.transaction(async (tx) => {
            const [newCompany] = await tx.insert(companies).values({
                name: `${name}'s Expense Management`,
                baseCurrencyCode: baseCurrencyCode,
            }).returning({ id: companies.id });

            if (!newCompany) {
                throw new Error("Failed to create company record.");
            }
            newCompanyId = newCompany.id;

            const [newUser] = await tx.insert(users).values({
                companyId: newCompanyId,
                name: name,
                email: email,
                passwordHash: passwordHash,
                role: 'Admin',
            }).returning({ id: users.id });

            if (!newUser) {
                throw new Error("Failed to create admin user record.");
            }
            newUserId = newUser.id;

            console.log(`Admin User ${newUserId} created for Company ${newCompanyId}`);
        });

        return {
            status: 'success',
            message: 'Signup complete! Your company and admin account have been created.',
            companyId: newCompanyId,
            userId: newUserId,
        };

    } catch (error) {
        console.error('Signup Action Failed:', error);

        if (error instanceof Error) {
            if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                return {
                    status: 'error',
                    message: 'A user with this email already exists.',
                    errors: { email: ['Email already in use.'] },
                };
            }
        }

        return {
            status: 'error',
            message: 'A critical server error occurred during the transaction. Please try again.',
        };
    }
}
