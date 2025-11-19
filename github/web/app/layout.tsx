import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Anchor - Focus Tracking",
  description: "Track your focus sessions and stay anchored",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-white">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pb-20 md:pb-24">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
