import { API_BASE_URL } from "@/app/constants/constants";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { emailRequest } = body;
        
        // Extract authorization header from request headers
        const authorizationHeader = request.headers.get('authorization');
        const authHeaders = authorizationHeader ? { 'Authorization': authorizationHeader } : {};

        if (!emailRequest) {
            return NextResponse.json(
                { error: "EmailRequest is required" },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!emailRequest.to_addresses || emailRequest.to_addresses.length === 0) {
            return NextResponse.json(
                { error: "At least one recipient email address is required" },
                { status: 400 }
            );
        }

        if (!emailRequest.subject) {
            return NextResponse.json(
                { error: "Email subject is required" },
                { status: 400 }
            );
        }

        if (!emailRequest.body_text && !emailRequest.body_html) {
            return NextResponse.json(
                { error: "Email body (text or HTML) is required" },
                { status: 400 }
            );
        }

        console.log("Sending email request:", emailRequest);

        // Prepare headers for backend request
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...authHeaders, // Include extracted authorization header
        };

        // Send email request to backend
        const response = await fetch(`${API_BASE_URL}/emails/send`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(emailRequest),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log("Email sent successfully:", result);

        return NextResponse.json({
            message: "Email sent successfully",
            messageId: result.messageId,
            result: result
        });

    } catch (error: any) {
        console.error("Error sending email:", error);

        // Handle specific error types
        if (error.message?.includes("Invalid email")) {
            return NextResponse.json(
                { error: "Invalid email address format" },
                { status: 400 }
            );
        }

        if (error.message?.includes("Rate limit")) {
            return NextResponse.json(
                { error: "Email rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 }
        );
    }
}
