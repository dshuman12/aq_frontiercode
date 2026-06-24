import { TelebirrParser } from './telebirr.parser';

describe('TelebirrParser', () => {
  const parser = new TelebirrParser();

  it('extracts receipt link from transaction number text', () => {
    const out = parser.extract('Your transaction number is DCK82EGB8C');
    expect(out.link).toBe(
      'https://transactioninfo.ethiotelecom.et/receipt/DCK82EGB8C',
    );
  });

  it('parses receipt html', async () => {
    const html = `
      <table>
        <tr><td>DCK82EGB8C</td><td>18-03-2026 21:46:09</td><td>ETB 50.00</td></tr>
      </table>
      <table>
        <tr><td>Payer telebirr no</td><td>2519****0000</td></tr>
        <tr><td>Credited Party name</td><td>Receiver A</td></tr>
        <tr><td>Credited party account no</td><td>2519****1111</td></tr>
      </table>
    `;
    const res = await parser.receiptParser(html);
    expect(res.receipt.transactionNumber).toBe('DCK82EGB8C');
    expect(res.receipt.amount).toBe('50.00');
    expect(res.receipt.receiverName).toBe('Receiver A');
  });
});
