"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";
import {
    Plus,
    ChevronDown,
    Star,
    Youtube,
    MessageSquare,
    FileText,
    Video,
    Instagram,
    Mic,
    Crown,
    Clock,
    MoreVertical,
    Settings,
    X,
    Eye,
    Filter,
} from "lucide-react";
import { DealDetailsModal } from "@/components/deal-details-modal";
import { NewDealModal } from "@/components/new-deal-modal";
import { Deal, DealStatus } from "@/lib/models";
import { getDealsGroupedByStatus, addDeal, updateDeal, archiveDeal, deleteDeal } from "@/lib/api";
import { formatRelativeTime, getContentIcon, getDueDateUrgency } from "@/lib/utils";
import { PageLoading } from "@/components/ui/loading-spinner";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { getUserFriendlyError } from "@/lib/error-messages";
import { toast } from "sonner";

type Column = {
    title: string;
    deals: Deal[];
};

type Board = {
    [key: string]: Column;
};

/**
 * Determines the due status of a deal based on its due date
 * @param dueDate - The due date string from the deal
 * @returns 'past-due' if past due, 'near-due' if due within 3 days, or null
 */
const getDueStatus = (dueDate?: string): 'past-due' | 'near-due' | null => {
    if (!dueDate) return null;
    
    try {
        // Parse the due date (assuming ISO format or parseable date string)
        const due = new Date(dueDate);
        const now = new Date();
        
        // Reset time to compare dates only
        due.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return 'past-due';
        } else if (diffDays <= 3) {
            return 'near-due';
        }
    } catch (error) {
        console.error('Error parsing due date:', error);
    }
    
    return null;
};

