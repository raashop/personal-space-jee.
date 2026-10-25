// Supabase Edge Function: chapter-allocation
// Secure server-side Gemini integration for Personal Space V6.
// Deploy with: supabase functions deploy chapter-allocation
// Store GEMINI_API_KEY in Supabase Edge Function Secrets. Never commit keys.

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
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function jwtSubject(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const recentCalls = new Map<string, number[]>();
function overLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (recentCalls.get(userId) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 8) {
    recentCalls.set(userId, recent);
    return true;
  }
  recent.push(now);
  recentCalls.set(userId, recent);
  return false;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405, origin);

  // Supabase should keep verify_jwt enabled for this function (the default).
  // The platform validates the JWT before the request reaches this handler.
  const auth = req.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const userId = token ? jwtSubject(token) : null;
  if (!userId) return json({ error: "Sign in to your Personal Space account first." }, 401, origin);

  const originAllowed =
    !origin ||
    /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
    origin === Deno.env.get("APP_ORIGIN");
  if (!originAllowed) return json({ error: "This website origin is not allowed." }, 403, origin);

  if (overLimit(userId)) {
    return json({ error: "AI allocation limit reached for now. Try again in an hour." }, 429, origin);
  }

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 24_000) return json({ error: "Request is too large." }, 413, origin);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, origin);
  }

  const test = body?.test;
  const chapters = body?.chapters;
  const daysRemaining = Number(body?.daysRemaining);
  const dailyStudyHours = Number(body?.dailyStudyHours ?? 6.5);
  if (
    !test || typeof test.name !== "string" || !Array.isArray(chapters) ||
    chapters.length < 1 || chapters.length > 20 ||
    !Number.isFinite(daysRemaining) || daysRemaining < 1 || daysRemaining > 90
  ) {
    return json({ error: "Choose a planned test with 1–20 chapters and a valid test date." }, 400, origin);
  }

  const safeChapters = chapters.map((c: any, i: number) => ({
    id: String(i),
    chapter: String(c?.chapter || "").slice(0, 120),
    subject: String(c?.subject || "").slice(0, 40),
    class: String(c?.class || "").slice(0, 20),
    preparation: String(c?.preparation || "Not Ready").slice(0, 30),
    baselineHours: Math.max(0.5, Math.min(15, Number(c?.baselineHours) || 2)),
  })).filter((c: any) => c.chapter && c.subject);

  if (safeChapters.length !== chapters.length) {
    return json({ error: "Some chapter details are invalid. Refresh and try again." }, 400, origin);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "AI service isn't configured yet. Add GEMINI_API_KEY to Supabase Edge Function Secrets." }, 503, origin);

  // Default to a current, fast model; override via the GEMINI_MODEL secret if needed.
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const hoursPerDay = Math.max(0.5, Math.min(14, Number.isFinite(dailyStudyHours) ? dailyStudyHours : 6.5));
  const safeTest = {
    name: String(test.name).slice(0, 160),
    date: String(test.date || "").slice(0, 20),
    subject: String(test.subject || "").slice(0, 40),
  };
  const planningInput = {
    test: safeTest,
    daysRemaining: Math.floor(daysRemaining),
    dailyStudyHours: hoursPerDay,
    preference: "Balance preparation for this test with continuing the overall JEE syllabus. Do not generate clock-time slots or an hourly timetable.",
    testChapterBudgetHours: Math.round(daysRemaining * hoursPerDay * 0.65 * 2) / 2,
    chapters: safeChapters,
  };

  const instructions = `You are an expert JEE Main chapter workload allocator. Return one valid JSON object only.
Estimate how many total study hours and how many distinct days each listed chapter deserves before the test.
Use chapter size, conceptual difficulty, expected problem-solving practice, preparation status, and time remaining. Use baselineHours as a rough starting point, not a hard limit. Heavy chapters usually need more time than short chapters; a chapter marked Exam Ready needs much less time than Not Ready, unless it's very large.
Use the learner's supplied dailyStudyHours as their real available time. Reserve about 35% of available study capacity for the broader JEE syllabus, ongoing chapters, spaced revision and buffer. Keep the sum of chapter hours at or below testChapterBudgetHours unless a brief warning explains why the test syllabus is unrealistic. Never propose a clock-time timetable. Return a practical day-by-day study schedule in a new optional field dailySchedule: an array with one object per day, each shaped like {day:1, focus:[{chapter:"exact supplied chapter title", subject:"exact supplied subject", hours:1.5, task:"specific study action"}], totalHours:3.5, broaderJeeHours:2.5}. Each day's totalHours must be the chapter-focused work for that day and must be no more than 65% of dailyStudyHours unless a warning explains an overload. Distribute chapters across days to revisit them rather than bunching the whole plan on the last day. The remaining hours are reserved for broader JEE progress and revision.
For each chapter, choose focusDays as the number of separate days on which to revisit/focus on it. This can overlap with the days allocated to other chapters; the values do not add up to daysRemaining. Prioritize high-weight workload, weak chapters, and test urgency. Give concise actionable study focus, not a timetable.
Output exactly this shape:
{"summary":"short recommendation","chapters":[{"id":"0","chapter":"exact supplied chapter title","subject":"exact supplied subject","estimatedHours":3.5,"focusDays":2,"priority":"High","reason":"brief explanation","focus":"what to do: concepts, examples, PYQs or revision"}],"testPrepHours":10,"syllabusHoursPerDay":2.3,"dailySchedule":[{"day":1,"focus":[{"chapter":"exact supplied chapter title","subject":"exact supplied subject","hours":1.5,"task":"Revise core concepts and solve worked examples"}],"totalHours":1.5,"broaderJeeHours":2.5}],"warnings":[]}
Only use supplied chapter ids/titles/subjects. estimatedHours must be 0.5 to 20 in 0.5-hour increments; focusDays integer 1 through daysRemaining; priority High, Medium, or Low. Do not add or remove chapters. Set syllabusHoursPerDay to approximately 30–40% of dailyStudyHours. If impossible, explain in warnings.`;

  let aiResponse: Response;
  try {
    aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(35_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(planningInput) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 1800 },
      }),
    });
  } catch {
    return json({ error: "Unable to reach Gemini. Check the Edge Function logs and try again." }, 502, origin);
  }
  const responseText = await aiResponse.text();
  let providerData: any;
  try { providerData = JSON.parse(responseText); } catch {
    console.error("Gemini returned non-JSON HTTP response:", aiResponse.status, responseText.slice(0, 800));
    return json({ error: "Gemini returned an unreadable response. Try again." }, 502, origin);
  }
  if (!aiResponse.ok) {
    console.error("Gemini request failed:", aiResponse.status, JSON.stringify(providerData).slice(0, 1000));
    return json({ error: aiResponse.status === 400 || aiResponse.status === 401 || aiResponse.status === 403
      ? "Gemini rejected the API key or model. Check GEMINI_API_KEY and GEMINI_MODEL in Supabase Secrets."
      : aiResponse.status === 429
      ? "Gemini free-tier quota or rate limit was reached. Check your AI Studio usage page and try later."
      : "Gemini returned an error. Check model access and quota." }, 502, origin);
  }
  const parts = providerData?.candidates?.[0]?.content?.parts;
  const outputText = Array.isArray(parts)
    ? parts.filter((part: any) => typeof part?.text === "string").map((part: any) => part.text).join("\n")
    : "";
  if (!outputText) {
    const finishReason = providerData?.candidates?.[0]?.finishReason;
    console.error("Gemini returned no text:", finishReason || "unknown finish reason");
    return json({ error: "Gemini did not return an allocation. Try again." }, 502, origin);
  }
  let parsed: any;
  try { parsed = JSON.parse(outputText); } catch {
    console.error("Gemini returned invalid JSON:", outputText.slice(0, 600));
    return json({ error: "Gemini returned an invalid allocation. Try again." }, 502, origin);
  }

  const suppliedById = new Map(safeChapters.map((c: any) => [c.id, c]));
  const rawAllocations = Array.isArray(parsed.chapters) ? parsed.chapters : [];
  const allocations = safeChapters.map((chapter: any) => {
    const suggested = rawAllocations.find((x: any) => String(x?.id) === chapter.id);
    if (!suggested) {
      return {
        id: chapter.id, chapter: chapter.chapter, subject: chapter.subject,
        estimatedHours: chapter.baselineHours, focusDays: Math.min(1, Math.floor(daysRemaining)),
        priority: "Medium", reason: "Use the baseline estimate; AI did not return a specific adjustment.",
        focus: "Review concepts, practice JEE questions and revise mistakes.",
      };
    }
    const hoursRaw = Number(suggested.estimatedHours);
    const hours = Math.max(0.5, Math.min(20, Math.round((Number.isFinite(hoursRaw) ? hoursRaw : chapter.baselineHours) * 2) / 2));
    const daysRaw = Number(suggested.focusDays);
    const focusDays = Math.max(1, Math.min(Math.floor(daysRemaining), Math.round(Number.isFinite(daysRaw) ? daysRaw : 1)));
    const priority = ["High", "Medium", "Low"].includes(suggested.priority) ? suggested.priority : "Medium";
    return {
      id: chapter.id,
      chapter: chapter.chapter,
      subject: chapter.subject,
      estimatedHours: hours,
      focusDays,
      priority,
      reason: String(suggested.reason || "Allocated from chapter size and preparation status.").slice(0, 240),
      focus: String(suggested.focus || "Revise concepts and practice JEE questions.").slice(0, 240),
    };
  });

  const totalHours = Math.round(allocations.reduce((sum: number, x: any) => sum + x.estimatedHours, 0) * 10) / 10;
  const budget = planningInput.testChapterBudgetHours;
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 3).map((x: unknown) => String(x).slice(0, 240)) : [];
  if (totalHours > budget) warnings.unshift(`Estimated chapter work (${totalHours} h) exceeds the recommended test-prep budget (${budget} h). Prioritize High chapters and adjust the plan.`);
  return json({
    summary: String(parsed.summary || "Prioritize the highest-workload chapters, and keep time for the rest of your JEE syllabus.").slice(0, 500),
    chapters: allocations,
    totalHours,
    daysRemaining: Math.floor(daysRemaining),
    testPrepHoursPerDay: Math.round((totalHours / Math.max(1, Math.floor(daysRemaining))) * 10) / 10,
    syllabusHoursPerDay: Math.max(1, Math.min(hoursPerDay * 0.45, Number(parsed.syllabusHoursPerDay) || hoursPerDay * 0.35)),
    warnings,
    model,
  }, 200, origin);
});
