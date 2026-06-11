import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoniKu",
  description: "Local-first personal finance application",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

import { BottomNav } from "@/components/layout/BottomNav";
import { AppInit } from "@/components/providers/AppInit";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/20">
        <GoogleOAuthProvider clientId={clientId}>
          <AppInit>
            <div className="relative flex min-h-screen w-full flex-col bg-background shadow-xl md:max-w-md md:mx-auto">
              <main className="flex-1 overflow-y-auto pb-20">{children}</main>
              <BottomNav />
            </div>
          </AppInit>
        </GoogleOAuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
