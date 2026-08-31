import { createClient } from "@supabase/supabase-js";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../../config/env.js";
import { createFetchWithTimeout } from "../../db/pool.js";
import * as attachmentsRepo from "./attachments.repo.js";

const STORAGE_REQUEST_TIMEOUT_MS = 60_000;
const CLEANUP_REQUEST_TIMEOUT_MS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;
const CLEANUP_BATCH_SIZE = 50;

type StorageClient = ReturnType<typeof createClient>;
type CleanupLogger = Pick<FastifyBaseLogger, "warn">;

let attachmentStorageClient: StorageClient | null = null;
let cleanupStorageClient: StorageClient | null = null;
let lastCleanupAt = 0;
let cleanupInFlight: Promise<number> | null = null;

function createStorageClient(timeoutMs: number): StorageClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for attachment storage");
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: createFetchWithTimeout(timeoutMs) },
  });
}

export function getAttachmentStorageClient(): StorageClient {
  attachmentStorageClient ??= createStorageClient(STORAGE_REQUEST_TIMEOUT_MS);
  return attachmentStorageClient;
}

function getCleanupStorageClient(): StorageClient {
  cleanupStorageClient ??= createStorageClient(CLEANUP_REQUEST_TIMEOUT_MS);
  return cleanupStorageClient;
}

export async function cleanupAttachmentStorage(
  log: CleanupLogger,
  options?: { force?: boolean }
): Promise<number> {
  if (cleanupInFlight) return cleanupInFlight;
  if (!options?.force && Date.now() - lastCleanupAt < CLEANUP_INTERVAL_MS) return 0;

  lastCleanupAt = Date.now();
  const cleanup = (async () => {
    const paths = await attachmentsRepo.listAttachmentCleanupPaths(CLEANUP_BATCH_SIZE);
    if (paths.length === 0) return 0;

    const { error } = await getCleanupStorageClient().storage
      .from("attachments")
      .remove(paths);
    if (error) throw new Error(`Attachment Storage cleanup failed: ${error.message}`);

    await attachmentsRepo.acknowledgeAttachmentCleanup(paths);
    return paths.length;
  })();
  cleanupInFlight = cleanup;

  try {
    return await cleanup;
  } catch (error) {
    // Rows remain durable when Storage is unavailable, so a later upload or
    // purge can retry without losing the object paths.
    log.warn(error, "Failed to clean up attachment Storage objects");
    return 0;
  } finally {
    if (cleanupInFlight === cleanup) cleanupInFlight = null;
  }
}
