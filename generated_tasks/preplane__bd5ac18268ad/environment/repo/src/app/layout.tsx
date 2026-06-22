import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MathJaxContext } from "better-react-mathjax";

import { Toaster } from "sonner";
import { AssessmentProvider } from "@/contexts/assessment-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PrepLane",
    template: "%s | PrepLane",
  },
  description: "SAT practice and review.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://preplane.vercel.app"
  ),
};

const mathJaxConfig = {
  loader: { load: ["input/mml", "output/chtml"] },
  mml: {},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AssessmentProvider>
          <MathJaxContext version={3} config={mathJaxConfig}>
            {children}
          </MathJaxContext>
        </AssessmentProvider>

        {process.env.GA_KEY && <GoogleAnalytics gaId={process.env.GA_KEY} />}
        {process.env.GT_KEY && <GoogleTagManager gtmId={process.env.GT_KEY} />}
        <SpeedInsights />
        <Analytics />
        <Toaster position="bottom-right" expand={true} closeButton={true} />
      </body>
    </html>
  );
}
