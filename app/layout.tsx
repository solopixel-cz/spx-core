import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Saira } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brand font ze solopixel.cz — používá se na nadpisy
const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "SPX Core",
  description: "Interní CRM a provozní centrum pro SoloPixel",
  icons: {
    apple: "/icons/apple-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    title: "SPX Core",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} ${saira.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
