import crypto from "crypto";
import type { OrderRecord } from "@/lib/mockData";

export const OMNISYNC_WEBHOOK_SECRET =
  process.env.OMNISYNC_WEBHOOK_SECRET ||
  "whsec_omnisync_enterprise_2026_secret";

export type SseEventType = "connected" | "webhook_order" | "cron_sync";

export interface SseBroadcastEvent {
  id: string;
  type: SseEventType;
  timestamp: string;
  order?: OrderRecord;
  message?: string;
  meta?: Record<string, unknown>;
}

type SseSubscriber = (event: SseBroadcastEvent) => void;

interface RateLimitBucket {
  timestamps: number[];
}

interface GlobalBrokerState {
  subscribers: Set<SseSubscriber>;
  recentEvents: SseBroadcastEvent[];
  rateLimitMap: Map<string, RateLimitBucket>;
}

const globalForBroker = globalThis as unknown as {
  __omnisyncBroker?: GlobalBrokerState;
};

function getBrokerState(): GlobalBrokerState {
  if (!globalForBroker.__omnisyncBroker) {
    globalForBroker.__omnisyncBroker = {
      subscribers: new Set<SseSubscriber>(),
      recentEvents: [],
      rateLimitMap: new Map<string, RateLimitBucket>(),
    };
  }
  return globalForBroker.__omnisyncBroker;
}

export function subscribeToSse(listener: SseSubscriber): () => void {
  const state = getBrokerState();
  state.subscribers.add(listener);
  return () => {
    state.subscribers.delete(listener);
  };
}

export function broadcastSseEvent(
  event: Omit<SseBroadcastEvent, "id" | "timestamp">
): SseBroadcastEvent {
  const state = getBrokerState();
  const fullEvent: SseBroadcastEvent = {
    ...event,
    id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  state.recentEvents = [fullEvent, ...state.recentEvents.slice(0, 24)];

  for (const listener of state.subscribers) {
    try {
      listener(fullEvent);
    } catch {
      // Ignore closed stream errors
    }
  }

  return fullEvent;
}

export function getRecentSseEvents(): SseBroadcastEvent[] {
  return getBrokerState().recentEvents;
}

// ============================================================================
// HMAC SHA-256 Webhook Signature Verification
// ============================================================================

export function computeHmacSha256(
  rawBody: string,
  secret: string = OMNISYNC_WEBHOOK_SECRET
): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyHmacSha256Signature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string = OMNISYNC_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !signatureHeader.trim()) {
    return false;
  }

  const normalizedProvided = signatureHeader
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();

  const expectedHex = computeHmacSha256(rawBody, secret).toLowerCase();

  try {
    const providedBuf = Buffer.from(normalizedProvided, "hex");
    const expectedBuf = Buffer.from(expectedHex, "hex");

    if (
      providedBuf.length === 0 ||
      providedBuf.length !== expectedBuf.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ============================================================================
// Sliding-Window API Rate Limiting
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetEpochSeconds: number;
  headers: Record<string, string>;
}

export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60_000
): RateLimitResult {
  const state = getBrokerState();
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = state.rateLimitMap.get(identifier) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  const allowed = bucket.timestamps.length < limit;
  if (allowed) {
    bucket.timestamps.push(now);
  }
  state.rateLimitMap.set(identifier, bucket);

  const remaining = Math.max(0, limit - bucket.timestamps.length);
  const resetEpochSeconds = Math.ceil((now + windowMs) / 1000);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetEpochSeconds),
  };

  if (!allowed) {
    headers["Retry-After"] = String(Math.ceil(windowMs / 1000));
  }

  return {
    allowed,
    limit,
    remaining,
    resetEpochSeconds,
    headers,
  };
}
