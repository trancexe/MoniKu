import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoniKu",
  description: "Local-first personal finance application",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { BottomNav } from "@/components/layout/BottomNav";
import { AppInit } from "@/components/providers/AppInit";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

import { AuthGuard } from "@/components/auth/AuthGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-muted/20 text-base">
        <LocaleProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <GoogleOAuthProvider clientId={clientId}>
              <AppInit>
                <div className="relative z-10 flex min-h-screen w-full flex-col bg-background shadow-2xl md:max-w-md md:mx-auto md:rounded-2xl md:my-4 md:border">
                  <AuthGuard>
                    <main className="flex-1 overflow-y-auto pb-28">{children}</main>
                    <BottomNav />
                  </AuthGuard>
                </div>
              </AppInit>
            </GoogleOAuthProvider>
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
