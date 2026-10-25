// Supabase Edge Function: course-progress
// Reads a public/unlisted YouTube playlist and uses Gemini to map video titles to JEE chapters.
// Secrets: YOUTUBE_API_KEY and GEMINI_API_KEY. Keep both server-side.

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

function extractPlaylistId(value: string): string | null {
  const raw = String(value || "").trim();
  if (/^[A-Za-z0-9_-]{10,80}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) return null;
    const list = url.searchParams.get("list");
    return list && /^[A-Za-z0-9_-]{10,80}$/.test(list) ? list : null;
  } catch { return null; }
}

async function fetchYouTubeJson(url: URL): Promise<any> {
  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
  const raw = await response.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error("YouTube returned an unreadable response."); }
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason || "";
    if (response.status === 403) throw new Error("YouTube Data API access or quota was denied. Check that YouTube Data API v3 is enabled for YOUTUBE_API_KEY.");
    if (response.status === 404) throw new Error("That playlist was not found. Check the YouTube playlist URL and make sure it is public or unlisted.");
    throw new Error("YouTube playlist lookup failed (" + response.status + (reason ? ", " + reason : "") + ").");
  }
  return data;
}

async function mapVideoTitles(videos: Array<{videoId:string;title:string}>, chapters: Array<{subject:string;chapter:string;class?:string}>, apiKey: string, model: string) {
  const mapped = new Map<string, {subject:string;chapter:string}>();
  if (!videos.length || !chapters.length) return mapped;
  // Keep each prompt bounded and robust for long playlists.
  for (let offset = 0; offset < videos.length; offset += 45) {
    const batch = videos.slice(offset, offset + 45);
    const instructions = `You classify JEE Main lecture titles against a supplied syllabus. Return JSON only in this exact shape: {"assignments":[{"videoId":"exact-id","subject":"exact subject","chapter":"exact chapter title"}]}.
Use only the exact supplied subject and chapter names. Identify the chapter a lesson teaches from its title, including abbreviations and subtopics. A playlist title or teacher name is not enough evidence by itself. Do not force a match: omit videos whose chapter is unclear, generic, a test/announcement, or not represented in the supplied syllabus. Never invent chapter names. Return at most one assignment per video ID.`;
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify({ chapters, videos: batch }) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 2200 },
        }),
      });
      const raw = await response.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { continue; }
      if (!response.ok) {
        console.error("Gemini chapter mapping failed:", response.status, raw.slice(0, 600));
        throw new Error(response.status === 429
          ? "Gemini rate limit reached while matching playlist titles. Wait a little and retry."
          : "Gemini could not map the playlist titles. Check GEMINI_API_KEY, the model and free-tier quota.");
      }
      const textOutput = (data?.candidates?.[0]?.content?.parts || [])
        .filter((part: any) => typeof part?.text === "string").map((part: any) => part.text).join("\n");
      const parsed = JSON.parse(textOutput);
      const videoIds = new Set(batch.map(v => v.videoId));
      for (const assignment of (Array.isArray(parsed.assignments) ? parsed.assignments : [])) {
        if (!assignment || !videoIds.has(String(assignment.videoId))) continue;
        const chapter = chapters.find(c => c.subject === assignment.subject && c.chapter === assignment.chapter);
        if (chapter) mapped.set(String(assignment.videoId), { subject: chapter.subject, chapter: chapter.chapter });
      }
    } catch (error) {
      console.error("Gemini mapping batch failed:", String(error).slice(0, 500));
      throw error instanceof Error ? error : new Error("Gemini chapter mapping failed. Check the API key and quota.");
    }
  }
  return mapped;
}


