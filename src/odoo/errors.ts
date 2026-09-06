export type OdooErrorKind = 'http' | 'timeout' | 'network';

export class OdooApiError extends Error {
  constructor(
    message: string,
    readonly kind: OdooErrorKind,
    readonly status?: number,
    readonly details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'OdooApiError';
  }
}
