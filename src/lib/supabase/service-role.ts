import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service Role クライアント。
 * Webhook ハンドラ内でのみ使用する。NEXT_PUBLIC_ プレフィックスなし（要件9 AC-2）。
 */
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
