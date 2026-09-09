import { createServer, type Server } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OidcAuthProvider } from '../src/transport/auth.js';

let server: Server;
let issuer: string;
let privateKey: KeyLike;
const resource = 'https://mcp.example.com/mcp';
const kid = 'test-key';

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  Object.assign(jwk, { kid, alg: 'RS256', use: 'sig' });

  server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/.well-known/openid-configuration') {
      res.end(JSON.stringify({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`, response_types_supported: ['code'], code_challenge_methods_supported: ['S256'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'] }));
      return;
    }
    if (req.url === '/jwks') { res.end(JSON.stringify({ keys: [jwk] })); return; }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test issuer did not bind');
  issuer = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

async function token(overrides: { issuer?: string; audience?: string; expiresIn?: string | number; scope?: string } = {}) {
  return new SignJWT({ scope: overrides.scope ?? 'mcp_access' })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? resource)
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '5m')
    .sign(privateKey);
}

describe('OIDC JWT verifier', () => {
  it('accepts a signed JWT with trusted issuer and resource audience', async () => {
    const provider = new OidcAuthProvider(issuer, resource, ['mcp_access']);
    const info = await provider.getBearerAuthOptions().verifier.verifyAccessToken(await token());
    expect(info).toEqual(expect.objectContaining({ scopes: ['mcp_access'] }));
  });

  it('rejects an expired JWT', async () => {
    const provider = new OidcAuthProvider(issuer, resource, ['mcp_access']);
    await expect(provider.getBearerAuthOptions().verifier.verifyAccessToken(await token({ expiresIn: -10 }))).rejects.toThrow();
  });

  it('rejects a JWT from another issuer', async () => {
    const provider = new OidcAuthProvider(issuer, resource, ['mcp_access']);
    await expect(provider.getBearerAuthOptions().verifier.verifyAccessToken(await token({ issuer: 'https://evil.example.com' }))).rejects.toThrow();
  });

  it('rejects a JWT for another audience', async () => {
    const provider = new OidcAuthProvider(issuer, resource, ['mcp_access']);
    await expect(provider.getBearerAuthOptions().verifier.verifyAccessToken(await token({ audience: 'https://other.example.com/mcp' }))).rejects.toThrow();
  });
});
