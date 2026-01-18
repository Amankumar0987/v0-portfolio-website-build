import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "Aman Kumar | Web Developer Portfolio",
  description:
    "Passionate web developer crafting pixel-perfect, accessible digital experiences. Explore my projects, skills, and get in touch.",
  keywords: [
    "Web Developer",
    "Frontend Developer",
    "React",
    "Next.js",
    "Portfolio",
    "Aman Kumar",
  ],
  authors: [{ name: "Aman Kumar" }],
  creator: "Aman Kumar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://amankumar.dev",
    siteName: "Aman Kumar Portfolio",
    title: "Aman Kumar | Web Developer Portfolio",
    description:
      "Passionate web developer crafting pixel-perfect, accessible digital experiences.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aman Kumar | Web Developer Portfolio",
    description:
      "Passionate web developer crafting pixel-perfect, accessible digital experiences.",
    creator: "@amankumar",
  },
  robots: {
    index: true,
    follow: true,
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
