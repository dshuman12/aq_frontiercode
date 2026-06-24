"use client";

import { API_BASE_URL } from "@/app/constants/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthHeaders } from "@/lib/auth-utils";
import { Copy, DollarSign, Gift, Loader2, Share2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ReferralStats {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalRevenue: number;
    totalRewards: number;
    referralCode: string;
    referralLink: string;
}

interface ReferralHistoryItem {
    referralId: string;
    referredUserName: string;
    status: string;
    revenue: number;
    date: string;
}

export function ReferralProgram() {
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            setLoading(true);
            const authHeaders = await getAuthHeaders();

            // Fetch referral stats
            const statsResponse = await fetch(`${API_BASE_URL}/referrals/stats`, {
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
            });

            if (!statsResponse.ok) {
                throw new Error('Failed to fetch referral stats');
            }

            const statsData = await statsResponse.json();
            setStats(statsData);

            // Fetch referral history
            const historyResponse = await fetch(`${API_BASE_URL}/referrals/history`, {
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
            });

            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                setHistory(historyData);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load referral data');
        } finally {
            setLoading(false);
        }
    };

    /** Request the backend to generate a referral code */
    const handleGenerateCode = async () => {
        try {
            setGenerating(true);
            const authHeaders = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/referrals/generate`, {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to generate referral code');
            }

            // Reload referral data after generating
            await fetchReferralData();
            toast.success('Referral code generated!');
        } catch (err) {
            console.error('Error generating referral code:', err);
            toast.error('Failed to generate referral code. Please contact support.');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    const shareReferralLink = async () => {
        if (!stats?.referralLink) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Repflow with my referral link!',
                    text: 'Get 20% off your first subscription with my referral code!',
                    url: stats.referralLink,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            copyToClipboard(stats.referralLink, 'Referral link');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Referral Program
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4">Loading referral data...</div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Referral Program
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!stats) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Referral Program
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4 space-y-4">
                        <p className="text-muted-foreground">
                            No referral code yet. Generate one to start earning rewards.
                        </p>
                        <Button onClick={handleGenerateCode} disabled={generating}>
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Generating...
                                </>
                            ) : (
                                "Generate Referral Code"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Referral Program
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                                <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                                <div className="text-sm text-muted-foreground">Total Referrals</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                                <div className="text-2xl font-bold">{stats.completedReferrals}</div>
                                <div className="text-sm text-muted-foreground">Completed</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                                <div className="text-sm text-muted-foreground">Total Revenue</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <Gift className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                                <div className="text-2xl font-bold">${stats.totalRewards.toFixed(2)}</div>
                                <div className="text-sm text-muted-foreground">Your Rewards</div>
                            </div>
                        </div>

                        <Separator />

                        {/* Referral Code Section */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="referral-code">Your Referral Code</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        id="referral-code"
                                        value={stats.referralCode}
                                        readOnly
                                        className="font-mono"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(stats.referralCode, 'Referral code')}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="referral-link">Your Referral Link</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        id="referral-link"
                                        value={stats.referralLink}
                                        readOnly
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(stats.referralLink, 'Referral link')}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={shareReferralLink}
                                    >
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Benefits */}
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                                How It Works
                            </h4>
                            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <li>• Share your referral code with friends</li>
                                <li>• They get 20% off their first subscription</li>
                                <li>• You get 20% off your next billing cycle</li>
                                <li>• Earn rewards for every successful referral</li>
                            </ul>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="space-y-4">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No referral history yet. Start sharing your referral code!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>
                                                    {item.referredUserName.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{item.referredUserName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(item.date).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge 
                                                variant={item.status === 'completed' ? 'default' : 'secondary'}
                                            >
                                                {item.status}
                                            </Badge>
                                            {item.status === 'completed' && (
                                                <div className="text-sm font-medium mt-1">
                                                    ${item.revenue.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
