import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";
import { RegisterForm } from "@/features/auth/components/register-form";
import { isGoogleAuthEnabled } from "@/server/auth";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create an account"
      description="Start planning your events"
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense fallback={<AuthFormSkeleton fields={4} />}>
        <RegisterForm googleEnabled={isGoogleAuthEnabled} />
      </Suspense>
    </AuthCard>
  );
}
