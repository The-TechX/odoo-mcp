import { timingSafeEqual } from 'node:crypto';
import { OAuthError, OAuthErrorCode, type AuthInfo, type OAuthTokenVerifier } from '@modelcontextprotocol/server';

export class StaticBearerTokenVerifier implements OAuthTokenVerifier {
  constructor(private readonly expectedToken: string) {}

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (!tokensEqual(token, this.expectedToken)) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token');
    }
    return { token, clientId: 'pre-shared-token', scopes: [], expiresAt: 253402300799 };
  }
}

function tokensEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
