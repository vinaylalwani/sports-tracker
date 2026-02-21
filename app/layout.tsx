import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Lakers Load Intelligence",
  description: "Basketball analytics platform for workload-based injury risk and minute optimization",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
