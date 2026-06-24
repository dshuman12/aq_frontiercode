export type EmailGreeting = {
    id: string;
    label: string;
    text: string;
};

export type EmailSignature = {
    id: string;
    label: string;
    text: string;
};

export type EmailSettings = {
    selectedGreeting: string;
    selectedSignature: string;
    customGreeting?: string;
    customSignature?: string;
};

// Predefined greeting options
export const greetingOptions: EmailGreeting[] = [
    {
        id: "formal",
        label: "Formal",
        text: "Dear {contactName},"
    },
    {
        id: "professional",
        label: "Professional",
        text: "Hi {contactName},"
    },
    {
        id: "friendly",
        label: "Friendly",
        text: "Hello {contactName},"
    },
    {
        id: "casual",
        label: "Casual",
        text: "Hey {contactName},"
    },
    {
        id: "generic",
        label: "Generic",
        text: "Hi there,"
    },
    {
        id: "custom",
        label: "Custom",
        text: "{customGreeting}"
    }
];

// Predefined signature options
export const signatureOptions: EmailSignature[] = [
    {
        id: "professional",
        label: "Professional",
        text: "Best regards,\n{creatorName}"
    },
    {
        id: "warm",
        label: "Warm",
        text: "Warm regards,\n{creatorName}"
    },
    {
        id: "friendly",
        label: "Friendly",
        text: "Thanks,\n{creatorName}"
    },
    {
        id: "formal",
        label: "Formal",
        text: "Sincerely,\n{creatorName}"
    },
    {
        id: "excited",
        label: "Excited",
        text: "Looking forward to working together!\n\nBest,\n{creatorName}"
    },
    {
        id: "brief",
        label: "Brief",
        text: "Best,\n{creatorName}"
    },
    {
        id: "custom",
        label: "Custom",
        text: "{customSignature}"
    }
];

// Default email settings
export const defaultEmailSettings: EmailSettings = {
    selectedGreeting: "professional",
    selectedSignature: "professional"
};

/**
 * Get greeting text based on settings
 */
export const getGreetingText = (
    settings: EmailSettings,
    contactName?: string
): string => {
    const greeting = greetingOptions.find(g => g.id === settings.selectedGreeting);
    if (!greeting) return "Hi there,";

    let text = greeting.text;
    
    // Replace {customGreeting} placeholder first
    text = text.replace("{customGreeting}", settings.customGreeting || "Hi there,");
    
    // Then replace {contactName} placeholders (including within custom greetings)
    text = text.replace(/\{contactName\}/g, contactName || "there");
    
    return text;
};

/**
 * Get signature text based on settings
 */
export const getSignatureText = (
    settings: EmailSettings,
    creatorName?: string,
    contactName?: string
): string => {
    const signature = signatureOptions.find(s => s.id === settings.selectedSignature);
    if (!signature) return `Best regards,\n${creatorName || "Creator"}`;

    let text = signature.text;
    
    // Replace {customSignature} placeholder first
    text = text.replace("{customSignature}", settings.customSignature || `Best regards,\n${creatorName || "Creator"}`);
    
    // Then replace placeholders (including within custom signatures)
    text = text.replace(/\{creatorName\}/g, creatorName || "Creator");
    text = text.replace(/\{contactName\}/g, contactName || "there");
    
    return text;
};

/**
 * Apply greeting and signature to email content
 */
export const applyEmailFormatting = (
    content: string,
    settings: EmailSettings,
    contactName?: string,
    creatorName?: string
): string => {
    const greeting = getGreetingText(settings, contactName);
    const signature = getSignatureText(settings, creatorName, contactName);
    
    // Replace placeholders in content
    let formattedContent = content;
    formattedContent = formattedContent.replace(/Hi \{contactName\}|Hi there|Dear \{contactName\}/g, greeting);
    formattedContent = formattedContent.replace(/Best regards,\n\{creatorName\}/g, signature);
    
    return formattedContent;
};

/**
 * Apply greeting and signature to HTML email content
 */
export const applyEmailFormattingHtml = (
    htmlContent: string,
    settings: EmailSettings,
    contactName?: string,
    creatorName?: string
): string => {
    const greeting = getGreetingText(settings, contactName);
    const signature = getSignatureText(settings, creatorName, contactName);
    
    // Convert signature newlines to HTML breaks
    const htmlSignature = signature.replace(/\n/g, '<br>');
    
    // Replace placeholders in HTML content
    let formattedContent = htmlContent;
    formattedContent = formattedContent.replace(
        /<p>Hi \{contactName\}|<p>Hi there|<p>Dear \{contactName\}/g, 
        `<p>${greeting}`
    );
    formattedContent = formattedContent.replace(
        /<p>Best regards,<br>\{creatorName\}<\/p>/g, 
        `<p>${htmlSignature}</p>`
    );
    
    return formattedContent;
};

/**
 * Save email settings to localStorage
 */
export const saveEmailSettings = (settings: EmailSettings): void => {
    localStorage.setItem('emailSettings', JSON.stringify(settings));
};

/**
 * Load email settings from localStorage
 */
export const loadEmailSettings = (): EmailSettings => {
    try {
        const saved = localStorage.getItem('emailSettings');
        if (saved) {
            return { ...defaultEmailSettings, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.error("Error loading email settings:", error);
    }
    return defaultEmailSettings;
};
