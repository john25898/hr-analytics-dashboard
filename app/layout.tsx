import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/auth-gate";
import { DataSync } from "@/components/data-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHAK HR management",
  description:
    "Professional HR employee management and compliance tracking system",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        <AuthGate>
          <DataSync />
          {children}
        </AuthGate>
      </body>
    </html>
  );
}
