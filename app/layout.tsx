import type { Metadata } from "next"
import "./globals.css"
import { VideoRiskProvider } from "@/contexts/VideoRiskContext"

export const metadata: Metadata = {
  title: "CourtsideIQ",
  description: "Basketball analytics platform for workload-based injury risk and minute optimization",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <VideoRiskProvider>{children}</VideoRiskProvider>
      </body>
    </html>
  )
}
