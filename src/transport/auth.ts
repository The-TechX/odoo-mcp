import { timingSafeEqual } from 'node:crypto';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

export class StaticBearerTokenVerifier implements OAuthTokenVerifier {
  constructor(private readonly expectedToken: string) {}

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (!tokensEqual(token, this.expectedToken)) {
      throw new InvalidTokenError('Invalid access token');
    }

    return {
      token,
      clientId: 'pre-shared-token',
      scopes: [],
      expiresAt: 253402300799,
    };
  }
}

function tokensEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
