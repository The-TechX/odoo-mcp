import type { OdooClient } from './client.js';

export type OdooValues = Record<string, unknown>;

export class OdooWriter {
  constructor(private readonly client: OdooClient) {}

  create(model: string, values: OdooValues): Promise<number | number[]> {
    return this.client.call<number | number[]>(model, 'create', { vals_list: values });
  }

  write(model: string, ids: number[], values: OdooValues): Promise<boolean> {
    return this.client.call<boolean>(model, 'write', { ids, vals: values });
  }

  unlink(model: string, ids: number[]): Promise<boolean> {
    return this.client.call<boolean>(model, 'unlink', { ids });
  }
}
