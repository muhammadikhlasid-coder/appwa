import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import fs from "fs";
import path from "path";

try {
  const src = "C:\\Users\\M IKHLAS\\.gemini\\antigravity-ide\\brain\\4f901ee6-c08c-43eb-9643-3b3dd6d943ab\\safe_wa_api_logo_1783799616773.png";
  const dest = path.join(process.cwd(), "public", "logo.png");
  if (!fs.existsSync(dest) && fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
} catch (e) {}

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Safe WA API — Anti-Ban WhatsApp Platform",
  description: "Advanced WhatsApp API middleware with Smart Queue, ZWC Anti-Ban, and AI Warm-Up",
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
