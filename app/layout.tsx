import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BotPanel – Chatbot Verwaltung',
  description: 'Admin panel pentru boti de programari',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
