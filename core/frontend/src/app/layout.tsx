import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/toast-container";

export const metadata: Metadata = {
  title: "Gitvise",
  description: "GitHub Dashboard for orgs & users",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark">
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
