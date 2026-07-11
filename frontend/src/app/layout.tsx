import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
// Logo is served statically from public/logo.png

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Safe WA API — Anti-Ban WhatsApp Gateway",
  description: "Platform pengiriman pesan WhatsApp massal aman dari blokir dengan teknologi ZWC, Smart Queue, dan AI Warm-Up otomatis.",
  verification: {
    google: "l7uHifK95u55jHl0p8MpBIPPaZAYi6sFHgpsqg6U964",
  },
  keywords: ["WhatsApp API", "Anti-Ban WhatsApp", "WA Gateway", "WhatsApp Bot", "WhatsApp Marketing", "Kirim WA Massal Aman", "ZWC Anti Ban", "Baileys WhatsApp API", "Auto Warmup WA", "WA Blaster"],
  authors: [{ name: "Safe WA API" }],
  openGraph: {
    title: "Safe WA API — Anti-Ban WhatsApp Gateway",
    description: "Platform pengiriman pesan WhatsApp massal aman dari blokir dengan teknologi ZWC, Smart Queue, dan AI Warm-Up otomatis.",
    type: "website",
    url: "https://appwa.netlify.app",
    siteName: "Safe WA API",
  },
  twitter: {
    card: "summary_large_image",
    title: "Safe WA API — Anti-Ban WhatsApp Gateway",
    description: "Platform pengiriman pesan WhatsApp massal aman dari blokir dengan teknologi ZWC, Smart Queue, dan AI Warm-Up otomatis.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ margin: 0, padding: 0 }}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
