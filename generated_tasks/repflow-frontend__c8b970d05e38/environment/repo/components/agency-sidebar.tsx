"use client";
import {
    LayoutGrid,
    MessageSquare,
    Settings,
    Briefcase,
    LogOut,
    Users,
    BarChart3,
    FileText,
    DollarSign,
    Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import agencyLogo from "@/public/agency-logo.png";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

// Default user data - will be replaced by session data when available
const defaultUser = {
    name: "Talent Manager",
    avatar: "/placeholder-user.png",
    role: "Talent Manager",
};

type NavItem = {
    title: string;
    url: string;
    icon: any;
    count?: number;
};

type NavSection = {
    title: string;
    items: NavItem[];
};

const navItems: NavSection[] = [
    {
        title: "Management",
        items: [
            {
                title: "Roster Overview",
                url: "/agency",
                icon: LayoutGrid,
            },
            {
                title: "Analytics",
                url: "/agency/analytics",
                icon: Briefcase,
            },
        ],
    },
    {
        title: "Creators",
        items: [
            {
                title: "All Creators",
                url: "/agency/roster",
                icon: Users,
                count: 30,
            },
        ],
    },
    {
        title: "Tools",
        items: [
            { title: "Contracts", url: "/agency/contracts", icon: FileText },
            { title: "Invoicing", url: "/agency/invoicing", icon: DollarSign },
            { title: "Campaigns", url: "/agency/campaigns", icon: Calendar },
        ],
    },
];

type AppSidebarProps = {
    /** Callback when user navigates (e.g. close mobile drawer) */
    onNavigate?: () => void;
};

export function AppSidebar({ onNavigate }: AppSidebarProps = {}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    
    // Use session data if available, otherwise fall back to default
    const user = session?.user ? {
        name: session.user.name || defaultUser.name,
        avatar: session.user.image || defaultUser.avatar,
        role: defaultUser.role,
    } : defaultUser;

    const handleLogout = () => {
        signOut({ callbackUrl: "/auth/signin" });
    };

    return (
        <aside className="flex flex-col w-full md:w-64 bg-white border-r shrink-0 h-full md:h-screen min-h-[100dvh]">
            <div className="flex items-center justify-center h-20 border-b">
                <div className="flex items-center gap-2">
                    <Image
                        src={agencyLogo.src}
                        alt="logo"
                        width={100}
                        height={100}
                    />
                </div>
            </div>

            <div className="px-4 py-4 border-b">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage
                            src={user.avatar || "/placeholder-user.png"}
                            alt={user.name}
                        />
                        <AvatarFallback>
                            {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm text-gray-800">
                            {user.name}
                        </p>
                        <p className="text-xs text-red-500">{user.role}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-6">
                {navItems.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            {section.title}
                        </h3>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.url}
                                    onClick={onNavigate}
                                    className={cn(
                                        "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors",
                                        pathname === item.url &&
                                            "bg-red-50 text-red-600 font-semibold"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4" />
                                        <span className="text-sm">
                                            {item.title}
                                        </span>
                                    </div>
                                    {item.count && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                            {item.count}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="px-4 py-4 border-t">
                <button 
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-red-600 transition-colors w-full"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
