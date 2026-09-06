import { describe, expect, it } from 'vitest';
import { JsonLogger } from '../../src/observability/logger.js';

describe('JsonLogger', () => {
  it('emits one structured JSON object per log entry', () => {
    const lines: string[] = [];
    new JsonLogger((line) => lines.push(line)).info('test.event', { requestId: 'abc' });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual(expect.objectContaining({ level: 'info', message: 'test.event', requestId: 'abc' }));
  });
});
