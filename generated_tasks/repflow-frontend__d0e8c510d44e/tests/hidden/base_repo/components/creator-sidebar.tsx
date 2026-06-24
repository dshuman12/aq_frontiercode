"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUnreadCountsByState, getUser } from "@/lib/api";
import { getUserId } from "@/lib/auth-utils";
import { EmailFolder, getUnreadCountForFolder } from "@/lib/email-folders";
import { User } from "@/lib/models";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Copy,
    FileText,
    Home,
    LogOut,
    MessageSquare,
    Settings,
    Share2,
    Users,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Default user data - will be replaced by session data when available
const defaultUser = {
    name: "Creator",
    avatar: "/placeholder-user.png",
    role: "Creator",
};

type NavItem = {
    title: string;
    url: string;
    icon: any;
    showBadge?: boolean;
};

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        url: "/creator",
        icon: Home,
    },
    {
        title: "Deal Tracker",
        url: "/creator/deals",
        icon: BarChart3,
    },
    {
        title: "Messages",
        url: "/creator/messages",
        icon: MessageSquare,
        showBadge: true,
    },
    {
        title: "Contacts",
        url: "/creator/contacts",
        icon: Users,
    },
    {
        title: "Preferences",
        url: "/creator/preferences",
        icon: Settings,
    },
    {
        title: "Portfolio",
        url: "/creator/portfolio",
        icon: FileText,
    },
];

type CreatorSidebarProps = {
    /** Callback when user navigates (e.g. close mobile drawer) */
    onNavigate?: () => void;
};

