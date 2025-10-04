"use client"

import Image from "next/image"
import { cn } from "@/lib/utils" // Assuming this path is correct
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useState } from "react"
import { useForm } from "react-hook-form"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { loginAction } from "./login-action";

const formSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof formSchema>;
// Define the expected server action result structure
type ActionState = { status: string, message: string, errors?: Record<string, string[]> };


export default function LoginPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <LoginFormPage />
            </div>
        </div>
    )
}

// --- Main Login Component with State and Handler ---
export function LoginFormPage({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    // Using ActionState to capture server errors if any
    const [formState, setFormState] = useState<ActionState>({ status: 'idle', message: '' });

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: LoginFormValues) {
        setIsLoading(true);
        setFormState({ status: 'idle', message: '' });

        // Convert form values to FormData for the server action
        const formData = new FormData();
        formData.append('email', values.email);
        formData.append('password', values.password);

        try {
            const result = await loginAction(formState, formData);
            setFormState({ status: result.status, message: result.message });

            if (result.status === 'success') {
                toast.success(result.message);
                // Redirect to dashboard upon successful login
                router.push("/dashboard");
            } else {
                toast.error(result.message);

                // Set field-specific errors if returned (e.g., if the action returns 'email' or 'password' error)
                if (result.errors) {
                    Object.entries(result.errors).forEach(([key, messages]) => {
                        // Ensure key is valid before setting error
                        if (key === 'email' || key === 'password') {
                            form.setError(key as keyof LoginFormValues, {
                                type: 'server',
                                message: messages[0],
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Client side error during login:", error);
            toast.error("An unexpected error occurred. Please check your network.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="p-8"> {/* Wrapper for the form content */}
                        <LoginFormComponent
                            form={form}
                            onSubmit={onSubmit}
                            isLoading={isLoading}
                        />
                    </div>
                    <div className="bg-muted relative hidden md:block">
                        <Image
                            src="/placeholder.jpg"
                            width={1000}
                            height={1000}
                            alt="Image showing login screen with secure data management"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.9] dark:saturate-90"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
                <span className="hidden md:block">
                    Crafted with ❤️ by{" "} <a href="https://github.com/ayushsingh-ayushsingh" className="underline" target="_blank" rel="noopener noreferrer">Ayush Singh</a>
                    {" "} | {" "}&copy; {new Date().getFullYear()} All rights reserved.
                </span>
                <span className="block md:hidden">
                    Crafted with ❤️ by{" "} <a href="https://github.com/ayushsingh-ayushsingh" className="underline" target="_blank" rel="noopener noreferrer">Ayush Singh</a>
                </span>
            </div>
        </div>
    )
}

// --- Form Component ---

type LoginFormComponentProps = {
    form: ReturnType<typeof useForm<LoginFormValues>>;
    onSubmit: (values: LoginFormValues) => Promise<void>;
    isLoading: boolean;
};

export function LoginFormComponent({ form, onSubmit, isLoading }: LoginFormComponentProps) {

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
            >
                <div className="grid grid-cols-12 gap-4">
                    <Link href={"/"} className="col-span-12 flex items-center gap-1 text-sm text-muted-foreground w-min p-0 pb-3 hover:text-primary transition-colors">
                        <ArrowLeft className="size-4" /><span>Home</span>
                    </Link>
                    <h1 className="col-span-12 text-2xl font-bold mb-4">Log In to Your Account</h1>

                    {/* Email Field */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="col-span-12 flex flex-col gap-2 space-y-0 items-start">
                                <FormLabel className="flex shrink-0">Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="me@example.com" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Password Field */}
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="col-span-12 flex flex-col gap-2 space-y-0 items-start">
                                <FormLabel className="flex shrink-0">Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="col-span-12 pt-2 grid grid-cols-12 gap-4">
                        <Button
                            className="col-span-12 w-full"
                            type="submit"
                            variant="default"
                            disabled={isLoading}
                        >
                            {isLoading ? "Logging In..." : "Log In"}
                        </Button>
                    </div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/signup" className="underline hover:text-primary">
                        Sign Up
                    </Link>
                </div>
            </form>
        </Form>
    );
}
