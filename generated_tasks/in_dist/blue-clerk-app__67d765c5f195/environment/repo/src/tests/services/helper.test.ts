import { expect } from 'chai';
import { toCursorHash, fromCursorHash, roundTwoDecimal, delimiterEnUs, checkPasswordRegex, waitTimer, getRegex, toTitleCase } from '../../services/helper';

describe('Helper Service Tests', () => {
    describe('toCursorHash', () => {
        it('should convert string to base64 hash', () => {
            const result = toCursorHash('test');
            expect(result).to.equal('dGVzdA==');
        });

        it('should return undefined for empty string', () => {
            const result = toCursorHash('');
            expect(result).to.be.undefined;
        });
    });

    describe('fromCursorHash', () => {
        it('should convert base64 hash to string', () => {
            const result = fromCursorHash('dGVzdA==');
            expect(result).to.equal('test');
        });

        it('should return undefined for empty string', () => {
            const result = fromCursorHash('');
            expect(result).to.be.undefined;
        });
    });

    describe('roundTwoDecimal', () => {
        it('should round number to two decimal places', () => {
            const result = roundTwoDecimal(123.456);
            expect(result).to.equal(123.46);
        });

        it('should correctly round numbers with more than two decimal places', () => {
            expect(roundTwoDecimal(123.4567)).to.equal(123.46);
            expect(roundTwoDecimal(123.4545)).to.equal(123.45);
            expect(roundTwoDecimal(123.4550)).to.equal(123.46);
        });
    });

    describe('delimiterEnUs', () => {
        it('should format number with two decimal places and US delimiter', () => {
            const result = delimiterEnUs(123456.789);
            expect(result).to.equal('$123,456.79');
        });
    });

    describe('checkPasswordRegex', () => {
        it('should return true for valid password', async () => {
            const result = await checkPasswordRegex('Valid1@Password');
            expect(result).to.be.true;
        });

        it('should return false for invalid password', async () => {
            const result = await checkPasswordRegex('invalid');
            expect(result).to.be.false;
        });

        it('should return false for empty password', async () => {
            const result = await checkPasswordRegex('');
            expect(result).to.be.false;
        });
    });

    describe('waitTimer', () => {
        it('should wait for the specified time', async () => {
            const start = Date.now();
            await waitTimer(100);
            const end = Date.now();
            expect(end - start).to.be.at.least(100);
        });
    });

    describe('getRegex', () => {
        it('should construct regex object', () => {
            const result = getRegex('test', 'i');
            expect(result).to.deep.equal({ $regex: 'test', $options: 'i' });
        });
    });

    describe('toTitleCase', () => {
        it('should convert string to title case', () => {
            const result = toTitleCase('hello world');
            expect(result).to.equal('Hello World');
        });

        it('should return undefined for empty string', () => {
            const result = toTitleCase('');
            expect(result).to.be.undefined;
        });
    });
});