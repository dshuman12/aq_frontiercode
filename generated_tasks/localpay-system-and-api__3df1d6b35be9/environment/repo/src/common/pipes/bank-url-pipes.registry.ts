import { BOAUrlPipe } from './boa.pipe';
import { CBEBankUrlPipe } from './cbe.pipe';
import { TelebirrUrlPipe } from './tele.pipe';
import { EBirrUrlPipe } from './ebirr.pipe';
export const BANK_URL_PIPE_REGISTRY: Record<
  string,
  { transform: (url: string) => string }
> = {
  CBE: new CBEBankUrlPipe(),
  TELEBIRR: new TelebirrUrlPipe(),
  ABYSSINIA: new BOAUrlPipe(),
  EBIRR: new EBirrUrlPipe(),
};
