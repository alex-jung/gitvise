import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/ToastContainer";
import { SyncStatus } from "@/components/SyncStatus";

export const metadata: Metadata = {
  title: "Gitvise",
  description: "GitHub Dashboard für Orgs & User",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark">
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
          <SyncStatus />
        </ToastProvider>
      </body>
    </html>
  );
}
