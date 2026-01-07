import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikTok Live Quiz - Interactive Quiz Game",
  description: "Real-time interactive quiz game for TikTok Live with cyberpunk neon design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
