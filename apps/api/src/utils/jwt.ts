import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config/env.js";

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCreatedAt = 0;

function getJWKS() {
  if (!config.supabaseUrl) {
    throw new Error("SUPABASE_URL is required for JWT verification");
  }
  const now = Date.now();
  if (!jwks || now - jwksCreatedAt > JWKS_CACHE_TTL_MS) {
    const jwksUrl = `${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`;
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksCreatedAt = now;
  }
  return jwks;
}

export interface VerifiedUser {
  id: string;
  email?: string;
}

export async function verifyToken(token: string): Promise<VerifiedUser> {
  const issuer = `${config.supabaseUrl.replace(/\/$/, "")}/auth/v1`;

  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer,
    audience: "authenticated",
  });

  const sub = payload.sub;
  if (!sub) {
    throw new Error("JWT missing sub claim");
  }

  return {
    id: sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
