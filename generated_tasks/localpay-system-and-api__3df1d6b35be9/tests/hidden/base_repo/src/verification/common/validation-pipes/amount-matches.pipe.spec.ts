import { AmountMatchesPipe } from './amount-matches.pipe';

describe('AmountMatchesPipe', () => {
  const pipe = new AmountMatchesPipe();

  it('passes when amount matches within tolerance', () => {
    const result = pipe.run(
      { confirmedAmount: 100.005 } as any,
      { amount: 100.0 } as any,
    );

    expect(result).toEqual({ pass: true });
  });

  it('fails when confirmed amount is unreadable', () => {
    const result = pipe.run(
      { confirmedAmount: null } as any,
      { amount: 100 } as any,
    );

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('AMOUNT_UNREADABLE');
  });

  it('fails on amount mismatch beyond tolerance', () => {
    const result = pipe.run(
      { confirmedAmount: 101.5 } as any,
      { amount: 100.0 } as any,
    );

    expect(result.pass).toBe(false);
    expect(result.reasonCode).toBe('AMOUNT_MISMATCH');
  });
});
