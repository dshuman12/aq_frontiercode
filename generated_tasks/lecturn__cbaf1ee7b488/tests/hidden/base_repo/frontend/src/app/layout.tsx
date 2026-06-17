import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Providers } from "~/components/providers";
import { SiteChrome } from "~/components/site-chrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Lecturn — your self-hosted lecture hall",
  description: "A focused player for your local video courses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} min-h-screen`}
        suppressHydrationWarning
      >
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
