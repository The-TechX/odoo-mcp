import type { AuthMetadataOptions, BearerAuthOptions } from '@modelcontextprotocol/server';
import { MCPAuth } from 'mcp-auth';
import type { OdooConfig } from '../config/env.js';

/** Authentication boundary consumed by the HTTP transport. */
export interface AuthProvider {
  getBearerAuthOptions(): BearerAuthOptions | undefined;
  getAuthMetadataOptions(): Promise<AuthMetadataOptions | undefined>;
}

export class NoAuthProvider implements AuthProvider {
  getBearerAuthOptions(): undefined { return undefined; }
  async getAuthMetadataOptions(): Promise<undefined> { return undefined; }
}

export class OidcAuthProvider implements AuthProvider {
  private readonly auth: MCPAuth;

  constructor(
    issuer: string,
    resource: string,
    private readonly requiredScopes: string[],
  ) {
    this.auth = new MCPAuth({
      protectedResourceMetadata: {
        resource,
        authorizationServer: { issuer, type: 'oidc' },
        scopesSupported: requiredScopes,
        resourceName: 'Odoo MCP',
      },
    });
  }

  getBearerAuthOptions(): BearerAuthOptions {
    return this.auth.getBearerAuthOptions({ requiredScopes: this.requiredScopes });
  }

  getAuthMetadataOptions(): Promise<AuthMetadataOptions> {
    return this.auth.getAuthMetadataOptions();
  }
}

export function createAuthProvider(config: OdooConfig): AuthProvider {
  if (config.httpAuth === 'none') return new NoAuthProvider();
  return new OidcAuthProvider(config.authIssuer!, config.authResource!, config.authRequiredScopes);
}
