import { OPENAI_API_KEY } from "@/app/constants/constants";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazy-load OpenAI client to avoid initialization during build
let openai: OpenAI | null = null;
function getOpenAIClient() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
        });
    }
    return openai;
}

interface CreatorData {
    id: string;
    name: string;
    campaignRate: number;
    deliverables: {
        platform: string;
        type: string;
        count: number;
    }[];
}

interface ProposalChatRequest {
    message: string;
    creators: CreatorData[];
    filteredCreators: CreatorData[];
}

export async function POST(request: NextRequest) {
    try {
        const { message, creators, filteredCreators }: ProposalChatRequest = await request.json();

        if (!message || !creators || !filteredCreators) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const response = await generateProposalAIResponse(message, creators, filteredCreators);
        return NextResponse.json({ response });
    } catch (error) {
        console.error("Error in proposal AI chat:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

async function generateProposalAIResponse(message: string, creators: CreatorData[], filteredCreators: CreatorData[]): Promise<string> {
    // Calculate comprehensive creator analytics
    const analytics = calculateCreatorAnalytics(creators, filteredCreators);
    
    // Create system prompt for the AI
    const systemPrompt = `You are an expert AI assistant specialized in creator economy and influencer marketing. You help agencies and brands analyze creator data to make informed campaign decisions.

Your role:
- Analyze creator data and provide strategic insights
- Suggest optimal creator combinations for campaigns
- Identify trends and patterns in creator rates and platforms
- Provide data-driven recommendations for influencer marketing

Current Creator Data Context:
- Total creators in database: ${analytics.totalCreators}
- Creators in current filter: ${analytics.filteredCount}
- Average campaign rate: $${analytics.avgRate.toLocaleString()}
- Rate range: $${analytics.minRate.toLocaleString()} - $${analytics.maxRate.toLocaleString()}
- Platform distribution: ${JSON.stringify(analytics.platformStats)}
- Top 5 creators by rate: ${JSON.stringify(analytics.topCreators.map(c => ({ name: c.name, rate: c.campaignRate, platforms: c.deliverables.map(d => d.platform) })))}

Guidelines:
- Always provide specific, actionable insights
- Use emojis and formatting to make responses engaging
- Reference actual creator names and rates from the data
- Provide strategic recommendations based on the analytics
- Be concise but comprehensive
- Focus on value propositions and campaign optimization`;

    try {
        const client = getOpenAIClient();
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });

        return completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error) {
        console.error("OpenAI API error:", error);
        return "I'm experiencing technical difficulties. Please try again in a moment.";
    }
}

function calculateCreatorAnalytics(creators: CreatorData[], filteredCreators: CreatorData[]) {
    const totalCreators = creators.length;
    const filteredCount = filteredCreators.length;
    const avgRate = filteredCreators.reduce((sum, c) => sum + c.campaignRate, 0) / Math.max(filteredCount, 1);
    const minRate = Math.min(...filteredCreators.map(c => c.campaignRate));
    const maxRate = Math.max(...filteredCreators.map(c => c.campaignRate));
    
    // Platform analysis
    const platformStats = filteredCreators.reduce((acc, creator) => {
        creator.deliverables.forEach(deliverable => {
            acc[deliverable.platform] = (acc[deliverable.platform] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    // Top creators by rate
    const topCreators = [...filteredCreators]
        .sort((a, b) => b.campaignRate - a.campaignRate)
        .slice(0, 5);

    // Rate distribution analysis
    const rates = filteredCreators.map(c => c.campaignRate).sort((a, b) => a - b);
    const median = rates[Math.floor(rates.length / 2)];
    const q1 = rates[Math.floor(rates.length * 0.25)];
    const q3 = rates[Math.floor(rates.length * 0.75)];

    return {
        totalCreators,
        filteredCount,
        avgRate,
        minRate,
        maxRate,
        median,
        q1,
        q3,
        platformStats,
        topCreators,
        allCreators: filteredCreators.map(c => ({
            name: c.name,
            rate: c.campaignRate,
            platforms: c.deliverables.map(d => d.platform)
        }))
    };
}