export default function DealTrackerPage() {
    const [board, setBoard] = useState<Board>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { handleError } = useErrorHandler();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
    const [showDuration, setShowDuration] = useState(false);
    
    // Define all possible statuses and their display properties
    const allStatuses = [
        { key: "new-offer", title: "New Offer", hidden: false },
        { key: "negotiating", title: "Negotiating", hidden: false },
        { key: "contracting", title: "Contracting", hidden: false },
        { key: "drafting", title: "Drafting", hidden: false },
        { key: "live", title: "Live", hidden: false },
        { key: "complete", title: "Complete", hidden: false },
        { key: "lost", title: "Lost", hidden: true },
        { key: "abandoned", title: "Abandoned", hidden: true },
        { key: "archive", title: "Archive", hidden: true },
    ];

    /** Maps a DealStatus display title (e.g. "Lost") to its column key (e.g. "lost") */
    const statusToColumnKey = (status: string): string | undefined =>
        allStatuses.find((s) => s.title === status)?.key;
    
    // Initialize with non-hidden statuses selected by default
    const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
        new Set(allStatuses.filter(status => !status.hidden).map(status => status.key))
    );

    // Load deals on component mount
    useEffect(() => {
        const loadDeals = async () => {
            try {
                setLoading(true);
                setError(null);
                const dealsData = await getDealsGroupedByStatus();
                setBoard(dealsData);

                // Auto-reveal any hidden columns that already contain deals
                const keysWithDeals = Object.entries(dealsData)
                    .filter(([, col]) => col.deals.length > 0)
                    .map(([key]) => key);

                setSelectedStatuses((prev) => {
                    const next = new Set(prev);
                    keysWithDeals.forEach((k) => next.add(k));
                    return next;
                });
            } catch (err) {
                const userFriendlyError = handleError(err, "network", {
                    showToast: true,
                });
                setError(userFriendlyError.message);
            } finally {
                setLoading(false);
            }
        };

        loadDeals();
    }, [handleError]);

    const handleOpenModal = (deal: Deal) => {
        setSelectedDeal(deal);
        setIsModalOpen(true);
    };

    const handleCreateDeal = async (newDeal: Omit<Deal, "id">) => {
        try {
            await addDeal(newDeal);
            // Reload deals after creating a new one
            const dealsData = await getDealsGroupedByStatus();
            setBoard(dealsData);
            setIsNewDealModalOpen(false);
            toast.success("Deal created successfully");
        } catch (err: any) {
            console.error("Error creating deal:", err);
            toast.error(err?.message || "Failed to create deal");
        }
    };

    /** Archive a deal from the card's context menu */
    const handleArchiveDeal = async (deal: Deal) => {
        try {
            await archiveDeal(deal);
            // Reveal the archive column if hidden
            setSelectedStatuses((prev) => {
                const next = new Set(prev);
                next.add("archive");
                return next;
            });
            // Reload board so the deal moves to the Archive column
            const dealsData = await getDealsGroupedByStatus();
            setBoard(dealsData);
            toast.success("Deal archived successfully");
        } catch (err) {
            console.error("Error archiving deal:", err);
            toast.error("Failed to archive deal");
        }
    };

    /** Delete a deal permanently */
    const handleDeleteDeal = async (deal: Deal) => {
        try {
            await deleteDeal(deal.uuid);
            const dealsData = await getDealsGroupedByStatus();
            setBoard(dealsData);
            toast.success("Deal deleted");
        } catch (err) {
            console.error("Error deleting deal:", err);
            toast.error("Failed to delete deal");
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;

        const sourceColId = source.droppableId;
        const destColId = destination.droppableId;
        const sourceCol = board[sourceColId];
        const destCol = board[destColId];
        const draggedDeal = sourceCol.deals.find(
            (d: Deal) => d.uuid === draggableId
        );

        if (!draggedDeal) return;

        // Update the UI immediately for better UX
        if (sourceColId === destColId) {
            const newDeals = Array.from(sourceCol.deals);
            const [removed] = newDeals.splice(source.index, 1);
            newDeals.splice(destination.index, 0, removed);
            setBoard({
                ...board,
                [sourceColId]: { ...sourceCol, deals: newDeals },
            });
        } else {
            const newSourceDeals = sourceCol.deals.filter(
                (d: Deal) => d.uuid !== draggableId
            );
            const newDestDeals = Array.from(destCol.deals);
            newDestDeals.splice(destination.index, 0, draggedDeal);
            setBoard({
                ...board,
                [sourceColId]: { ...sourceCol, deals: newSourceDeals },
                [destColId]: { ...destCol, deals: newDestDeals },
            });

            // Update the deal status in the backend when moved to a different column
            try {
                // Map column IDs to status values
                const statusMap: { [key: string]: DealStatus } = {
                    "new-offer": "New Offer",
                    negotiating: "Negotiating",
                    contracting: "Contracting",
                    drafting: "Drafting",
                    live: "Live",
                    complete: "Complete",
                    archive: "Archive",
                    lost: "Lost",
                    abandoned: "Abandoned",
                };

                const newStatus = statusMap[destColId];
                if (newStatus && draggedDeal.uuid) {
                    draggedDeal.status = newStatus;
                    await updateDeal(draggedDeal.uuid, draggedDeal);
                }
            } catch (error) {
                console.error("Error updating deal status:", error);
                // Optionally revert the UI change if the API call fails
                // For now, we'll keep the optimistic update
            }
        }
    };

    return (
        <>
            <div className="flex-1 page-padding space-y-4 sm:space-y-6 bg-gray-50">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Deal Tracker
                    </h1>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Button
                            onClick={() => setIsNewDealModalOpen(true)}
                            className="bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark shadow-sm"
                        >
                            <Plus className="mr-2 h-4 w-4" /> New Deal
                        </Button>
                    </div>
                </header>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="bg-white border-gray-200 hover:bg-gray-50"
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Status Filter ({selectedStatuses.size})
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                {allStatuses.map((status) => (
                                    <DropdownMenuCheckboxItem
                                        key={status.key}
                                        checked={selectedStatuses.has(status.key)}
                                        onCheckedChange={(checked) => {
                                            const newSelectedStatuses = new Set(selectedStatuses);
                                            if (checked) {
                                                newSelectedStatuses.add(status.key);
                                            } else {
                                                newSelectedStatuses.delete(status.key);
                                            }
                                            setSelectedStatuses(newSelectedStatuses);
                                        }}
                                        className={status.hidden ? "text-gray-500" : ""}
                                    >
                                        {status.title}
                                        {status.hidden && (
                                            <span className="ml-auto text-xs text-gray-400">
                                                (Hidden)
                                            </span>
                                        )}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {showDuration && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                    Avg. time to close:
                                </span>
                                <span className="text-sm text-blue-600 font-medium bg-white rounded-md p-1 border border-figma-green-primary/20">
                                    14.2 days
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {loading && <PageLoading message="Loading deals..." />}

                {error && (
                    <ErrorDisplay
                        error={getUserFriendlyError(error, "network")}
                        variant="page"
                        onAction={() => window.location.reload()}
                    />
                )}

                {!loading && !error && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            {Object.entries(board)
                                .filter(([key]) => selectedStatuses.has(key))
                                .map(([columnId, column]) => (
                                    <div
                                        key={columnId}
                                        className="w-[280px] min-w-[280px] sm:w-64 sm:min-w-64 flex-shrink-0"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex flex-col">
                                                <h3 className="font-semibold text-gray-700">
                                                    {column.title}
                                                </h3>
                                                {showDuration && (
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        Avg:{" "}
                                                        {[
                                                            "New Offer",
                                                            "Negotiating",
                                                            "Contracting",
                                                            "Drafting",
                                                            "Live",
                                                            "Complete",
                                                            "Archive",
                                                            "Lost",
                                                            "Abandoned",
                                                        ][
                                                            Object.keys(
                                                                board
                                                            ).indexOf(columnId)
                                                        ]
                                                            ? [
                                                                3.2, 4.8, 2.1,
                                                                5.5, 7.3, 1.2,
                                                                0, 8.5, 2.8,
                                                            ][
                                                            Object.keys(
                                                                board
                                                            ).indexOf(
                                                                columnId
                                                            )
                                                            ]
                                                            : 0}{" "}
                                                        days
                                                    </span>
                                                )}
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="bg-figma-green-primary/10 text-figma-green-primary rounded-lg px-2 py-1"
                                            >
                                                {column.deals.length}
                                            </Badge>
                                        </div>
                                        <Droppable droppableId={columnId}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`space-y-3 min-h-[100px] rounded-lg transition-colors ${snapshot.isDraggingOver
                                                        ? "bg-figma-green-primary/5"
                                                        : ""
                                                        }`}
                                                >
                                                    {column.deals.map(
                                                        (deal, index) => {
                                                            const dueUrgency = getDueDateUrgency(deal.dueDate);
                                                            return (
                                                            <Draggable
                                                                key={deal.uuid}
                                                                draggableId={
                                                                    deal.uuid
                                                                }
                                                                index={index}
                                                            >
                                                                {(
                                                                    provided,
                                                                    snapshot
                                                                ) => (
                                                                    <div
                                                                        ref={
                                                                            provided.innerRef
                                                                        }
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        onClick={() =>
                                                                            handleOpenModal(
                                                                                deal
                                                                            )
                                                                        }
                                                                        className={`cursor-pointer transition-all ${snapshot.isDragging
                                                                            ? "rotate-2 scale-105"
                                                                            : ""
                                                                            }`}
                                                                    >
                                                                        <Card
                                                                            className={`bg-white border shadow-md hover:shadow-lg transition-all h-72 ${
                                                                                dueUrgency === "overdue"
                                                                                    ? "border-red-400 bg-red-50/80 hover:border-red-500"
                                                                                    : dueUrgency === "soon"
                                                                                    ? "border-amber-400 bg-amber-50/80 hover:border-amber-500"
                                                                                    : "border border-figma-green-primary/20 hover:border-figma-green-primary/50"
                                                                            }`}
                                                                        >
                                                                            <CardContent className="p-4 h-full flex flex-col relative">
                                                                                <div className="flex items-center justify-between align-top mb-3 relative">
                                                                                    <span className="font-medium text-sm text-gray-900 truncate flex items-start flex-col">
                                                                                        {
                                                                                            deal.title ?? 'Unknown Deal'
                                                                                        }
                                                                                    </span>
                                                                                    {showDuration && (
                                                                                        <p className="text-xs text-blue-600 font-medium absolute left-0 -bottom-3 z-10">
                                                                                            {Math.floor(
                                                                                                Math.random() *
                                                                                                10
                                                                                            ) +
                                                                                                1}{" "}
                                                                                            days
                                                                                            in
                                                                                            stage
                                                                                        </p>
                                                                                    )}

                                                                                    <div className="flex items-center gap-1">
                                                                                        {deal.isHighValue && (
                                                                                            <div className="flex items-center bg-yellow-400 px-2 py-1 rounded-md">
                                                                                                <Crown className="w-4 h-4 text-black fill-black" />
                                                                                            </div>
                                                                                        )}
                                                                                        {deal.isPriority && (
                                                                                            <div className="flex items-center bg-green-400 px-2 py-1 rounded-md">
                                                                                                <Star className="w-4 h-4 text-black fill-black" />
                                                                                            </div>
                                                                                        )}
                                                                                        {dueUrgency === "overdue" && (
                                                                                            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-md">
                                                                                                OVERDUE
                                                                                            </Badge>
                                                                                        )}
                                                                                        {dueUrgency === "soon" && (
                                                                                            <div className="flex items-center bg-amber-400 px-2 py-1 rounded-md" title="Due today or tomorrow">
                                                                                                <Clock className="w-4 h-4 text-amber-900" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        {/* Display rate based on deal type */}
                                                                                        {deal.dealType === "Flat Rate" || (deal.value > 0 && !deal.performanceRate) ? (
                                                                                            <span className="text-lg font-bold text-figma-green-primary">
                                                                                                {"$" + deal.value.toLocaleString()}
                                                                                            </span>
                                                                                        ) : deal.performanceRate ? (
                                                                                            <span className="text-lg font-bold text-figma-green-primary">
                                                                                                {deal.performanceRate}
                                                                                            </span>
                                                                                        ) : deal.value > 0 ? (
                                                                                            <span className="text-lg font-bold text-figma-green-primary">
                                                                                                {"$" + deal.value.toLocaleString()}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-sm font-medium text-gray-500">
                                                                                                Rate TBD
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="text-xs text-gray-500 font-medium">
                                                                                            {deal.dealType}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex justify-between mb-3">
                                                                                    <div className="space-y-2">
                                                                                        <div className="text-xs font-medium text-gray-700 mb-1">
                                                                                            Deliverables
                                                                                        </div>
                                                                                        {deal.deliverables
                                                                                            .slice(
                                                                                                0,
                                                                                                2
                                                                                            )
                                                                                            .map(
                                                                                                (
                                                                                                    deliverable,
                                                                                                    idx
                                                                                                ) => {
                                                                                                    const content = deliverable.contents?.[0];
                                                                                                    if (!content) return null;
                                                                                                    return (
                                                                                                        <div
                                                                                                            key={
                                                                                                                idx
                                                                                                            }
                                                                                                            className="flex gap-2 text-xs text-gray-600"
                                                                                                        >
                                                                                                            {getContentIcon(
                                                                                                                content.contentType
                                                                                                            )}
                                                                                                            <span className="capitalize">
                                                                                                                {
                                                                                                                    content.text
                                                                                                                }
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    );
                                                                                                }
                                                                                            )}
                                                                                        {deal
                                                                                            .deliverables
                                                                                            .length >
                                                                                            2 && (
                                                                                                <div className="text-xs text-gray-500">
                                                                                                    +
                                                                                                    {deal
                                                                                                        .deliverables
                                                                                                        .length -
                                                                                                        2}{" "}
                                                                                                    more
                                                                                                </div>
                                                                                            )}
                                                                                    </div>
                                                                                    <div className="flex justify-end">
                                                                                        <div className="flex gap-1 self-start">
                                                                                            <DropdownMenu>
                                                                                                <DropdownMenuTrigger
                                                                                                    onClick={(
                                                                                                        e
                                                                                                    ) =>
                                                                                                        e.stopPropagation()
                                                                                                    }
                                                                                                    className="ml-1 p-1 hover:bg-gray-100 rounded"
                                                                                                >
                                                                                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                                                                                </DropdownMenuTrigger>
                                                                                                <DropdownMenuContent align="end">
                                                                                                    <DropdownMenuItem
                                                                                                        onClick={(
                                                                                                            e
                                                                                                        ) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleOpenModal(
                                                                                                                deal
                                                                                                            );
                                                                                                        }}
                                                                                                        className="cursor-pointer"
                                                                                                    >
                                                                                                        Edit
                                                                                                        Deal
                                                                                                        Details
                                                                                                    </DropdownMenuItem>
                                                                                                    <DropdownMenuSeparator />
                                                                                                    <DropdownMenuItem
                                                                                                        onClick={(
                                                                                                            e
                                                                                                        ) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleArchiveDeal(deal);
                                                                                                        }}
                                                                                                        className="cursor-pointer text-orange-600"
                                                                                                    >
                                                                                                        Archive
                                                                                                        Deal
                                                                                                    </DropdownMenuItem>
                                                                                                    <DropdownMenuItem
                                                                                                        onClick={(
                                                                                                            e
                                                                                                        ) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleDeleteDeal(deal);
                                                                                                        }}
                                                                                                        className="cursor-pointer text-red-600"
                                                                                                    >
                                                                                                        Delete
                                                                                                        Deal
                                                                                                    </DropdownMenuItem>
                                                                                                </DropdownMenuContent>
                                                                                            </DropdownMenu>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>


                                                                                <div className="mt-auto">
                                                                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                                                                        {deal.dueDate && (
                                                                                            <span
                                                                                                className={`text-xs ${
                                                                                                    dueUrgency === "overdue"
                                                                                                        ? "text-red-600 font-semibold"
                                                                                                        : dueUrgency === "soon"
                                                                                                        ? "text-amber-700 font-medium"
                                                                                                        : "text-gray-500"
                                                                                                }`}
                                                                                            >
                                                                                                {dueUrgency === "overdue"
                                                                                                    ? "Overdue"
                                                                                                    : deal.dueDate}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                                                        <span>
                                                                                            Last
                                                                                            activity:{" "}
                                                                                            {formatRelativeTime(
                                                                                                deal.lastActivity
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </CardContent>
                                                                        </Card>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                            );
                                                        }
                                                    )}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                ))}
                        </div>
                    </DragDropContext>
                )}
            </div>
            {selectedDeal && (
                <DealDetailsModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    deal={selectedDeal}
                    onDealUpdate={async (updatedDeal) => {
                        // Auto-reveal the target column if it's currently hidden
                        // (Lost, Abandoned, Archive are hidden by default)
                        const targetKey = statusToColumnKey(updatedDeal.status);
                        if (targetKey && !selectedStatuses.has(targetKey)) {
                            setSelectedStatuses((prev) => {
                                const next = new Set(prev);
                                next.add(targetKey);
                                return next;
                            });
                        }

                        // Reload the board from the server to pick up the new status
                        try {
                            const dealsData = await getDealsGroupedByStatus();
                            setBoard(dealsData);
                        } catch {
                            // Refetch failed; we'll move the deal locally below
                        }

                        // Always move the deal to the column matching its new status.
                        // This fixes Lost/Abandoned/Archive (and any status) when the refetched
                        // data is stale or the backend groups deals differently.
                        if (targetKey) {
                            setBoard((prevBoard) => {
                                const newBoard = { ...prevBoard };
                                Object.keys(newBoard).forEach((columnId) => {
                                    newBoard[columnId] = {
                                        ...newBoard[columnId],
                                        deals: newBoard[columnId].deals.filter(
                                            (d) => d.uuid !== updatedDeal.uuid
                                        ),
                                    };
                                });
                                if (newBoard[targetKey]) {
                                    newBoard[targetKey] = {
                                        ...newBoard[targetKey],
                                        deals: [...newBoard[targetKey].deals, updatedDeal],
                                    };
                                }
                                return newBoard;
                            });
                        }

                        setSelectedDeal(updatedDeal);
                    }}
                />
            )}
            <NewDealModal
                open={isNewDealModalOpen}
                onOpenChange={setIsNewDealModalOpen}
                onSubmit={handleCreateDeal}
            />
        </>
    );
}
