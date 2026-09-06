export type LogFields = Record<string, unknown>;

export interface Logger {
  info(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export class JsonLogger implements Logger {
  constructor(private readonly sink: (line: string) => void = (line) => console.error(line)) {}

  info(message: string, fields: LogFields = {}): void { this.write('info', message, fields); }
  error(message: string, fields: LogFields = {}): void { this.write('error', message, fields); }

  private write(level: 'info' | 'error', message: string, fields: LogFields): void {
    this.sink(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields }));
  }
}
