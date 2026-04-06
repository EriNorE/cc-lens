import type { Metadata } from "next";
import { Geist_Mono, Press_Start_2P } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MainContent } from "@/components/layout/main-content";
import { ThemeProvider } from "@/components/theme-provider";
import { WelcomeOverlay } from "@/components/onboarding/welcome-overlay";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claude Code Lens",
  description: "Local Claude Code analytics. Reads directly from ~/.claude/",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');t=['light','dark'].indexOf(t)!==-1?t:'dark';document.documentElement.classList.add(t);})()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
          <BottomNav />
          <WelcomeOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
