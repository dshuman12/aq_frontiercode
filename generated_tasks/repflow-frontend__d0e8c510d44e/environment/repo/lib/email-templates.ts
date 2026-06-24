import { Deal, BrandContact, DealDeliverable } from "./models";
import { EmailSettings, getGreetingText, getSignatureText, loadEmailSettings } from "./email-settings";

/** Get the display text for a deliverable from its nested contents */
const getDeliverableText = (d: DealDeliverable): string =>
    d.contents?.[0]?.text || "Deliverable";

export type EmailTemplate = {
    subject: string;
    bodyText: string;
    bodyHtml: string;
};

export type QuickActionType = 
    | "Accept"
    | "Reject" 
    | "Counter"
    | "Request Contract"
    | "Send Deliverables"
    | "Request Payment"
    | "Follow Up"
    | "Archive Deal";

/**
 * Generate personalized email templates based on deal information
 */
export const generateEmailTemplate = (
    actionType: QuickActionType,
    deal: Deal,
    contact: BrandContact,
    creatorName?: string
): EmailTemplate => {
    const creator = creatorName || "Alex"; // This would come from user profile
    const brandName = deal.brand?.name ?? 'Unknown';
    const dealValue = deal.value;
    const dealType = deal.dealType;
    
    // Load email settings
    const emailSettings = loadEmailSettings();
    const greeting = getGreetingText(emailSettings, contact.name);
    const signature = getSignatureText(emailSettings, creator, contact.name);
    
    const baseTemplates: Record<QuickActionType, EmailTemplate> = {
        Accept: {
            subject: `✅ Accepting Your Partnership Proposal - ${brandName}`,
            bodyText: `${greeting}

I'm excited to accept your partnership proposal for ${brandName}!

Deal Details:
- Value: $${dealValue.toLocaleString()}
- Type: ${dealType}
- Deliverables: ${deal.deliverables.map(d => getDeliverableText(d)).join(", ")}

I'm ready to move forward with this collaboration. Please let me know the next steps for contracting and any additional details you need from me.

Looking forward to working together!

${signature}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #16a34a;">✅ Accepting Your Partnership Proposal</h2>
    
    <p>${greeting}</p>
    
    <p>I'm excited to accept your partnership proposal for <strong>${brandName}</strong>!</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #374151;">Deal Details:</h3>
        <ul style="margin: 0;">
            <li><strong>Value:</strong> $${dealValue.toLocaleString()}</li>
            <li><strong>Type:</strong> ${dealType}</li>
            <li><strong>Deliverables:</strong> ${deal.deliverables.map(d => getDeliverableText(d)).join(", ")}</li>
        </ul>
    </div>
    
    <p>I'm ready to move forward with this collaboration. Please let me know the next steps for contracting and any additional details you need from me.</p>
    
    <p>Looking forward to working together!</p>
    
    <p style="white-space: pre-line;">${signature}</p>
</div>`
        },

        Reject: {
            subject: `Re: Partnership Proposal - ${brandName}`,
            bodyText: `Hi ${contact.name || "there"},

Thank you for reaching out with your partnership proposal for ${brandName}.

After careful consideration, I won't be able to move forward with this particular opportunity at this time. This could be due to:
- Current schedule commitments
- Brand alignment considerations
- Budget constraints

I appreciate you thinking of me for this collaboration, and I hope we can explore future opportunities that might be a better fit.

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #374151;">Re: Partnership Proposal</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>Thank you for reaching out with your partnership proposal for <strong>${brandName}</strong>.</p>
    
    <p>After careful consideration, I won't be able to move forward with this particular opportunity at this time. This could be due to:</p>
    
    <ul>
        <li>Current schedule commitments</li>
        <li>Brand alignment considerations</li>
        <li>Budget constraints</li>
    </ul>
    
    <p>I appreciate you thinking of me for this collaboration, and I hope we can explore future opportunities that might be a better fit.</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        },

        Counter: {
            subject: `Counter Proposal - ${brandName} Partnership`,
            bodyText: `Hi ${contact.name || "there"},

Thank you for your partnership proposal for ${brandName}. I'm interested in working together, but I'd like to propose some adjustments:

Original Offer:
- Value: $${dealValue.toLocaleString()}
- Type: ${dealType}

My Counter Proposal:
- I'd like to discuss the deliverables and timeline
- Let's explore additional value opportunities
- Open to adjusting the scope for mutual benefit

I believe we can create something amazing together. Would you be available for a quick call to discuss the details?

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #3b82f6;">Counter Proposal - ${brandName} Partnership</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>Thank you for your partnership proposal for <strong>${brandName}</strong>. I'm interested in working together, but I'd like to propose some adjustments:</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin-top: 0;">Original Offer:</h4>
        <ul style="margin: 0;">
            <li>Value: $${dealValue.toLocaleString()}</li>
            <li>Type: ${dealType}</li>
        </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin-top: 0;">My Counter Proposal:</h4>
        <ul style="margin: 0;">
            <li>I'd like to discuss the deliverables and timeline</li>
            <li>Let's explore additional value opportunities</li>
            <li>Open to adjusting the scope for mutual benefit</li>
        </ul>
    </div>
    
    <p>I believe we can create something amazing together. Would you be available for a quick call to discuss the details?</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        },

        "Request Contract": {
            subject: `Contract Request - ${brandName} Partnership`,
            bodyText: `Hi ${contact.name || "there"},

I hope this email finds you well! We've agreed on the terms for our ${brandName} partnership, and I'm ready to move forward with the contracting phase.

Deal Summary:
- Value: $${dealValue.toLocaleString()}
- Type: ${dealType}
- Deliverables: ${deal.deliverables.map(d => getDeliverableText(d)).join(", ")}

Could you please send over the contract for review? I'm excited to get started and deliver great content for ${brandName}.

Please let me know if you need any additional information from me.

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #059669;">Contract Request - ${brandName} Partnership</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>I hope this email finds you well! We've agreed on the terms for our <strong>${brandName}</strong> partnership, and I'm ready to move forward with the contracting phase.</p>
    
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #065f46;">Deal Summary:</h3>
        <ul style="margin: 0;">
            <li><strong>Value:</strong> $${dealValue.toLocaleString()}</li>
            <li><strong>Type:</strong> ${dealType}</li>
            <li><strong>Deliverables:</strong> ${deal.deliverables.map(d => getDeliverableText(d)).join(", ")}</li>
        </ul>
    </div>
    
    <p>Could you please send over the contract for review? I'm excited to get started and deliver great content for ${brandName}.</p>
    
    <p>Please let me know if you need any additional information from me.</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        },

        "Send Deliverables": {
            subject: `📦 Deliverables Ready - ${brandName} Campaign`,
            bodyText: `Hi ${contact.name || "there"},

Great news! I've completed the deliverables for our ${brandName} campaign and they're ready for your review.

Completed Deliverables:
${deal.deliverables.map(d => `- ${getDeliverableText(d)}`).join("\n")}

You can review the content at the following links:
${deal.deliverables.map(d => d.draftLink ? `- ${getDeliverableText(d)}: ${d.draftLink}` : `- ${getDeliverableText(d)}: [Link to be provided]`).join("\n")}

Please let me know if you need any revisions or have feedback. I'm happy to make adjustments to ensure the content meets your expectations.

Looking forward to your thoughts!

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #7c3aed;">📦 Deliverables Ready - ${brandName} Campaign</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>Great news! I've completed the deliverables for our <strong>${brandName}</strong> campaign and they're ready for your review.</p>
    
    <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #581c87;">Completed Deliverables:</h3>
        <ul style="margin: 0;">
            ${deal.deliverables.map(d => `<li>${getDeliverableText(d)}</li>`).join("")}
        </ul>
    </div>
    
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin-top: 0;">Review Links:</h4>
        <ul style="margin: 0;">
            ${deal.deliverables.map(d => 
                `<li>${getDeliverableText(d)}: ${d.draftLink ? `<a href="${d.draftLink}" style="color: #3b82f6;">${d.draftLink}</a>` : '[Link to be provided]'}</li>`
            ).join("")}
        </ul>
    </div>
    
    <p>Please let me know if you need any revisions or have feedback. I'm happy to make adjustments to ensure the content meets your expectations.</p>
    
    <p>Looking forward to your thoughts!</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        },

        "Request Payment": {
            subject: `💰 Invoice Ready - ${brandName} Campaign Completed`,
            bodyText: `Hi ${contact.name || "there"},

I hope you're doing well! I've successfully completed all deliverables for our ${brandName} campaign and wanted to follow up on payment.

Campaign Summary:
- Value: $${dealValue.toLocaleString()}
- Type: ${dealType}
- All deliverables completed and delivered
- Campaign performance metrics available upon request

${deal.deliverables.find(d => d.invoiceLink) ? 
`Invoice Link: ${deal.deliverables.find(d => d.invoiceLink)?.invoiceLink}` : 
'Please let me know your preferred method for receiving the invoice.'}

Thank you for the great collaboration! I look forward to working together again in the future.

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #dc2626;">💰 Invoice Ready - ${brandName} Campaign Completed</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>I hope you're doing well! I've successfully completed all deliverables for our <strong>${brandName}</strong> campaign and wanted to follow up on payment.</p>
    
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #991b1b;">Campaign Summary:</h3>
        <ul style="margin: 0;">
            <li><strong>Value:</strong> $${dealValue.toLocaleString()}</li>
            <li><strong>Type:</strong> ${dealType}</li>
            <li>All deliverables completed and delivered</li>
            <li>Campaign performance metrics available upon request</li>
        </ul>
    </div>
    
    ${deal.deliverables.find(d => d.invoiceLink) ? 
        `<p><strong>Invoice Link:</strong> <a href="${deal.deliverables.find(d => d.invoiceLink)?.invoiceLink}" style="color: #3b82f6;">${deal.deliverables.find(d => d.invoiceLink)?.invoiceLink}</a></p>` : 
        '<p>Please let me know your preferred method for receiving the invoice.</p>'
    }
    
    <p>Thank you for the great collaboration! I look forward to working together again in the future.</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        },

        "Follow Up": {
            subject: `Following Up - ${brandName} Partnership`,
            bodyText: `Hi ${contact.name || "there"},

I wanted to follow up on our ${brandName} partnership discussion.

Deal Details:
- Value: $${dealValue.toLocaleString()}
- Type: ${dealType}
- Status: ${deal.status}

I'm still very interested in this collaboration and wanted to check if you need any additional information from me or if there are any questions I can answer.

Please let me know if there's anything I can do to help move this forward.

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6366f1;">Following Up - ${brandName} Partnership</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>I wanted to follow up on our <strong>${brandName}</strong> partnership discussion.</p>
    
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Deal Details:</h3>
        <ul style="margin: 0;">
            <li><strong>Value:</strong> $${dealValue.toLocaleString()}</li>
            <li><strong>Type:</strong> ${dealType}</li>
            <li><strong>Status:</strong> ${deal.status}</li>
        </ul>
    </div>
    
    <p>I'm still very interested in this collaboration and wanted to check if you need any additional information from me or if there are any questions I can answer.</p>
    
    <p>Please let me know if there's anything I can do to help move this forward.</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        },

        "Archive Deal": {
            subject: `Archiving Partnership Discussion - ${brandName}`,
            bodyText: `Hi ${contact.name || "there"},

I wanted to reach out regarding our ${brandName} partnership discussion.

Since we haven't been able to align on terms or timing for this collaboration, I'll be archiving this opportunity in my system. However, I'd love to keep the door open for future partnerships.

If circumstances change or you have other opportunities that might be a better fit, please don't hesitate to reach out.

Thank you for your time and consideration.

Best regards,
${creatorName}`,
            bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6b7280;">Archiving Partnership Discussion</h2>
    
    <p>Hi ${contact.name || "there"},</p>
    
    <p>I wanted to reach out regarding our <strong>${brandName}</strong> partnership discussion.</p>
    
    <p>Since we haven't been able to align on terms or timing for this collaboration, I'll be archiving this opportunity in my system. However, I'd love to keep the door open for future partnerships.</p>
    
    <p>If circumstances change or you have other opportunities that might be a better fit, please don't hesitate to reach out.</p>
    
    <p>Thank you for your time and consideration.</p>
    
    <p>Best regards,<br>${creatorName}</p>
</div>`
        }
    };

    // Apply greeting and signature to the selected template
    const template = baseTemplates[actionType];
    
    // For now, return the template as-is since we've already applied greeting and signature
    // In the future, we could add more dynamic replacement here
    return template;
};

/**
 * Get the primary contact email from a deal's contact
 */
export const getPrimaryContactEmail = (deal: Deal): string | null => {
    return deal.contact?.email || null;
};

/**
 * Get all contact emails from a deal's contact (returns single email in array for backward compatibility)
 */
export const getAllContactEmails = (deal: Deal): string[] => {
    const email = deal.contact?.email;
    return email ? [email] : [];
};
