(() => {
  "use strict";
  if (window.__psJeeYouTubeTrackerInstalled) return;
  window.__psJeeYouTubeTrackerInstalled = true;
  const STORE = "psJeeLectureRecordsV1";
  const STATUS_KEY = "psJeeLectureTrackerStatusV1";
  let lastStatusSignature = "";
  let lastStatusWriteAt = 0;

  const normalizeText = value => String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  function reportStatus(type, message, title = "", match = null, id = "") {
    const signature = JSON.stringify([type, message, title, match?.subject || "", match?.chapter || "", id]);
    const now = Date.now();
    if (signature === lastStatusSignature && now - lastStatusWriteAt < 15000) return;
    lastStatusSignature = signature;
    lastStatusWriteAt = now;
    const status = {
      type,
      message,
      title: String(title || "").slice(0, 240),
      subject: match?.subject || "",
      chapter: match?.chapter || "",
      videoId: id || "",
      url: location.href,
      updatedAt: new Date().toISOString()
    };
    chrome.storage.local.set({ [STATUS_KEY]: status }).catch(() => {});
  }

  const CHAPTERS = [
    ["Physics","Units and Measurements",["units and measurements","dimensional analysis","measurement errors"]],
    ["Physics","Kinematics",["kinematics","motion in a straight line","motion in a plane","projectile motion","relative velocity"]],
    ["Physics","Laws of Motion",["laws of motion","newton's laws","friction","free body diagram"]],
    ["Physics","Work, Energy and Power",["work energy power","work power energy","wpe","work-energy theorem","conservation of energy"]],
    ["Physics","Rotational Motion",["rotational motion","rotational dynamics","centre of mass","center of mass","moment of inertia","angular momentum","torque"]],
    ["Physics","Gravitation",["gravitation","kepler's laws","escape velocity","satellite motion"]],
    ["Physics","Properties of Solids and Liquids",["mechanical properties of solids","mechanical properties of fluids","surface tension","viscosity","thermal properties of matter"]],
    ["Physics","Thermodynamics",["thermodynamics","first law of thermodynamics","heat engine"]],
    ["Physics","Kinetic Theory of Gases",["kinetic theory of gases","kinetic theory","ktg","degrees of freedom gas"]],
    ["Physics","Experimental Skills",["experimental skills physics","vernier calipers","screw gauge","meter bridge"]],
    ["Physics","Oscillations and Waves",["oscillations","simple harmonic motion","waves and sound","standing waves"]],
    ["Physics","Electrostatics",["electrostatics","electric charges and fields","electric potential","capacitance"]],
    ["Physics","Current Electricity",["current electricity","kirchhoff","wheatstone bridge","drift velocity"]],
    ["Physics","Magnetic Effects of Current and Magnetism",["moving charges and magnetism","magnetic effects of current","magnetism and matter","biot savart","ampere's law","lorentz force"]],
    ["Physics","Electromagnetic Induction and Alternating Currents",["electromagnetic induction","alternating current","alternating currents","faraday's law","lenz's law","emi and ac","emi ac"]],
    ["Physics","Electromagnetic Waves",["electromagnetic waves"]],
    ["Physics","Optics",["ray optics","wave optics","optical instruments","young's double slit"]],
    ["Physics","Dual Nature of Matter and Radiation",["dual nature","photoelectric effect","de broglie"]],
    ["Physics","Atoms and Nuclei",["atoms and nuclei","radioactivity","bohr model","nuclear binding energy"]],
    ["Physics","Electronic Devices",["semiconductor","electronic devices","logic gates","diode"]],
    ["Chemistry","Some Basic Concepts in Chemistry",["mole concept","some basic concepts in chemistry","some basic concepts of chemistry","stoichiometry"]],
    ["Chemistry","Atomic Structure",["structure of atom","atomic structure","quantum numbers","bohr model chemistry"]],
    ["Chemistry","Chemical Bonding and Molecular Structure",["chemical bonding","molecular structure","vsepr","hybridisation","molecular orbital theory"]],
    ["Chemistry","Chemical Thermodynamics",["chemical thermodynamics","enthalpy","gibbs free energy"]],
    ["Chemistry","Solutions",["solutions chemistry","solutions and colligative properties","colligative properties","raoult's law","osmotic pressure","elevation in boiling point","depression in freezing point","van't hoff factor"]],
    ["Chemistry","Equilibrium",["chemical equilibrium","ionic equilibrium","buffer solution","solubility product"]],
    ["Chemistry","Redox Reactions and Electrochemistry",["redox reactions","electrochemistry","nernst equation","electrochemical cell"]],
    ["Chemistry","Chemical Kinetics",["chemical kinetics","kinetics","rate law","order of reaction","rate of reaction","half life","pseudo first order"]],
    ["Chemistry","Classification of Elements and Periodicity in Properties",["periodic table","periodicity in properties"]],
    ["Chemistry","p-Block Elements",["p block elements","p-block elements"]],
    ["Chemistry","d- and f-Block Elements",["d and f block","d-block elements","f-block elements"]],
    ["Chemistry","Coordination Compounds",["coordination compounds","crystal field theory","isomerism in coordination"]],
    ["Chemistry","Some Basic Principles of Organic Chemistry",["goc","general organic chemistry","basic principles of organic chemistry","inductive effect","resonance effect","isomerism organic","isomerism in organic chemistry"]],
    ["Chemistry","Hydrocarbons",["hydrocarbons","alkanes","alkenes","alkynes","aromatic hydrocarbons"]],
    ["Chemistry","Organic Compounds Containing Halogens",["haloalkanes","haloarenes","organic compounds containing halogens"]],
    ["Chemistry","Organic Compounds Containing Oxygen",["alcohols phenols ethers","alcohols phenols and ethers","alcohol phenol ether","phenols and ethers","aldehydes ketones carboxylic acids","aldehyde ketone carboxylic acid","carbonyl compounds","organic compounds containing oxygen"]],
    ["Chemistry","Organic Compounds Containing Nitrogen",["amines chemistry","amines","diazonium salts","organic compounds containing nitrogen"]],
    ["Chemistry","Biomolecules",["biomolecules","carbohydrates","proteins","tollens reagent","fehling solution"]],
    ["Mathematics","Sets, Relations and Functions",["sets relations and functions","relations and functions"]],
    ["Mathematics","Complex Numbers and Quadratic Equations",["complex numbers","quadratic equations","argand plane"]],
    ["Mathematics","Matrices and Determinants",["matrices and determinants","matrices","determinants","inverse of a matrix"]],
    ["Mathematics","Permutations and Combinations",["permutations and combinations","p and c","p c"]],
    ["Mathematics","Binomial Theorem and Its Simple Applications",["binomial theorem","general term binomial"]],
    ["Mathematics","Sequence and Series",["sequences and series","sequence and series","arithmetic progression","geometric progression","ap and gp"]],
    ["Mathematics","Limit, Continuity and Differentiability",["limits continuity differentiability","limits and derivatives","continuity and differentiability","differentiation","application of derivatives","aod"]],
    ["Mathematics","Integral Calculus",["indefinite integration","definite integration","integral calculus","integration","area under curves"]],
    ["Mathematics","Differential Equations",["differential equations","diff eq"]],
    ["Mathematics","Coordinate Geometry",["straight lines","circle maths","conic sections","parabola ellipse hyperbola"]],
    ["Mathematics","Three-Dimensional Geometry",["three dimensional geometry","three-dimensional geometry","3d geometry","direction cosines"]],
    ["Mathematics","Vector Algebra",["vector algebra","dot product","cross product"]],
    ["Mathematics","Statistics and Probability",["statistics and probability","statistics","probability","mean variance","standard deviation"]],
    ["Mathematics","Trigonometry",["trigonometric functions","trigonometry","inverse trigonometric functions"]]
  ].filter(item => Array.isArray(item) && Array.isArray(item[2]));
  CHAPTERS.sort((a, b) => Math.max(...b[2].map(term => term.length)) - Math.max(...a[2].map(term => term.length)));

  const EXCLUDE = ["official music video","lyric video","full episode","anime episode","movie trailer","gameplay","reaction video","reaction channel","vlog","meme compilation"];
  const videoId = () => {
    try {
      const url = new URL(location.href);
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery;
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "live", "embed", "v"].includes(parts[0]) && parts[1]) return parts[1];
      return null;
    } catch { return null; }
  };
  const videoTitle = () => (
    document.querySelector("h1.ytd-watch-metadata yt-formatted-string")?.textContent ||
    document.querySelector("#title h1 yt-formatted-string")?.textContent ||
    document.querySelector("h1")?.textContent ||
    window.ytInitialPlayerResponse?.videoDetails?.title ||
    document.title.replace(/\s*-\s*YouTube$/, "")
  ).trim();
  const channelName = () => (
    document.querySelector("#channel-name a, ytd-channel-name a, #owner #channel-name a")?.textContent || ""
  ).trim();

  function bestChapterMatch(sourceText) {
    if (!sourceText) return null;
    const matches = [];
    for (const item of CHAPTERS) {
      for (const term of [...new Set([item[1], ...item[2]])]) {
        const needle = normalizeText(term);
        const shortAlias = ["goc","ktg","wpe","aod","emi","p c"].includes(needle);
        const present = needle.length >= 4
          ? sourceText.includes(needle)
          : shortAlias && (" " + sourceText + " ").includes(" " + needle + " ");
        if (present) matches.push({ item, score: needle.length });
      }
    }
    if (!matches.length) return null;
    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];
    const ambiguous = matches.some(candidate =>
      candidate.score === best.score &&
      (candidate.item[0] !== best.item[0] || candidate.item[1] !== best.item[1])
    );
    return ambiguous ? null : best.item;
  }

  function classify(title, channel) {
    const titleText = normalizeText(title);
    const channelText = normalizeText(channel);
    if (EXCLUDE.some(word => titleText.includes(normalizeText(word)))) return null;
    // Prefer chapter phrases in the title, and select the longest match.
    const chapter = bestChapterMatch(titleText) || bestChapterMatch(channelText);
    return chapter ? { subject: chapter[0], chapter: chapter[1] } : null;
  }

  let activeSession = null;
  let playerObserver = null;
  let routeTimer = null;

  function flushSession(session) {
    if (!session || !session.match || session.pendingSeconds < 0.25 || session.saving) return;
    session.saving = true;
    const secondsToSave = session.pendingSeconds;
    session.pendingSeconds = 0;
    (async () => {
      try {
        const stored = await chrome.storage.local.get(STORE);
        const rows = Array.isArray(stored[STORE]) ? stored[STORE] : [];
        const existing = rows.find(row => row.videoId === session.id);
        const duration = Math.round(session.video.duration || existing?.durationSeconds || 0);
        const record = {
          ...(existing || {}),
          videoId: session.id,
          url: "https://www.youtube.com/watch?v=" + session.id,
          title: session.title,
          channel: session.channel,
          subject: session.match.subject,
          chapter: session.match.chapter,
          watchedSeconds: Math.min(duration || Infinity, (Number(existing?.watchedSeconds) || 0) + secondsToSave),
          durationSeconds: duration,
          firstWatchedAt: existing?.firstWatchedAt || new Date().toISOString(),
          lastWatchedAt: new Date().toISOString(),
          classification: "title-match"
        };
        const updated = [record, ...rows.filter(row => row.videoId !== session.id)].slice(0, 500);
        await chrome.storage.local.set({ [STORE]: updated });
        reportStatus("tracking", "Tracking watch time for " + session.match.subject + " · " + session.match.chapter + ".", session.title, session.match, session.id);
      } catch (error) {
        reportStatus("error", "Tracker error: " + String(error?.message || error), session.title, null, session.id);
      } finally {
        session.saving = false;
        // If playback advanced while storage was being written, immediately
        // drain the remainder so a pause/navigation cannot lose the last seconds.
        if (session.pendingSeconds >= 0.25) flushSession(session);
      }
    })();
  }

  function detachActiveSession() {
    const session = activeSession;
    if (!session) return;
    flushSession(session);
    session.video.removeEventListener("timeupdate", session.onTimeUpdate);
    session.video.removeEventListener("seeking", session.onSeeking);
    session.video.removeEventListener("play", session.onPlay);
    session.video.removeEventListener("pause", session.onPause);
    session.video.removeEventListener("ended", session.onPause);
    activeSession = null;
  }

  function watchForPlayer() {
    if (playerObserver) playerObserver.disconnect();
    if (!videoId() || document.querySelector("video")) {
      bindCurrentVideo();
      return;
    }
    playerObserver = new MutationObserver(() => {
      if (videoId() && document.querySelector("video")) {
        playerObserver?.disconnect();
        playerObserver = null;
        bindCurrentVideo();
      }
    });
    if (document.documentElement) {
      playerObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function bindCurrentVideo() {
    const id = videoId();
    const video = document.querySelector("video");

    if (!id) {
      if (activeSession) detachActiveSession();
      if (playerObserver) {
        playerObserver.disconnect();
        playerObserver = null;
      }
      reportStatus("waiting", "Tracker is ready. Open a YouTube video to begin tracking.", videoTitle());
      return;
    }

    if (!video) {
      if (activeSession) detachActiveSession();
      reportStatus("waiting", "Waiting for YouTube's video player…", videoTitle(), null, id);
      watchForPlayer();
      return;
    }

    if (activeSession?.id === id && activeSession.video === video) return;

    detachActiveSession();
    if (playerObserver) {
      playerObserver.disconnect();
      playerObserver = null;
    }

    const title = videoTitle();
    const channel = channelName();
    const match = classify(title, channel);
    const session = {
      id, video, title, channel, match,
      lastTime: video.currentTime || 0,
      pendingSeconds: 0,
      saving: false,
      seeking: false,
      onTimeUpdate: null,
      onSeeking: null,
      onPlay: null,
      onPause: null
    };
    activeSession = session;

    if (!match) {
      reportStatus("unmatched", "Video detected, but its title/channel did not match a known JEE chapter. Nothing is recorded for this video.", title, null, id);
      return;
    }

    reportStatus(
      video.paused ? "matched-paused" : "matched-waiting",
      "Recognized " + match.subject + " · " + match.chapter + (video.paused ? ". Press Play to record watch time." : ". Watching playback time."),
      title, match, id
    );

    session.onSeeking = () => {
      session.seeking = true;
      session.lastTime = video.currentTime || 0;
    };
    session.onTimeUpdate = () => {
      const now = video.currentTime || 0;
      const delta = now - session.lastTime;
      session.lastTime = now;
      if (session.seeking) {
        session.seeking = false;
        return;
      }
      // Count advancing playback only. Ignore seeks, jumps and backward scrubbing.
      if (!video.paused && !video.ended && delta > 0 && delta <= 3.5) {
        session.pendingSeconds += delta;
        if (session.pendingSeconds >= 5) flushSession(session);
      }
    };
    session.onPlay = () => {
      session.lastTime = video.currentTime || 0;
      reportStatus("matched-waiting", "Recognized " + match.subject + " · " + match.chapter + ". Recording while the video plays.", title, match, id);
    };
    session.onPause = () => {
      session.lastTime = video.currentTime || 0;
      flushSession(session);
      reportStatus("matched-paused", "Recognized " + match.subject + " · " + match.chapter + ". Playback paused.", title, match, id);
    };

    video.addEventListener("timeupdate", session.onTimeUpdate, { passive: true });
    video.addEventListener("seeking", session.onSeeking, { passive: true });
    video.addEventListener("play", session.onPlay, { passive: true });
    video.addEventListener("pause", session.onPause, { passive: true });
    video.addEventListener("ended", session.onPause, { passive: true });
  }

  function scheduleRebind() {
    if (routeTimer) clearTimeout(routeTimer);
    routeTimer = setTimeout(() => {
      routeTimer = null;
      bindCurrentVideo();
    }, 350);
  }

  // YouTube's SPA navigation events let us switch videos without reloading
  // the page or continuously polling/mutating the player.
  document.addEventListener("yt-navigate-finish", scheduleRebind);
  document.addEventListener("yt-page-data-updated", scheduleRebind);
  window.addEventListener("popstate", scheduleRebind);
  window.addEventListener("pageshow", scheduleRebind);

  reportStatus("loaded", "Lecture Tracker ready. Waiting for a YouTube video.", videoTitle());
  bindCurrentVideo();
})();
