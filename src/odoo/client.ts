import { randomUUID } from 'node:crypto';
import type { OdooConfig } from '../config/env.js';
import type { Logger } from '../observability/logger.js';
import { JsonLogger } from '../observability/logger.js';
import { OdooApiError } from './errors.js';

export type OdooMethodParams = Record<string, unknown>;

export class OdooClient {
  constructor(
    private readonly config: OdooConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly logger: Logger = new JsonLogger(),
  ) {}

  async call<T>(model: string, method: string, params: OdooMethodParams = {}): Promise<T> {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    this.logger.info('odoo.request.started', { requestId, model, method });

    try {
      const response = await this.fetchImpl(
        `${this.config.baseUrl}/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`,
        { method: 'POST', headers: this.headers(requestId), body: JSON.stringify(params), signal: controller.signal },
      );
      const body = await this.readBody(response);
      if (!response.ok) {
        throw new OdooApiError(`Odoo request failed with HTTP ${response.status}`, 'http', response.status, body);
      }
      this.logger.info('odoo.request.completed', { requestId, model, method, status: response.status, durationMs: Date.now() - startedAt });
      return body as T;
    } catch (error) {
      const mapped = this.mapError(error);
      this.logger.error('odoo.request.failed', {
        requestId, model, method, kind: mapped.kind, status: mapped.status, durationMs: Date.now() - startedAt,
      });
      throw mapped;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapError(error: unknown): OdooApiError {
    if (error instanceof OdooApiError) return error;
    if (error instanceof Error && error.name === 'AbortError') {
      return new OdooApiError('Odoo request timed out', 'timeout', undefined, undefined, { cause: error });
    }
    return new OdooApiError('Odoo request failed before receiving an HTTP response', 'network', undefined, undefined, {
      cause: error,
    });
  }

  private headers(requestId: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'odoo-mcp/0.1.0',
      'X-Request-ID': requestId,
    };
    if (this.config.database) headers['X-Odoo-Database'] = this.config.database;
    return headers;
  }

  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }
}
