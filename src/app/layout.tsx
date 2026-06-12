import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Test Series Portal",
  description: "Diagnostic-first test series and self-study portal"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
