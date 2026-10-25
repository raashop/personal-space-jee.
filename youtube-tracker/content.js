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

  function waitForVideo() {
    const id = videoId();
    const video = document.querySelector("video");
    if (!video || !id) {
      reportStatus("waiting", "Tracker is ready. Open a YouTube video page to begin tracking.", videoTitle());
      setTimeout(waitForVideo, 1800);
      return;
    }

    let activeVideo = video;
    let activeId = id;
    let lastUrl = location.href;
    let lastTime = activeVideo.currentTime || 0;
    let busy = false;
    reportStatus("checking", "YouTube player found. Checking the title against JEE chapter names…", videoTitle(), null, activeId);

    // One lightweight polling loop per tab. Never change the page, player styles,
    // playback state, or reload YouTube. Rebind the reference on SPA navigation.
    const trackerTimer = setInterval(async () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        activeId = videoId();
        activeVideo = document.querySelector("video");
        lastTime = activeVideo?.currentTime || 0;
        if (!activeId || !activeVideo) {
          reportStatus("waiting", "Waiting for YouTube's next video player…", videoTitle(), null, activeId || "");
          return;
        }
        reportStatus("checking", "YouTube player found. Checking the title against JEE chapter names…", videoTitle(), null, activeId);
      }
      if (busy || !activeVideo || !activeId || !activeVideo.isConnected) return;
      busy = true;
      try {
        const title = videoTitle();
        const channel = channelName();
        const match = classify(title, channel);
        const now = activeVideo.currentTime || 0;
        const delta = Math.max(0, Math.min(6, now - lastTime));
        lastTime = now;

        if (!match) {
          reportStatus("unmatched", "Player found, but the title/channel did not match a known JEE chapter phrase. This tracker uses titles, not transcripts.", title, null, activeId);
          return;
        }
        if (activeVideo.paused || activeVideo.ended) {
          reportStatus("matched-paused", "Recognized " + match.subject + " · " + match.chapter + ". Press Play to record watch time.", title, match, activeId);
          return;
        }
        if (delta <= 0) {
          reportStatus("matched-waiting", "Recognized " + match.subject + " · " + match.chapter + ". Waiting for playback time to advance…", title, match, activeId);
          return;
        }

        const stored = await chrome.storage.local.get(STORE);
        const rows = Array.isArray(stored[STORE]) ? stored[STORE] : [];
        const existing = rows.find(row => row.videoId === activeId);
        const record = existing || {
          videoId: activeId,
          url: "https://www.youtube.com/watch?v=" + activeId,
          title,
          channel,
          subject: match.subject,
          chapter: match.chapter,
          watchedSeconds: 0,
          durationSeconds: Math.round(activeVideo.duration || 0),
          firstWatchedAt: new Date().toISOString(),
          lastWatchedAt: new Date().toISOString(),
          classification: "title-match"
        };
        record.title = title;
        record.channel = channel;
        record.subject = match.subject;
        record.chapter = match.chapter;
        record.durationSeconds = Math.round(activeVideo.duration || record.durationSeconds || 0);
        record.watchedSeconds = Math.min(record.durationSeconds || Infinity, (record.watchedSeconds || 0) + delta);
        record.lastWatchedAt = new Date().toISOString();
        const updated = [record, ...rows.filter(row => row.videoId !== activeId)].slice(0, 500);
        await chrome.storage.local.set({ [STORE]: updated });
        reportStatus("tracking", "Tracking watch time for " + match.subject + " · " + match.chapter + ".", title, match, activeId);
      } catch (error) {
        reportStatus("error", "Tracker error: " + String(error?.message || error), videoTitle(), null, activeId);
      } finally {
        busy = false;
      }
    }, 5000);
    window.addEventListener("pagehide", () => clearInterval(trackerTimer), { once: true });
  }

  reportStatus("loaded", "Tracker script loaded on a YouTube page. Looking for the video player…", videoTitle());
  waitForVideo();
})();