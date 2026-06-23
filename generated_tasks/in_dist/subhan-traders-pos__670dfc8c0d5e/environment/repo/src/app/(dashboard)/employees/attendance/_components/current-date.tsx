"use client";

import { useEffect, useState } from "react";

export function CurrentDate() {
    // Use state to avoid hydration mismatch (server renders nothing or generic, client renders date)
    // Or just render directly if we accept slight mismatch, but better to be safe.
    // Actually, for a date string like "Fri Jan 29 2026", it changes daily. 
    // If the server prerenders this page on day X, and user views it on day Y, a static server component is WRONG anyway.
    // So Client Component is definitely the right choice.
    
    const [dateStr, setDateStr] = useState("");

    useEffect(() => {
        setDateStr(new Date().toDateString());
    }, []);

    if (!dateStr) return null; // or a skeleton

    return <>{dateStr}</>;
}
