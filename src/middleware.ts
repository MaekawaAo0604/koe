import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // セッションのリフレッシュ（要件1 AC-9: セッション自動維持）
  const { user, supabaseResponse } = await updateSession(request);

  // 未認証で /dashboard* へのアクセス → /login へリダイレクト（要件1 AC-8）
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico
     * - widget.js (埋め込みウィジェット — サードパーティサイトから直接取得)
     * - 画像ファイル (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|widget.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
