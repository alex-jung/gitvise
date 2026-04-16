import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/context/toast-context";
import { ToastContainer } from "@/components/toast-container";
import { PluginProvider } from "@/context/plugin-context";
import { LicenseProvider } from "@/context/license-context";

export const metadata: Metadata = {
  title: "Gitvise",
  description: "GitHub Dashboard for orgs & users",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark">
      <body>
        <ToastProvider>
          <LicenseProvider>
            <PluginProvider>
              {children}
            </PluginProvider>
          </LicenseProvider>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
