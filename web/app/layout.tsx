import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Anchor - Deep Focus for Students",
  description: "Track your focus sessions and stay anchored in your studies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900">
        <AuthProvider>
          <main className="min-h-screen pb-24 md:pb-32 pt-6 px-4 md:px-8 max-w-7xl mx-auto">
            {children}
          </main>
          <Navbar />
        </AuthProvider>
      </body>
    </html>
  );
}
