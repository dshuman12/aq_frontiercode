import { Deal } from "./models";

/**
 * Email Subject Manager
 * Ensures all emails for a particular deal have the same subject line
 */
export class EmailSubjectManager {
    private static instance: EmailSubjectManager;
    private subjectCache: Map<string, string> = new Map();

    private constructor() {}

    public static getInstance(): EmailSubjectManager {
        if (!EmailSubjectManager.instance) {
            EmailSubjectManager.instance = new EmailSubjectManager();
        }
        return EmailSubjectManager.instance;
    }

    /**
     * Generate or retrieve a consistent subject for a deal
     * @param deal The deal object
     * @param actionType Optional action type for context
     * @returns Consistent subject line for the deal
     */
    public getConsistentSubject(deal: Deal, actionType?: string): string {
        const dealId = deal.uuid || deal.id;
        
        // Check if we already have a subject for this deal
        if (this.subjectCache.has(dealId)) {
            return this.subjectCache.get(dealId)!;
        }

        // Generate a new consistent subject
        const subject = this.generateSubject(deal, actionType);
        this.subjectCache.set(dealId, subject);
        
        return subject;
    }

    /**
     * Generate a new subject for a deal
     * @param deal The deal object
     * @param actionType Optional action type for context
     * @returns Generated subject line
     */
    private generateSubject(deal: Deal, actionType?: string): string {
        const dealName = deal.brand?.name ?? 'Unknown';
        
        // Get creator name from the deal or use a default
        const creatorName = deal.createdBy || "Creator";
        
        // Create consistent subject format: {dealName} - {creator Name}
        const baseSubject = `${dealName} - ${creatorName}`;

        return baseSubject;
    }

    /**
     * Set a custom subject for a deal (useful when user wants to override)
     * @param dealId The deal ID
     * @param subject The custom subject
     */
    public setCustomSubject(dealId: string, subject: string): void {
        this.subjectCache.set(dealId, subject);
    }

    /**
     * Get the current subject for a deal without generating a new one
     * @param dealId The deal ID
     * @returns Current subject or null if not set
     */
    public getCurrentSubject(dealId: string): string | null {
        return this.subjectCache.get(dealId) || null;
    }

    /**
     * Clear the subject cache for a deal (useful when deal is updated)
     * @param dealId The deal ID
     */
    public clearSubject(dealId: string): void {
        this.subjectCache.delete(dealId);
    }

    /**
     * Clear all cached subjects
     */
    public clearAllSubjects(): void {
        this.subjectCache.clear();
    }

    /**
     * Check if a deal has a cached subject
     * @param dealId The deal ID
     * @returns True if subject is cached
     */
    public hasSubject(dealId: string): boolean {
        return this.subjectCache.has(dealId);
    }
}

// Export singleton instance
export const emailSubjectManager = EmailSubjectManager.getInstance();
