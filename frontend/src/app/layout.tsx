import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Auction Multiplayer",
  description: "Real-time multiplayer IPL auction simulator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
