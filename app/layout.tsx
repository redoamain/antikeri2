import { Geist_Mono, Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { Metadata, Viewport } from "next"
import { PwaPrompt } from "@/components/PwaPrompt"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: "Antikeri — Presensi PT. Citi Plumb",
    template: "%s | Antikeri",
  },
  description: "Presensi Online modern, cepat, dan mudah digunakan — PT. Citi Plumb",
  applicationName: "Antikeri Presensi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Presensi Citi Plumb",
  },
  formatDetection: {
    telephone: false,
  },

  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "android-chrome",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },

  openGraph: {
    title: "Antikeri — Presensi PT. Citi Plumb",
    description: "Presensi Online modern, cepat, dan mudah digunakan — PT. Citi Plumb",
    url: "https://antikeri.citiplumb.id",
    siteName: "Antikeri",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Antikeri",
      },
    ],
    locale: "id_ID",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Antikeri — Presensi PT. Citi Plumb",
    description: "Presensi Online modern, cepat, dan mudah digunakan — PT. Citi Plumb",
    images: ["/android-chrome-512x512.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-screen bg-background text-foreground transition-colors">
        <ThemeProvider>
          {children}
          <PwaPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}