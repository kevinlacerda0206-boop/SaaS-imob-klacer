import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "./admin";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

async function provisionGuestProfile(userId: string) {
  const admin = createAdminClient();
  const { data: account } = await admin.from("accounts").insert({ name: "Conta pessoal" }).select("id").single();
  if (!account) return;
  await admin.from("profiles").insert({ id: userId, account_id: account.id, name: "Convidado", role: "gestor" });
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Rotas de API tratam autenticação e ausência de perfil por conta própria
  // (retornando JSON de erro) — nunca devem ser redirecionadas como páginas.
  if (path.startsWith("/api/")) {
    return response;
  }

  const { data: userData } = await supabase.auth.getUser();
  let user = userData.user;

  // Visitante sem sessão nenhuma entra como convidado (sessão anônima) — só
  // Equipe exige conta de verdade; o resto do app já funciona de cara.
  // Só cria a sessão numa navegação de página real (não em cada sub-recurso
  // que o navegador dispara em paralelo), senão a corrida entre requisições
  // simultâneas cria vários convidados diferentes pro mesmo visitante.
  const fetchMode = request.headers.get("sec-fetch-mode");
  const isNavigation = fetchMode === null || fetchMode === "navigate";
  if (!user && !isPublic && isNavigation) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error) user = data.user;
  }

  if (user && !isPublic && path !== "/onboarding") {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) {
      if (user.is_anonymous) {
        await provisionGuestProfile(user.id);
      } else {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && !user.is_anonymous && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
