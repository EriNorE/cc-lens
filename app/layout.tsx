import type { Metadata } from 'next'
import { Geist_Mono, Press_Start_2P } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ThemeProvider } from '@/components/theme-provider'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const pressStart2P = Press_Start_2P({
  variable: '--font-press-start',
  weight: '400',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Claude Code Lens',
  description: 'Local Claude Code analytics. Reads directly from ~/.claude/',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(t);})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${geistMono.variable} ${pressStart2P.variable} antialiased`}>
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-56 min-h-screen overflow-x-hidden bg-background pb-16 md:pb-0">
              {children}
            </main>
          </div>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
