import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SideQuest",
  description: "A co-op quest board for homework, habits, clubs, chores, and projects.",
  applicationName: "SideQuest",
  manifest: "/assets/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/assets/favicon/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/favicon/favicon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/assets/favicon/favicon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/assets/favicon/favicon-32.png"]
  },
  openGraph: {
    title: "SideQuest",
    description: "Real life. Quest mode.",
    siteName: "SideQuest",
    type: "website",
    images: [
      {
        url: "/assets/social/og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "SideQuest — real life, quest mode."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "SideQuest",
    description: "Real life. Quest mode.",
    images: ["/assets/social/og-1200x630.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffd43d"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
