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

        const { code, state } = await request.json();
        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const callbackResponse = await fetch(`${API_BASE_URL}/users/instagram-oauth/callback`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${(session as { accessToken?: string }).accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, state }),
        });

        if (!callbackResponse.ok) {
            const errorData = await callbackResponse.json();
            throw new Error(errorData.message ?? "Failed to connect Instagram account");
        }

        const data = await callbackResponse.json();
        return NextResponse.json({
            success: data.success,
            tokens: data.tokens,
            user: data.user,
            message: data.message ?? "Instagram connected",
        });
    } catch (error) {
        console.error("Instagram OAuth callback error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to connect Instagram account" },
            { status: 500 }
        );
    }
}
