"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export function CalendlyProvider() {
    const { data: session } = useSession();
    const pathname = usePathname();

    useEffect(() => {
        // Only initialize Calendly badge widget on authenticated routes
        const isAuthRoute = pathname?.startsWith('/auth/') || pathname === '/';
        const shouldInitialize = session && !isAuthRoute;

        if (shouldInitialize && typeof window !== 'undefined' && (window as any).Calendly) {
            (window as any).Calendly.initBadgeWidget({
                url: 'https://calendly.com/henryburreson/repflow-onboarding-w-henry',
                text: 'Support Call',
                color: '#d4f6db',
                textColor: '#23382f',
                branding: false
            });
        }
    }, [session, pathname]);

    return null; // This component doesn't render anything
}
