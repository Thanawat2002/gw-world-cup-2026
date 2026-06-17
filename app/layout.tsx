import type { Metadata } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GW World Cup 2026 — TERMINATOR",
  description: "Gentlewoman World Cup 2026 Elimination Tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${bebasNeue.variable} ${sourceSans3.variable}`}>
      <body>{children}</body>
    </html>
  );
}
