import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { name, role, teamName, joinCode } = (await req.json()) as {
    name: string;
    role: "corretor" | "gestor";
    teamName?: string;
    joinCode?: string;
  };

  if (!name || !role) {
    return NextResponse.json({ error: "Nome e função são obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existingProfile) {
    return NextResponse.json({ error: "Perfil já existe." }, { status: 409 });
  }

  let accountId: string;

  if (role === "gestor") {
    if (!teamName?.trim()) {
      return NextResponse.json({ error: "Informe o nome da equipe/imobiliária." }, { status: 400 });
    }
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .insert({ name: teamName.trim() })
      .select("id")
      .single();
    if (accountError || !account) {
      return NextResponse.json({ error: accountError?.message || "Falha ao criar a conta." }, { status: 500 });
    }
    accountId = account.id;
  } else {
    if (!joinCode?.trim()) {
      return NextResponse.json({ error: "Informe o código da equipe." }, { status: 400 });
    }
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id")
      .eq("id", joinCode.trim())
      .maybeSingle();
    if (accountError || !account) {
      return NextResponse.json({ error: "Código da equipe inválido." }, { status: 400 });
    }
    accountId = account.id;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    account_id: accountId,
    name: name.trim(),
    role,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ accountId });
}