export function CreatorSidebar({ onNavigate }: CreatorSidebarProps = {}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isEmailCopied, setIsEmailCopied] = useState(false);
    const [isProfileCopied, setIsProfileCopied] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Fetch user profile from database using getUser function
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!session?.user?.email) return;
            
            setIsLoadingProfile(true);
            try {
                const userData = await getUser();
                console.log("userData from getUser:", userData);
                setUserProfile(userData);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        const fetchUnreadCount = async () => {
            if (!session?.user?.email) return;
            try {
                const counts = await getUnreadCountsByState();
                const total = getUnreadCountForFolder(EmailFolder.ALL_MAIL, counts);
                setUnreadCount(total);
            } catch (err) {
                console.error("Error fetching unread count:", err);
            }
        };

        fetchUserProfile();
        fetchUnreadCount();
        
        // Poll for unread count
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);

    }, [session?.user?.email]);
    
    // Use database profile if available, otherwise fall back to session or default
    const user = userProfile ? {
        name: userProfile.profile?.name || defaultUser.name,
        avatar: userProfile.profile?.avatar || defaultUser.avatar,
        role: defaultUser.role,
    } : session?.user ? {
        name: session.user.name || defaultUser.name,
        avatar: session.user.image || defaultUser.avatar,
        role: defaultUser.role,
    } : defaultUser;

    const handleLogout = () => {
        signOut({ callbackUrl: "/auth/signin" });
    };

    const handleCopyEmail = async () => {
        try {
            if (!userProfile?.profile?.repflow_username) {
                toast.error("Repflow username not found. Please complete your profile.");
                return;
            }

            const email = `${userProfile.profile.repflow_username}@repflow.me`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(email);
            
            // Show copy indicator
            setIsEmailCopied(true);
            setTimeout(() => setIsEmailCopied(false), 2000);
            
            toast.success("Email copied to clipboard!");
        } catch (error) {
            console.error("Error copying email:", error);
            toast.error("Failed to copy email. Please try again.");
        }
    };

    const handleShareProfile = async () => {
        try {
            // Prefer uuid from profile (backend identifier) over session ID - session ID
            // can be email when /users/by-email fails, but /users/:id/public expects uuid
            let userId = userProfile?.uuid ?? userProfile?.id;
            if (!userId) {
                const profile = await getUser();
                userId = profile?.uuid ?? profile?.id ?? (await getUserId());
            }
            if (!userId) {
                toast.error("Unable to get user ID. Please try again.");
                return;
            }

            const publicProfileUrl = `${window.location.origin}/portfolio/${userId}`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(publicProfileUrl);
            
            // Show copy indicator
            setIsProfileCopied(true);
            setTimeout(() => setIsProfileCopied(false), 2000);
            
            toast.success("Public profile link copied to clipboard!");
        } catch (error) {
            console.error("Error copying profile link:", error);
            toast.error("Failed to copy profile link. Please try again.");
        }
    };

    return (
        <aside className="flex flex-col w-full md:w-64 bg-figma-white border-r border-gray-200 shrink-0 shadow-lg h-full md:h-screen min-h-[100dvh]">
            {/* Header */}
            <div className="relative flex items-center justify-center h-20 border-b border-gray-200 bg-gradient-to-r from-black to-sage-primary overflow-hidden">
                {/* Dotted pattern overlay */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.7) 1px, transparent 1px)`,
                        backgroundSize: "8px 8px",
                    }}
                />
                <div className="relative z-10 flex items-center gap-3">
                    <Image
                        src="/repflow-logo.png"
                        alt="Repflow"
                        width={32}
                        height={32}
                    />
                    <div className="flex flex-col">
                        <span className="text-xl font-bold font-[Inter] text-figma-white">
                            Repflow
                        </span>
                        <span className="text-xs text-figma-white/80 font-medium">
                            Earn More, Keep More.
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.url;

                        return (
                            <Link
                                key={item.title}
                                href={item.url}
                                onClick={onNavigate}
                                className={cn(
                                    "flex items-center gap-3 px-2 rounded-lg text-gray-700 hover:bg-sage-primary/10 transition-colors",
                                    isActive &&
                                        "bg-sage-primary/30 hover:bg-sage-primary/20 text-figma-forest-dark font-medium"
                                )}
                            >
                                <div className="flex flex-grow items-center gap-3 py-3 rounded-lg relative">
                                    <item.icon className="h-4 w-4" />
                                    <span className="text-base">
                                        {item.title}
                                    </span>
                                    {item.showBadge && unreadCount > 0 && (
                                        <Badge 
                                            variant="destructive" 
                                            className="absolute right-0 top-1/2 -translate-y-1/2 h-5 min-w-[1.25rem] px-1 rounded-full text-[10px] flex items-center justify-center"
                                        >
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* User Profile Section */}
            <div className="px-4 py-6 border-t border-gray-200 bg-figma-white ">
                <Link
                    href="/creator/profile"
                    onClick={onNavigate}
                    className={cn(
                        "flex items-center gap-3 mb-4 hover:cursor-pointer hover:bg-sage-primary/10 rounded-lg p-2",
                        pathname === "/creator/profile" &&
                            "bg-sage-primary/30 hover:bg-sage-primary/20 text-figma-forest-dark font-medium"
                    )}
                >
                    <Avatar className="h-10 w-10">
                        <AvatarImage
                            src={user.avatar || "/placeholder-user.png"}
                            alt={user.name}
                        />
                        <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                            {isLoadingProfile ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sage-primary"></div>
                            ) : (
                                user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                            )}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm text-gray-700">
                            {user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                </Link>

                <div className="space-y-2">
                    <Button 
                        className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm"
                        onClick={handleCopyEmail}
                        disabled={!userProfile?.profile?.repflow_username}
                    >
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        {isEmailCopied ? "Email Copied!" : "Copy Email"}
                    </Button>
                    <Button 
                        className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm"
                        onClick={handleShareProfile}
                    >
                        <Share2 className="h-3.5 w-3.5 mr-2" />
                        {isProfileCopied ? "Link Copied!" : "Share Profile"}
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full text-gray-700 border-gray-200 hover:bg-gray-50"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-3.5 w-3.5 mr-2" />
                        Log Out
                    </Button>
                </div>
            </div>
        </aside>
    );
}
