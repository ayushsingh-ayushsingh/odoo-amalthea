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
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
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
import countryData from "./country-json.json";
import { signupAction } from "./signup-action";

const formSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters long").max(50, "Name must not exceed 50 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string(),
    countryCurrency: z.string().min(1, "Please select your company's country/currency"),
})
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"], // Apply the error to the confirmPassword field
    });

type SignupFormValues = z.infer<typeof formSchema>;
// Define the expected server action result structure (matching login-action/signup-action result)
type ActionState = { status: string, message: string, errors?: Record<string, string[]> };


export default function SignupPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <SignupForm />
            </div>
        </div>
    )
}

// --- Main Signup Component with State and Handler ---
export function SignupForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formState, setFormState] = useState<ActionState>({ status: 'idle', message: '' });


    const form = useForm<SignupFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            countryCurrency: "",
        },
    })

    async function onSubmit(values: SignupFormValues) {
        setIsLoading(true);
        setFormState({ status: 'idle', message: '' });

        // Convert form values to FormData for the server action
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('email', values.email);
        formData.append('password', values.password);
        // Only send the selected country/currency string
        formData.append('countryCurrency', values.countryCurrency);

        try {
            // Call the server action
            const result = await signupAction(formState, formData);
            setFormState({ status: result.status, message: result.message });

            if (result.status === 'success') {
                toast.success(result.message);
                // Redirect to login after successful company and admin creation
                router.push("/login");
            } else {
                // Handle server-side errors (e.g., email already exists, transaction failure)
                toast.error(result.message);

                if (result.errors) {
                    Object.entries(result.errors).forEach(([key, messages]) => {
                        // Ensure key is part of the form fields to set the error correctly
                        if (key in form.getValues()) {
                            form.setError(key as keyof SignupFormValues, {
                                type: 'server',
                                message: messages[0],
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Client side error during signup:", error);
            toast.error("An unexpected error occurred. Please check your network connection.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="p-8"> {/* Wrapper for the form content */}
                        <CompanySignupForm
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
                            alt="Image showing expense management tools"
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

// --- Form Component (Refactored for clarity and functionality) ---

// Define a type for the form props to pass them from the parent
type CompanySignupFormProps = {
    form: ReturnType<typeof useForm<SignupFormValues>>;
    onSubmit: (values: SignupFormValues) => Promise<void>;
    isLoading: boolean;
};

export function CompanySignupForm({ form, onSubmit, isLoading }: CompanySignupFormProps) {

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
                    <h1 className="col-span-12 text-2xl font-bold mb-4">Create Admin Account</h1>

                    {/* Name Field (was text-input-0) */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="col-span-12 flex flex-col gap-2 space-y-0 items-start">
                                <FormLabel className="flex shrink-0">Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John Doe" type="text" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Email Field (was email-input-0) */}
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

                    {/* Password Field (was password-input-0) */}
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

                    {/* Confirm Password Field (was password-input-1) */}
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem className="col-span-12 flex flex-col gap-2 space-y-0 items-start">
                                <FormLabel className="flex shrink-0">
                                    Confirm Password
                                </FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="countryCurrency"
                        render={({ field }) => (
                            <FormItem className="col-span-12 flex flex-col gap-2 space-y-0 items-start w-full">
                                <FormLabel className="flex shrink-0">Company Country & Currency</FormLabel>
                                <FormControl>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Country (sets base currency)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countryData.map(({ country, currency_code }) => (
                                                <SelectItem
                                                    key={`${country}-${currency_code}`}
                                                    value={`${country}-${currency_code}`}
                                                >
                                                    {`${country} (${currency_code})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="col-span-12 pt-2 grid grid-cols-12 gap-4">
                        <Button
                            className="col-span-6 w-full"
                            type="reset"
                            variant="outline"
                            onClick={() => form.reset()}
                            disabled={isLoading}
                        >
                            Reset
                        </Button>
                        <Button
                            className="col-span-6 w-full"
                            type="submit"
                            variant="default"
                            disabled={isLoading}
                        >
                            {isLoading ? "Creating Company..." : "Sign Up"}
                        </Button>
                    </div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="underline hover:text-primary">
                        Log In
                    </Link>
                </div>
            </form>
        </Form>
    );
}
