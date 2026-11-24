import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/\p{L}/u, "Password must contain a letter")
  .regex(/\d/, "Password must contain a digit");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
  callbackUrl: z.string().optional(),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().max(80, "Name is too long"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    callbackUrl: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;

export const DEFAULT_REDIRECT = "/events";

export function safeCallbackUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_REDIRECT;
  try {
    const { protocol, pathname, search, hash } = new URL(url, "http://localhost");
    if (protocol !== "http:" && protocol !== "https:") return DEFAULT_REDIRECT;
    if (pathname.startsWith("//") || pathname.startsWith("/\\")) return DEFAULT_REDIRECT;
    const path = `${pathname}${search}${hash}`;
    return path === "/" || path.startsWith("/login") || path.startsWith("/register")
      ? DEFAULT_REDIRECT
      : path;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
