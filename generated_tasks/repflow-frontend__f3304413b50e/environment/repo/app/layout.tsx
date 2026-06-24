import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";
import { SelectedUsersProvider } from "@/contexts/SelectedUsersContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Repflow - Creator Management Platform",
    description: "Streamline your creator partnerships and deal management",
    generator: "v0.dev",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
                <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async />
            </head>
            <body className={inter.className}>
                <AuthProvider>
                    <SelectedUsersProvider>
                        {children}
                        <Toaster />
                    </SelectedUsersProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
