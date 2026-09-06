import type { AccessPolicy } from '../config/policy.js';
import type { OdooReader, SearchReadOptions } from './read.js';
import type { OdooValues, OdooWriter } from './write.js';

export class GuardedOdooReader {
  constructor(private readonly reader: OdooReader, private readonly policy: AccessPolicy) {}

  searchRead<T extends Record<string, unknown>>(model: string, options: SearchReadOptions = {}): Promise<T[]> {
    this.policy.assertRead(model);
    return this.reader.searchRead<T>(model, options);
  }

  fieldsGet(model: string, attributes?: string[]): Promise<Record<string, unknown>> {
    this.policy.assertRead(model);
    return this.reader.fieldsGet(model, attributes);
  }
}

export class GuardedOdooWriter {
  constructor(private readonly writer: OdooWriter, private readonly policy: AccessPolicy) {}

  create(model: string, values: OdooValues): Promise<number | number[]> {
    this.policy.assertWrite(model);
    return this.writer.create(model, values);
  }

  write(model: string, ids: number[], values: OdooValues): Promise<boolean> {
    this.policy.assertWrite(model);
    return this.writer.write(model, ids, values);
  }

  unlink(model: string, ids: number[]): Promise<boolean> {
    this.policy.assertWrite(model);
    return this.writer.unlink(model, ids);
  }
}
