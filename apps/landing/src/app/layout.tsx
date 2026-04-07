import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gitvise – GitHub Dashboard für Orgs & User",
  description:
    "Self-Hosted Analytics & Insights für alle deine Repositories. Repository Health, CI/CD Metriken, Dependency Status, Team Activity – alles an einem Ort.",
  openGraph: {
    title: "gitvise",
    description: "Your GitHub. Your Infrastructure. Full Visibility.",
    url: "https://gitvise.dev",
    siteName: "gitvise",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
