import type { OdooClient } from './client.js';

export type OdooDomain = unknown[];

export type SearchReadOptions = {
  domain?: OdooDomain;
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
};

export class OdooReader {
  constructor(private readonly client: OdooClient) {}

  searchRead<T extends Record<string, unknown>>(model: string, options: SearchReadOptions = {}): Promise<T[]> {
    const { domain = [], fields, limit, offset, order } = options;
    return this.client.call<T[]>(model, 'search_read', compact({ domain, fields, limit, offset, order }));
  }

  fieldsGet(model: string, attributes: string[] = ['string', 'type', 'required', 'readonly', 'relation']): Promise<Record<string, unknown>> {
    return this.client.call<Record<string, unknown>>(model, 'fields_get', { attributes });
  }
}

function compact(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
