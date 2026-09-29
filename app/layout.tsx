import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const defaultUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? process.env.NEXT_PUBLIC_VERCEL_URL
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Veris — Autonomous Milestone Escrow & On-Chain Delivery Reputation",
  description:
    "Institutional-grade autonomous multi-agent escrow on Arc Testnet (5042002) with AI verification calibration and deterministic on-chain delivery reputation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="bg-[#05070E] text-[#F1F5F9] font-sans antialiased min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              className: "border border-cyan-500/30 bg-[#0B101E]/95 backdrop-blur-xl text-slate-100 font-sans shadow-2xl shadow-black/80",
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
