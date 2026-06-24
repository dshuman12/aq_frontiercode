import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { API_BASE_URL } from "@/app/constants/constants";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const state = body.state ?? "instagram-connect-new";

        const authResponse = await fetch(`${API_BASE_URL}/users/instagram-oauth/authorize`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${(session as { accessToken?: string }).accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ state }),
        });

        if (!authResponse.ok) {
            const errorData = await authResponse.json();
            throw new Error(errorData.message ?? "Failed to get Instagram authorization URL");
        }

        const authData = await authResponse.json();
        return NextResponse.json({
            success: true,
            authUrl: authData.authorizationUrl,
            state: authData.state,
        });
    } catch (error) {
        console.error("Instagram OAuth authorize error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get Instagram authorization URL" },
            { status: 500 }
        );
    }
}
