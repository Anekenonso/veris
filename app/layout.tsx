import { Oxanium } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-sans",
});

const defaultUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? process.env.NEXT_PUBLIC_VERCEL_URL
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Veris — Milestone Escrow & On-Chain Delivery Reputation",
  description:
    "Autonomous multi-agent milestone escrow with AI deliverable verification, deterministic settlement, and on-chain delivery reputation on Arc Testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={oxanium.variable} suppressHydrationWarning>
      <body className="bg-[#070A12] text-foreground font-sans antialiased min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Toaster position="top-right" richColors />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
