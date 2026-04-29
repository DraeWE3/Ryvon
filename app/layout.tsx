import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { QueryProvider } from "@/components/query-provider";
import { Toaster as HotToaster } from "react-hot-toast";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import ComingSoonOverlay from "@/components/coming-soon-overlay";

export const metadata: Metadata = {
  metadataBase: new URL("https://ryvon.ai"),
  title: "Ryvon AI | Advanced Intelligent Infrastructure",
  description: "The elite orchestration layer for advanced AI workflows, autonomous voice agents, and next-generation multi-modal intelligence.",
  icons: {
    icon: "/favicon.webp",
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Toaster 
            position="top-center" 
            toastOptions={{
              className: 'ryvon-toast',
              style: {
                background: 'rgba(9, 12, 21, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(50, 162, 242, 0.2)',
                color: '#fff',
                borderRadius: '16px',
                fontFamily: 'inherit',
              }
            }}
          />
          <HotToaster position="top-center" />
          <QueryProvider>
            <SessionProvider>
              <ComingSoonOverlay>
                {children}
              </ComingSoonOverlay>
            </SessionProvider>
          </QueryProvider>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}