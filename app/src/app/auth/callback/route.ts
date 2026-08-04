import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const explicitNext = req.nextUrl.searchParams.get("next");

  let next = explicitNext || "/onboarding";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    if (!explicitNext) {
      // Convidado (anônimo) que virou conta de verdade já tem perfil desde a
      // fase anônima — não precisa passar pelo onboarding de novo.
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
        if (profile) next = "/";
      }
    }
  }

  return NextResponse.redirect(new URL(next, req.url));
}
