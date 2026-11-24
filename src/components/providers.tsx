"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { TimeZoneSync } from "@/components/time-zone-sync";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NuqsAdapter>
        <TooltipProvider delayDuration={300}>
          {children}
          <TimeZoneSync />
          <Toaster richColors closeButton position="bottom-right" />
        </TooltipProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
