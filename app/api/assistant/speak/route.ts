import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAppClient } from "@/lib/supabaseServer";

export const maxDuration = 30;

let workingTts = "";

// Turns a reply into spoken audio with Gemini's text-to-speech, which can
// pronounce languages that the browser's built-in voices cannot.
export async function POST(req: NextRequest) {
  const supabase = createServerAppClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 503 });

  const body = await req.json();
  const text = String(body.text || "").trim().slice(0, 400);
  if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

  const models = [process.env.GEMINI_TTS_MODEL, workingTts, "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"].filter(Boolean) as string[];
  const tried = new Set<string>();
  let lastStatus = 0;
  let lastDetail = "";

  for (const model of models) {
    if (tried.has(model)) continue;
    tried.add(model);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const part = (data.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.data);
        if (part) {
          workingTts = model;
          return NextResponse.json({ audio: part.inlineData.data, mime: part.inlineData.mimeType || "audio/L16;rate=24000" });
        }
        lastStatus = 204;
        continue;
      }
      lastStatus = res.status;
      lastDetail = (await res.text()).slice(0, 200);
      if (![404, 400, 429, 500, 503].includes(res.status)) break;
    } catch {
      lastStatus = 0;
    }
  }
  return NextResponse.json({ error: "tts_error", status: lastStatus, detail: lastDetail }, { status: 502 });
}
