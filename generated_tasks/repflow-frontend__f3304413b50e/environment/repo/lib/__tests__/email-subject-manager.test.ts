import { EmailSubjectManager } from '../email-subject-manager';

// Mock deal object for testing - matches Deal type with brand.name
const mockDeal = {
    uuid: 'test-deal-123',
    title: 'Test Company',
    dealType: 'Brand Partnership',
    value: 5000,
    brand: { name: 'Test Company' },
} as any;

describe('EmailSubjectManager', () => {
    let subjectManager: EmailSubjectManager;

    beforeEach(() => {
        subjectManager = EmailSubjectManager.getInstance();
        subjectManager.clearAllSubjects();
    });

    test('should generate consistent subject for a deal', () => {
        const subject = subjectManager.getConsistentSubject(mockDeal);
        
        expect(subject).toBeDefined();
        expect(subject).toBe('Test Company - Creator');
    });

    test('should return the same subject for the same deal', () => {
        const subject1 = subjectManager.getConsistentSubject(mockDeal);
        const subject2 = subjectManager.getConsistentSubject(mockDeal);
        
        expect(subject1).toBe(subject2);
    });

    test('should generate same subject regardless of action type', () => {
        const acceptSubject = subjectManager.getConsistentSubject(mockDeal, 'Accept');
        const rejectSubject = subjectManager.getConsistentSubject(mockDeal, 'Reject');
        
        expect(acceptSubject).toBe(rejectSubject);
        expect(acceptSubject).toBe('Test Company - Creator');
    });

    test('should allow setting custom subject', () => {
        const customSubject = 'Custom Subject for Test Company';
        subjectManager.setCustomSubject(mockDeal.uuid, customSubject);
        
        const retrievedSubject = subjectManager.getConsistentSubject(mockDeal);
        expect(retrievedSubject).toBe(customSubject);
    });

    test('should clear subject when requested', () => {
        subjectManager.getConsistentSubject(mockDeal);
        expect(subjectManager.hasSubject(mockDeal.uuid)).toBe(true);
        
        subjectManager.clearSubject(mockDeal.uuid);
        expect(subjectManager.hasSubject(mockDeal.uuid)).toBe(false);
        
        // After clear, getConsistentSubject generates fresh subject (same value for same deal)
        const subject2 = subjectManager.getConsistentSubject(mockDeal);
        expect(subject2).toBe('Test Company - Creator');
    });

    test('should check if subject exists', () => {
        expect(subjectManager.hasSubject(mockDeal.uuid)).toBe(false);
        
        subjectManager.getConsistentSubject(mockDeal);
        expect(subjectManager.hasSubject(mockDeal.uuid)).toBe(true);
    });
});
