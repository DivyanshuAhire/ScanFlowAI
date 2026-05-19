import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/context/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ScanFlow — Smart Appointment Booking System",
  description: "An intelligent, real-time dental clinic appointment booking system with auto route clustering, directional tech flows, and automated scheduling engine.",
  keywords: ["ScanFlow", "Appointment Booking", "OSRM Routing", "Dental Scan Scheduling", "Dentistry Dispatches", "Geographic Clustering"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
