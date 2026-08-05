import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Transcrição de voz não configurada no servidor." }, { status: 500 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Áudio ausente." }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Gravação vazia." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Áudio muito longo." }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "audio.webm");
  upstream.append("model", "whisper-1");
  upstream.append("language", "pt");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `Falha na transcrição: ${detail.slice(0, 300)}` }, { status: 502 });
  }

  const data = (await res.json()) as { text?: string };
  return NextResponse.json({ text: data.text?.trim() || "" });
}
