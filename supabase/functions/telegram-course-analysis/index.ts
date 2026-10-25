// Supabase Edge Function: telegram-course-analysis
// Groups explicitly imported Telegram lecture titles using Gemini. Counts come only from supplied entries.
const corsHeaders = (origin: string | null) => {
  const allowed =
    !origin ||
    /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
    origin === Deno.env.get("APP_ORIGIN");
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};
function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function jwtSubject(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}
function detectedYear(value: string): number {
  const match = String(value || "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : 0;
}
function oneShotTitle(value: string): boolean {
  return /\bone[\s-]?shot\b|\boneshot\b/i.test(String(value || ""));
}
function completedLecture(row: any): boolean {
  const duration = Math.max(0, Number(row.durationSeconds) || 0);
  const watched = Math.max(0, Number(row.watchedSeconds) || 0);
  return duration > 0 && watched >= duration * 0.9;
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405, origin);
  const allowedOrigin =
    !origin ||
    /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
    origin === Deno.env.get("APP_ORIGIN");
  if (!allowedOrigin) return json({ error: "This website origin is not allowed." }, 403, origin);
  const token = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!jwtSubject(token)) return json({ error: "Sign in to your Personal Space account first." }, 401, origin);

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 120_000) return json({ error: "Lecture data is too large. Import a smaller, course-specific Telegram file." }, 413, origin);
    body = JSON.parse(raw);
  } catch { return json({ error: "Request body must be valid JSON." }, 400, origin); }

  const input = Array.isArray(body?.lectures) ? body.lectures.slice(0, 400) : [];
  const lectures = input.map((row: any) => ({
    id: String(row?.id || "").slice(0, 180),
    title: String(row?.title || "").trim().slice(0, 220),
    subject: String(row?.subject || "").slice(0, 40),
    chapter: String(row?.chapter || "").slice(0, 100),
    courseTitle: String(row?.courseTitle || "").slice(0, 140),
    teacher: String(row?.teacher || "").slice(0, 100),
    year: Math.max(0, Math.min(2035, Number(row?.year) || detectedYear(String(row?.title || "")))),
    source: String(row?.source || "Telegram").slice(0, 60),
    durationSeconds: Math.max(0, Math.min(86400, Number(row?.durationSeconds) || 0)),
    watchedSeconds: Math.max(0, Math.min(86400, Number(row?.watchedSeconds) || 0)),
  })).filter((row: any) => row.id && row.title);

  if (!lectures.length) return json({ courses: [], analyzedCount: 0, analyzedAt: new Date().toISOString() }, 200, origin);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "AI course analysis is not configured. Add GEMINI_API_KEY to Supabase Edge Function Secrets." }, 503, origin);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const instructions = [
    "You organize supplied Telegram JEE lecture titles into real course or lecture-series groups. Return valid JSON only.",
    "Use only supplied records. Do not browse, invent lesson titles, infer unavailable videos, or inflate counts from numbering gaps.",
    "Group only when course wording, teacher, batch year, subject and chapter indicate the same course. Prefer explicit courseTitle, teacher and year metadata if present; otherwise extract conservatively from titles.",
    "Example: titles that clearly belong to Rajwant Sir's 2025 Chemistry Electrochemistry course should share a course group, but do not force unrelated chemistry videos together.",
    "Recognize One Shot, One-Shot or Oneshot videos as type one-shot. A one-shot should not be presented as a multi-lecture course.",
    "Every supplied record ID must appear in exactly one group. If unsure, return a standalone group rather than combining unrelated titles.",
    "Return shape: {\"courses\":[{\"courseTitle\":\"Rajwant Sir 2025 - Electrochemistry\",\"teacher\":\"teacher if explicit\",\"year\":2025,\"subject\":\"Chemistry\",\"chapter\":\"Electrochemistry\",\"type\":\"series|one-shot|standalone\",\"recordIds\":[\"exact supplied ID\"],\"confidence\":\"high|medium|low\"}]}",
    "Return exact record IDs. Keep labels concise. No additional lesson count field is necessary; the server computes totals from the supplied records."
  ].join("\n");

  let response: Response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({
          lectures: lectures.map((row: any) => ({
            id: row.id, title: row.title, subject: row.subject, chapter: row.chapter,
            courseTitle: row.courseTitle, teacher: row.teacher, year: row.year,
            durationSeconds: row.durationSeconds,
            completed: completedLecture(row),
          })),
        }) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 6500 },
      }),
    });
  } catch {
    return json({ error: "Unable to reach Gemini. Check Supabase Edge Function logs and try again." }, 502, origin);
  }
  const raw = await response.text();
  let provider: any;
  try { provider = JSON.parse(raw); } catch {
    console.error("Gemini Telegram grouping returned unreadable response:", response.status, raw.slice(0, 500));
    return json({ error: "Gemini returned an unreadable response. Try again." }, 502, origin);
  }
  if (!response.ok) {
    console.error("Gemini Telegram grouping failed:", response.status, JSON.stringify(provider).slice(0, 700));
    return json({ error: response.status === 429 ? "Gemini rate limit reached. Wait a little and retry." : "Gemini could not analyse these Telegram titles. Check the configured Gemini key, model and quota." }, 502, origin);
  }
  const parts = provider?.candidates?.[0]?.content?.parts;
  const outputText = Array.isArray(parts) ? parts.filter((part: any) => typeof part?.text === "string").map((part: any) => part.text).join("\n") : "";
  let parsed: any;
  try { parsed = JSON.parse(outputText); } catch {
    console.error("Gemini Telegram grouping JSON invalid:", outputText.slice(0, 500));
    return json({ error: "Gemini returned invalid course groups. Click Analyze courses to retry." }, 502, origin);
  }

  const byId = new Map<string, any>();
  for (const row of lectures) byId.set(row.id, row);
  const assigned = new Set<string>();
  const groups = Array.isArray(parsed.courses) ? parsed.courses : [];
  const courses: any[] = [];
  for (const group of groups) {
    const ids = Array.from(new Set((Array.isArray(group?.recordIds) ? group.recordIds : []).map((id: any) => String(id))))
      .filter((id: string) => byId.has(id) && !assigned.has(id));
    const rows = ids.map((id: string) => byId.get(id)).filter(Boolean);
    if (!rows.length) continue;
    ids.forEach((id: string) => assigned.add(id));
    const joinedTitles = rows.map((row: any) => row.title).join(" ");
    const title = String(group.courseTitle || rows.find((row: any) => row.courseTitle)?.courseTitle || (rows.length > 1 ? (rows[0].chapter || "JEE") + " lecture series" : rows[0].title)).slice(0, 180);
    const explicitType = String(group.type || "").toLowerCase();
    const oneShot = explicitType === "one-shot" || (rows.length === 1 && oneShotTitle(joinedTitles + " " + title));
    const totalLectures = rows.length;
    const watchedLectures = rows.filter((row: any) => completedLecture(row)).length;
    const remainingTimeSeconds = rows.reduce((sum: number, row: any) => sum + Math.max(0, (Number(row.durationSeconds) || 0) - (Number(row.watchedSeconds) || 0)), 0);
    courses.push({
      courseTitle: title,
      teacher: String(group.teacher || rows.find((row: any) => row.teacher)?.teacher || "").slice(0, 100),
      year: Math.max(0, Math.min(2035, Number(group.year) || rows.find((row: any) => row.year)?.year || detectedYear(joinedTitles))),
      subject: String(group.subject || rows.find((row: any) => row.subject)?.subject || "").slice(0, 40),
      chapter: String(group.chapter || rows.find((row: any) => row.chapter)?.chapter || "").slice(0, 100),
      type: oneShot ? "one-shot" : (explicitType === "series" ? "series" : "standalone"),
      confidence: ["high", "medium", "low"].includes(String(group.confidence || "").toLowerCase()) ? String(group.confidence).toLowerCase() : "medium",
      recordIds: ids,
      totalLectures,
      watchedLectures,
      lecturesLeft: Math.max(0, totalLectures - watchedLectures),
      remainingTimeSeconds,
      durationKnown: rows.length > 0 && rows.every((row: any) => Number(row.durationSeconds) > 0),
    });
  }
  // Any unassigned record remains visible as its own entry; the model cannot drop data from the report.
  for (const row of lectures) {
    if (assigned.has(row.id)) continue;
    const duration = Number(row.durationSeconds) || 0;
    courses.push({
      courseTitle: String(row.courseTitle || row.title).slice(0, 180),
      teacher: row.teacher || "",
      year: row.year || detectedYear(row.title) || 0,
      subject: row.subject || "",
      chapter: row.chapter || "",
      type: oneShotTitle(row.title) ? "one-shot" : "standalone",
      confidence: "low",
      recordIds: [row.id],
      totalLectures: 1,
      watchedLectures: completedLecture(row) ? 1 : 0,
      lecturesLeft: completedLecture(row) ? 0 : 1,
      remainingTimeSeconds: Math.max(0, duration - Number(row.watchedSeconds || 0)),
      durationKnown: duration > 0,
    });
  }
  courses.sort((a, b) => String(a.year || "").localeCompare(String(b.year || "")) || String(a.courseTitle).localeCompare(String(b.courseTitle)));
  return json({ courses, analyzedCount: lectures.length, analyzedAt: new Date().toISOString(), note: "Totals count distinct supplied/imported lecture entries only." }, 200, origin);
});
