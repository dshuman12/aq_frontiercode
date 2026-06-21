export class HealthBridgeClient {
  constructor(private readonly baseUrl: string) {}

  async health(): Promise<Response> {
    return fetch(`${this.baseUrl}/health`);
  }
}
