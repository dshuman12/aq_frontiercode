import { SWRegistration } from "@/components/providers/ServiceWorkerRegistration";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  variable: "--font-nastaliq",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Subhan Traders POS",
  description: "Point of Sale System for Subhan Traders",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cycle POS",
  },
};

export const viewport = {
  themeColor: "#16a34a",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRTL = locale === 'ur';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={`${inter.variable} ${nastaliq.variable} ${isRTL ? 'font-nastaliq' : 'font-sans'} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <SWRegistration />
            {children}
            <Toaster richColors position={isRTL ? "top-left" : "top-right"} />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
