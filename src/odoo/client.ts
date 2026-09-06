import type { OdooConfig } from '../config/env.js';
import { OdooApiError } from './errors.js';

export type OdooMethodParams = Record<string, unknown>;

export class OdooClient {
  constructor(
    private readonly config: OdooConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async call<T>(model: string, method: string, params: OdooMethodParams = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImpl(
        `${this.config.baseUrl}/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(params),
          signal: controller.signal,
        },
      );

      const body = await this.readBody(response);
      if (!response.ok) {
        throw new OdooApiError(`Odoo request failed with HTTP ${response.status}`, response.status, body);
      }

      return body as T;
    } catch (error) {
      if (error instanceof OdooApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OdooApiError('Odoo request timed out', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'odoo-mcp/0.1.0',
    };
    if (this.config.database) headers['X-Odoo-Database'] = this.config.database;
    return headers;
  }

  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
