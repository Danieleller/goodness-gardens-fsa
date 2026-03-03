/**
 * Compatibility shim: re-exports the browser Supabase client.
 * Old code imports `supabase` from '@/lib/supabase' — this keeps it working.
 * Uses a getter to avoid eagerly creating the client during SSR/build.
 */
import { createClient } from "@/lib/supabase/client";

let _client: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop, receiver) {
    if (!_client) _client = createClient();
    return Reflect.get(_client, prop, receiver);
  },
});
