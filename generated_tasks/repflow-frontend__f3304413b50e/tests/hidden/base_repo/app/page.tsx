import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
    // Get the session on the server side
    const session = await getServerSession(authOptions);
    
    if (session) {
        // User is authenticated, redirect to creator dashboard
        redirect("/creator");
    } else {
        // User is not authenticated, redirect to sign-in page
        redirect("/auth/signin");
    }
}