export type AccessMode = 'read-only' | 'read-write';

export type ModelPolicy = {
  mode: AccessMode;
  allowModels: string[];
  denyModels: string[];
};

export class PolicyDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyDeniedError';
  }
}

export class AccessPolicy {
  constructor(private readonly policy: ModelPolicy) {}

  assertRead(model: string): void {
    this.assertModel(model);
  }

  assertWrite(model: string): void {
    if (this.policy.mode !== 'read-write') {
      throw new PolicyDeniedError('Write operations are disabled by ODOO_MCP_MODE');
    }
    this.assertModel(model);
  }

  private assertModel(model: string): void {
    if (this.policy.denyModels.includes(model)) {
      throw new PolicyDeniedError(`Model ${model} is denied by policy`);
    }
    if (this.policy.allowModels.length > 0 && !this.policy.allowModels.includes(model)) {
      throw new PolicyDeniedError(`Model ${model} is not included in the allow list`);
    }
  }
}
