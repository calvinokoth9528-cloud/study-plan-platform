import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Plan Platform",
  description: "Plan, track, and repair your study schedule",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/app-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Study Plan",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "var(--accent)" },
    { media: "(prefers-color-scheme: dark)", color: "var(--accent)" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col text-[var(--text-primary)] bg-[var(--bg-secondary)]">
        <Providers>
          {children}
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
