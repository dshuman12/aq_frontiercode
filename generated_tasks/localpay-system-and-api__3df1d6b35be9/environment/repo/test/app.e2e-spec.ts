import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from 'src/app.module';

describe('BotService integration', () => {
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('routes webhook payload to the welcome scene', () => {
    const payload = { telegramUser: { id: 123 } };
  });
});
