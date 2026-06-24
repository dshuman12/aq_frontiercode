import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazy-load OpenAI client to avoid initialization during build
let openai: OpenAI | null = null;
function getOpenAIClient() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || "",
        });
    }
    return openai;
}

export async function POST(request: NextRequest) {
    try {
        const { message, context } = await request.json();
        
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        if (!context?.userData) {
            return NextResponse.json({ error: "User data is required" }, { status: 400 });
        }
        
        const userData = context.userData;
        // Support both User (profile.*) and flattened shapes for portfolio vs other contexts
        const profile = userData?.profile ?? userData;
        const repflowUsername = profile?.repflow_username ?? userData?.repflowUsername;
        const userEmail = repflowUsername ? `${repflowUsername}@repflow.me` : 'the creator';

        // Create a comprehensive context about the user
        const userContext = `
You are an AI assistant helping visitors learn about a creator on Repflow. Here's the information about this creator:

**Basic Information:**
- Name: ${(profile?.name ?? userData?.name) || 'Not provided'}
- Bio: ${(profile?.bio ?? userData?.bio) || 'Not provided'}
- Location: ${(profile?.location ?? userData?.location) || 'Not provided'}
- Website: ${(profile?.website ?? userData?.website) || 'Not provided'}

**Social Media Platforms:**
${userData?.platforms?.map((platform: any) => `
- ${platform.platformType}: ${platform.name} (${platform.handle})
  - Subscribers: ${platform.metrics?.subscribers || 'N/A'}
  - Total Views: ${platform.metrics?.totalViews || 'N/A'}
  - Engagement Rate: ${platform.metrics?.engagementRate || 'N/A'}
`).join('\n') || 'No platforms available'}

**Demographics (if available):**
${userData?.platforms?.find((p: any) => p.customFields?.demographicsByAge)?.customFields?.demographicsByAge ? 
  `Age Demographics: ${JSON.stringify(userData.platforms.find((p: any) => p.customFields?.demographicsByAge)?.customFields?.demographicsByAge)}` : 'No age demographics available'}

${userData?.platforms?.find((p: any) => p.customFields?.demographicsByGender)?.customFields?.demographicsByGender ? 
  `Gender Demographics: ${JSON.stringify(userData.platforms.find((p: any) => p.customFields?.demographicsByGender)?.customFields?.demographicsByGender)}` : 'No gender demographics available'}

${userData?.platforms?.find((p: any) => p.customFields?.demographicsByCountry)?.customFields?.demographicsByCountry ? 
  `Country Demographics: ${JSON.stringify(userData.platforms.find((p: any) => p.customFields?.demographicsByCountry)?.customFields?.demographicsByCountry)}` : 'No country demographics available'}

**Contact Information:**
- Direct contact: ${userEmail}

**Instructions:**
- Answer questions about this creator's social media presence, demographics, and portfolio
- Be helpful and informative
- If you cannot answer a specific question, direct them to contact the creator directly
- Always include the email address in this exact format: mailto:${userEmail}
- Example: "Please contact ${(profile?.name ?? userData?.name) || 'the creator'} directly at mailto:${userEmail} for more information."
- Keep responses concise and relevant
- Focus on the data and information available in their portfolio
`;

        const systemPrompt = `You are a helpful AI assistant for a creator's portfolio page on Repflow. You help visitors learn about the creator's social media presence, audience demographics, and other portfolio information.

If you cannot answer a question with the provided information, politely direct them to contact the creator directly.

When directing users to contact the creator, always include the email address in this format: mailto:${userEmail}

Example: "Please contact ${(profile?.name ?? userData?.name) || 'the creator'} directly at mailto:${userEmail} for more information."

Keep responses helpful, concise, and professional.`;
        const client = getOpenAIClient();
        const completion = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `${userContext}\n\nVisitor's question: ${message}`
                }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again or contact the creator directly.";

        return NextResponse.json({
            response: response,
            success: true
        });

    } catch (error) {
        console.error('AI Chat error:', error);
        try {
            const body = await request.json();
            const userData = body?.context?.userData;
            const profile = userData?.profile ?? userData;
            const repflowUsername = profile?.repflow_username ?? userData?.repflowUsername;
            const userEmail = repflowUsername ? `${repflowUsername}@repflow.me` : null;
            const creatorName = (profile?.name ?? userData?.name) || 'the creator';

            return NextResponse.json({
                response: userEmail
                    ? `I'm sorry, I'm having trouble processing your request right now. Please contact ${creatorName} directly at ${userEmail} for assistance.`
                    : "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                success: false
            });
        } catch {
            return NextResponse.json({
                response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                success: false
            });
        }
    }
}