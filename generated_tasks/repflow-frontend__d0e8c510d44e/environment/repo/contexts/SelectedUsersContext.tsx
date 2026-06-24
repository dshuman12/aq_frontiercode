"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CreatorProposal = {
    id: string;
    name: string;
    avatar: string;
    responseTime: string;
    campaignRate: number;
    isRecommended: boolean;
    deliverables: {
        platform: string;
        type: string;
        count: number;
    }[];
};

type SelectedUsersContextType = {
    selectedUsers: CreatorProposal[];
    addToSelectedUsers: (creator: CreatorProposal) => void;
    removeFromSelectedUsers: (creatorId: string) => void;
    clearSelectedUsers: () => void;
    isCreatorSelected: (creatorId: string) => boolean;
};

const SelectedUsersContext = createContext<SelectedUsersContextType | undefined>(undefined);

const STORAGE_KEY = 'repflow-selected-users';

export function SelectedUsersProvider({ children }: { children: ReactNode }) {
    const [selectedUsers, setSelectedUsers] = useState<CreatorProposal[]>([]);

    // Load selected users from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsedUsers = JSON.parse(stored);
                setSelectedUsers(parsedUsers);
            }
        } catch (error) {
            console.error('Error loading selected users from localStorage:', error);
        }
    }, []);

    // Save selected users to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUsers));
        } catch (error) {
            console.error('Error saving selected users to localStorage:', error);
        }
    }, [selectedUsers]);

    const addToSelectedUsers = (creator: CreatorProposal) => {
        setSelectedUsers(prev => {
            // Check if creator is already selected
            const isAlreadySelected = prev.some(user => user.id === creator.id);
            if (isAlreadySelected) {
                return prev; // Don't add duplicates
            }
            return [...prev, creator];
        });
    };

    const removeFromSelectedUsers = (creatorId: string) => {
        setSelectedUsers(prev => prev.filter(user => user.id !== creatorId));
    };

    const clearSelectedUsers = () => {
        setSelectedUsers([]);
    };

    const isCreatorSelected = (creatorId: string) => {
        return selectedUsers.some(user => user.id === creatorId);
    };

    const value: SelectedUsersContextType = {
        selectedUsers,
        addToSelectedUsers,
        removeFromSelectedUsers,
        clearSelectedUsers,
        isCreatorSelected,
    };

    return (
        <SelectedUsersContext.Provider value={value}>
            {children}
        </SelectedUsersContext.Provider>
    );
}

export function useSelectedUsers() {
    const context = useContext(SelectedUsersContext);
    if (context === undefined) {
        throw new Error('useSelectedUsers must be used within a SelectedUsersProvider');
    }
    return context;
}
