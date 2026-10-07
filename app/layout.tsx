import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "KP2KP Digital Signage — Admin Dashboard",
  description: "Pusat Pengelolaan Konten Display Samsung TV Portrait KP2KP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          KP2KP Digital Signage Enterprise &copy; {new Date().getFullYear()} Direktorat Jenderal Pajak
        </footer>
      </body>
    </html>
  );
}
