import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentSession } from "@/lib/server/auth";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/shared/app-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {session && (
          <div className="border-b bg-white/90 px-6 py-3 text-sm text-slate-700 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div>
                <strong>{session.name}</strong>
                <span className="ml-2 text-slate-500">{session.email}</span>
              </div>
              <form action="/api/auth/logout" method="post">
                <button className="rounded border px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  Sair
                </button>
              </form>
            </div>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
