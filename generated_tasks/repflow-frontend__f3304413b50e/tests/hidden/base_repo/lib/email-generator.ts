import { getRepflowUsername, getUserName } from "./auth-utils";
import { emailSubjectManager } from "./email-subject-manager";
import {
    QuickActionType,
    generateEmailTemplate,
    getAllContactEmails,
    getPrimaryContactEmail
} from "./email-templates";
import { Deal } from "./models";

export type EmailRequest = {
    to_addresses: string[];
    subject: string;
    body_text?: string;
    body_html?: string;
    from_address?: string;
    cc_addresses?: string[];
    bcc_addresses?: string[];
    reply_to_addresses?: string[];
    configuration_set_name?: string;
    deal_id?: string;
    user_id?: string;
};

/**
 * Generate an EmailRequest for a quick action on a deal
 */
export const generateEmailRequest = async (
    actionType: QuickActionType,
    deal: Deal,
    options?: {
        fromAddress?: string;
        ccAddresses?: string[];
        bccAddresses?: string[];
        replyToAddresses?: string[];
        configurationSetName?: string;
        currentUserId?: string;
    }
): Promise<EmailRequest | null> => {
    // Get primary contact email
    const primaryEmail = getPrimaryContactEmail(deal);
    
    if (!primaryEmail) {
        console.error("No email address found for primary contact");
        return null;
    }

    // Get the primary contact for template generation
    const primaryContact = deal.contact;

    if (!primaryContact) {
        console.error("No primary contact found");
        return null;
    }

    // Get creator name for template (use actual name, fallback to username)
    const creatorName = await getUserName() || await getRepflowUsername() || "Creator";

    // Generate email template
    const template = generateEmailTemplate(actionType, deal, primaryContact, creatorName);

    // Create deal object with creator name for consistent subject
    const dealWithCreator = {
        ...deal,
        createdBy: creatorName,
    };

    // Get consistent subject for this deal
    const consistentSubject = emailSubjectManager.getConsistentSubject(dealWithCreator, actionType);

    // Create EmailRequest object
    const emailRequest: EmailRequest = {
        to_addresses: [primaryEmail],
        subject: consistentSubject,
        body_text: template.bodyText,
        body_html: template.bodyHtml,
        from_address: options?.fromAddress,
        cc_addresses: options?.ccAddresses,
        bcc_addresses: options?.bccAddresses,
        reply_to_addresses: options?.replyToAddresses,
        configuration_set_name: options?.configurationSetName,
        deal_id: deal.uuid,
        user_id: options?.currentUserId || deal.userId || deal.createdBy,
    };

    return emailRequest;
};

/**
 * Generate EmailRequest with multiple recipients (all key contacts)
 */
export const generateEmailRequestToAllContacts = async (
    actionType: QuickActionType,
    deal: Deal,
    options?: {
        fromAddress?: string;
        ccAddresses?: string[];
        bccAddresses?: string[];
        replyToAddresses?: string[];
        configurationSetName?: string;
        currentUserId?: string;
    }
): Promise<EmailRequest | null> => {
    // Get all contact emails
    const allEmails = getAllContactEmails(deal);
    
    if (allEmails.length === 0) {
        console.error("No email addresses found for any contacts");
        return null;
    }

    // Get the primary contact for template generation
    const primaryContact = deal.contact;

    if (!primaryContact) {
        console.error("No primary contact found");
        return null;
    }

    // Get creator name for template (use actual name, fallback to username)
    const creatorName = await getUserName() || await getRepflowUsername() || "Creator";

    // Generate email template
    const template = generateEmailTemplate(actionType, deal, primaryContact, creatorName);

    // Create deal object with creator name for consistent subject
    const dealWithCreator = {
        ...deal,
        createdBy: creatorName,
    };

    // Get consistent subject for this deal
    const consistentSubject = emailSubjectManager.getConsistentSubject(dealWithCreator, actionType);

    // Create EmailRequest object
    const emailRequest: EmailRequest = {
        to_addresses: allEmails,
        subject: consistentSubject,
        body_text: template.bodyText,
        body_html: template.bodyHtml,
        from_address: options?.fromAddress,
        cc_addresses: options?.ccAddresses,
        bcc_addresses: options?.bccAddresses,
        reply_to_addresses: options?.replyToAddresses,
        configuration_set_name: options?.configurationSetName,
        deal_id: deal.id || deal.uuid,
        user_id: options?.currentUserId || deal.userId || deal.createdBy,
    };

    return emailRequest;
};

/**
 * Validate EmailRequest before sending
 */
export const validateEmailRequest = (emailRequest: EmailRequest): boolean => {
    // Check required fields
    if (!emailRequest.to_addresses || emailRequest.to_addresses.length === 0) {
        console.error("EmailRequest validation failed: No recipient addresses");
        return false;
    }

    if (!emailRequest.subject || emailRequest.subject.trim() === "") {
        console.error("EmailRequest validation failed: No subject");
        return false;
    }

    if (!emailRequest.body_text && !emailRequest.body_html) {
        console.error("EmailRequest validation failed: No email body");
        return false;
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of emailRequest.to_addresses) {
        if (!emailRegex.test(email)) {
            console.error(`EmailRequest validation failed: Invalid email address: ${email}`);
            return false;
        }
    }

    return true;
};

/**
 * Preview EmailRequest as a formatted object for debugging
 */
export const previewEmailRequest = (emailRequest: EmailRequest): void => {
    console.log("EmailRequest Preview:", {
        to: emailRequest.to_addresses.join(", "),
        subject: emailRequest.subject,
        hasTextBody: !!emailRequest.body_text,
        hasHtmlBody: !!emailRequest.body_html,
        from: emailRequest.from_address || "default",
        cc: emailRequest.cc_addresses?.join(", ") || "none",
        bcc: emailRequest.bcc_addresses?.join(", ") || "none",
    });
};