function parseYouTubeIsoDuration(value: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(value || ""));
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
}
async function addVideoDurations(videos: Array<{videoId:string;title:string;position:number}>, apiKey: string) {
  const seconds = new Map<string, number>();
  try {
    for (let offset = 0; offset < videos.length; offset += 50) {
      const batch = videos.slice(offset, offset + 50);
      if (!batch.length) continue;
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", batch.map(video => video.videoId).join(","));
      url.searchParams.set("key", apiKey);
      const payload = await fetchYouTubeJson(url);
      for (const item of (Array.isArray(payload.items) ? payload.items : [])) {
        const id = String(item?.id || "");
        if (!id) continue;
        seconds.set(id, parseYouTubeIsoDuration(String(item?.contentDetails?.duration || "")));
      }
    }
  } catch (error) {
    // Duration is helpful for "time left" but should not prevent tracking the playlist.
    console.error("YouTube duration lookup unavailable:", String(error).slice(0, 400));
  }
  return videos.map(video => ({ ...video, durationSeconds: seconds.get(video.videoId) || 0 }));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405, origin);
  const allowedOrigin = !origin || /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) || origin === Deno.env.get("APP_ORIGIN");
  if (!allowedOrigin) return json({ error: "This website origin is not allowed." }, 403, origin);
  const token = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!jwtSubject(token)) return json({ error: "Sign in to your Personal Space account first." }, 401, origin);

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 40_000) return json({ error: "Request is too large." }, 413, origin);
    body = JSON.parse(raw);
  } catch { return json({ error: "Request body must be valid JSON." }, 400, origin); }

  const playlistId = extractPlaylistId(body?.playlistUrl);
  if (!playlistId) return json({ error: "Paste a YouTube playlist URL that contains a list= ID." }, 400, origin);
  const youtubeKey = Deno.env.get("YOUTUBE_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!youtubeKey) return json({ error: "Automatic total-lecture lookup isn't configured yet. Add YOUTUBE_API_KEY to GitHub Actions secrets, then rerun the deployment workflow." }, 503, origin);

  const chapterList = Array.isArray(body?.chapters) ? body.chapters : [];
  const chapters = chapterList.slice(0, 100).map((c: any) => ({
    subject: String(c?.subject || "").slice(0, 40),
    chapter: String(c?.chapter || "").slice(0, 120),
    class: String(c?.class || "").slice(0, 20),
  })).filter((c: any) => c.subject && c.chapter);
  if (!chapters.length) return json({ error: "No syllabus chapters were supplied. Reload the chapter planner and try again." }, 400, origin);

  try {
    const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
    playlistUrl.searchParams.set("part", "snippet,contentDetails");
    playlistUrl.searchParams.set("id", playlistId);
    playlistUrl.searchParams.set("key", youtubeKey);
    const playlistData = await fetchYouTubeJson(playlistUrl);
    const playlist = playlistData?.items?.[0];
    if (!playlist) return json({ error: "Playlist not found or it is private. Use a public or unlisted playlist link." }, 404, origin);
    const totalLectures = Math.max(0, Number(playlist.contentDetails?.itemCount) || 0);
    if (!totalLectures) return json({ error: "This playlist has no visible videos." }, 422, origin);

    const videos: Array<{videoId:string;title:string;position:number}> = [];
    let pageToken = "";
    const fetchLimit = Math.min(totalLectures, 2000);
    while (videos.length < fetchLimit) {
      const itemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      itemsUrl.searchParams.set("part", "snippet,contentDetails");
      itemsUrl.searchParams.set("playlistId", playlistId);
      itemsUrl.searchParams.set("maxResults", "50");
      itemsUrl.searchParams.set("key", youtubeKey);
      if (pageToken) itemsUrl.searchParams.set("pageToken", pageToken);
      const page = await fetchYouTubeJson(itemsUrl);
      for (const item of (Array.isArray(page.items) ? page.items : [])) {
        const videoId = String(item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId || "");
        if (!videoId) continue;
        videos.push({
          videoId,
          title: String(item?.snippet?.title || "Untitled lecture").slice(0, 240),
          position: Number(item?.snippet?.position) || 0,
        });
      }
      pageToken = String(page.nextPageToken || "");
      if (!pageToken || !(page.items || []).length) break;
    }

    const videosWithDurations = await addVideoDurations(videos, youtubeKey);
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";
    const map = geminiKey ? await mapVideoTitles(videosWithDurations, chapters, geminiKey, model) : new Map();
    const mappedVideos = videosWithDurations.map(video => ({
      ...video,
      subject: map.get(video.videoId)?.subject || "",
      chapter: map.get(video.videoId)?.chapter || "",
    }));
    const mappedCount = mappedVideos.filter(video => video.subject && video.chapter).length;
    return json({
      course: {
        playlistId,
        title: String(playlist.snippet?.title || "YouTube course").slice(0, 240),
        channelTitle: String(playlist.snippet?.channelTitle || "").slice(0, 160),
        url: "https://www.youtube.com/playlist?list=" + encodeURIComponent(playlistId),
        totalLectures,
        videos: mappedVideos,
        mappedCount,
        fetchedVideoCount: videos.length,
        truncated: videosWithDurations.length < totalLectures,
        durationMetadataCount: videosWithDurations.filter(video => Number(video.durationSeconds) > 0).length,
        updatedAt: new Date().toISOString(),
      },
      notice: videos.length < totalLectures
        ? "YouTube reports " + totalLectures + " lectures, but only " + videos.length + " visible playlist videos were retrieved."
        : (mappedCount < videos.length
          ? "YouTube total count is exact. " + mappedCount + " lecture titles were confidently matched to syllabus chapters; the rest still count toward course progress."
          : "YouTube total count and AI chapter mapping are ready."),
    }, 200, origin);
  } catch (error) {
    console.error("course-progress error:", String(error).slice(0, 1000));
    return json({ error: error instanceof Error ? error.message : "Unable to read the YouTube playlist." }, 502, origin);
  }
});
