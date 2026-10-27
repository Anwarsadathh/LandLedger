import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/server/auth/current-user";
import { MODERATOR_ROLES } from "@/server/auth/roles";
import { AppChrome } from "@/components/AppChrome";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getLocale } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OROVA — Land & property across India",
  description:
    "A transparent marketplace for plots, homes and farmland across India. Every listing shows exactly what was checked.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isModerator = user ? MODERATOR_ROLES.includes(user.role) : false;
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LanguageProvider locale={locale}>
          <AppChrome user={user ? { name: user.name, isModerator } : null}>{children}</AppChrome>
        </LanguageProvider>
      </body>
    </html>
  );
}
