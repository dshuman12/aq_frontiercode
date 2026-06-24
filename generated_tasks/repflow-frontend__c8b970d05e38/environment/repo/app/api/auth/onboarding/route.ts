import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/app/constants/constants";
import { User } from "@/lib/models";

export async function POST(request: NextRequest) {
    try {
        // Get the session - for now we'll extract user info from request headers or body
        // In production, you might want to implement proper session validation
        const body = await request.json();
        const { preferences, profileImage, userData } = body;

        if (!preferences) {
            return NextResponse.json(
                { error: "Preferences data is required" },
                { status: 400 }
            );
        }

        // Validate that we have user data
        if (!userData) {
            return NextResponse.json(
                { error: "User data is required" },
                { status: 400 }
            );
        }

        // Extract user information from localStorage data
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        const username = userData.repflow_username || userData.email?.split('@')[0] || 'user';
        const email = userData.email;
        const userSub = userData.userSub;
        const selectedTier = userData.selectedTier || 'starter';
        const subscriptionData = userData.subscription;
        const billingInfo = userData.billingInfo;

        // Helper function to capitalize first letter of tier
        const capitalizeTier = (tier: string) => {
            return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
        };

        // Validate that userSub exists (should be set after Cognito user creation)
        if (!userSub) {
            return NextResponse.json(
                { error: "User account not properly created. Please try signing up again." },
                { status: 400 }
            );
        }

        // Validate email format
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return NextResponse.json(
                    { error: "Invalid email format" },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        console.log("Creating complete user for:", email);
        console.log("User data from localStorage:", userData);
        console.log("Subscription data:", subscriptionData);
        console.log("Billing info:", billingInfo);
        console.log("Preferences:", JSON.stringify(preferences, null, 2));
        console.log("Profile Image URL:", profileImage);

        // Step 2: Create complete user in backend
        try {
            const userPayload: Partial<User> = {
                uuid: userSub, // Use Cognito UserSub as UUID
                profile: {
                    id: userSub,
                    name: [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0],
                    repflow_username: username || email.split('@')[0],
                    email: email,
                    avatar: profileImage || '/placeholder-user.png',
                    socialLinks: {}, // Empty social links initially
                    subscription: subscriptionData ? {
                        ...subscriptionData,
                        tier: capitalizeTier(subscriptionData.tier)
                    } : {
                        tier: capitalizeTier(selectedTier),
                        status: 'pending', // Fallback for users without payment
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                preferences: preferences,
                billingInfo: billingInfo || null,
                teamMembers: [],
                isActive: true,
                isVerified: true, // User completed onboarding, so they're verified
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const userResponse = await fetch(`${API_BASE_URL}/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userPayload),
            });

            if (!userResponse.ok) {
                const errorText = await userResponse.text();
                let detail = errorText;
                try {
                    const parsed = JSON.parse(errorText) as {
                        detail?: string | Record<string, unknown>;
                        error?: string;
                    };
                    if (typeof parsed.detail === 'string') {
                        detail = parsed.detail;
                    } else if (parsed.detail && typeof parsed.detail === 'object') {
                        detail = JSON.stringify(parsed.detail);
                    } else if (parsed.error) {
                        detail = parsed.error;
                    }
                } catch {
                    /* keep raw text */
                }
                console.error("Backend user create failed:", userResponse.status, detail);
                return NextResponse.json(
                    {
                        error: "Failed to create user",
                        detail,
                        status: userResponse.status,
                    },
                    { status: userResponse.status >= 400 && userResponse.status < 600 ? userResponse.status : 502 }
                );
            }

            const createdUser = await userResponse.json();
            console.log("User created successfully:", createdUser);
            
            return NextResponse.json(
                { 
                    message: "User created successfully with preferences and profile",
                    userId: createdUser.userId || createdUser.id,
                    user: createdUser,
                    profileImage
                },
                { status: 200 }
            );

        } catch (error) {
            console.error("Error creating user:", error);
            return NextResponse.json(
                { error: "Failed to create user" },
                { status: 500 }
            );
        }


    } catch (error) {
        console.error("Error saving onboarding preferences:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
