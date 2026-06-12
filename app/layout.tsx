import type { Metadata } from 'next'
import './globals.css'
import Script from "next/script";

export const metadata: Metadata = {
  title: 'FB Post Scheduler',
  description: 'AI-powered Facebook post scheduler with Buffer integration',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}
        <Script src="https://nut-analytics-production.up.railway.app/js/script.js" data-site="44df209d7a23" strategy="afterInteractive" />
      </body>
    </html>
  )
}
