import { expect } from 'chai';
import { calculatePercentage } from '../../controllers/demo';

describe('calculatePercentage', () => {
    it('should return 100 when input is 1', () => {
        const result = calculatePercentage(1);
        expect(result).to.equal(100);
    });

    it('should return 200 when input is 2', () => {
        const result = calculatePercentage(2);
        expect(result).to.equal(200);
    });

    it('should return 0 when input is 0', () => {
        const result = calculatePercentage(0);
        expect(result).to.equal(0);
    });

    it('should return -100 when input is -1', () => {
        const result = calculatePercentage(-1);
        expect(result).to.equal(-100);
    });

    it('should return 50 when input is 0.5', () => {
        const result = calculatePercentage(0.5);
        expect(result).to.equal(50);
    });
});