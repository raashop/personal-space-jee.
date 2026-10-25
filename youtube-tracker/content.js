(() => {
  "use strict";
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
    ["Physics","Work, Energy and Power",["work energy power","work-energy theorem","conservation of energy"]],
    ["Physics","Rotational Motion",["rotational motion","moment of inertia","angular momentum","torque"]],
    ["Physics","Gravitation",["gravitation","kepler's laws","escape velocity","satellite motion"]],
    ["Physics","Properties of Solids and Liquids",["mechanical properties of solids","mechanical properties of fluids","surface tension","viscosity","thermal properties of matter"]],
    ["Physics","Thermodynamics",["thermodynamics","first law of thermodynamics","heat engine"]],
    ["Physics","Kinetic Theory of Gases",["kinetic theory of gases","kinetic theory","degrees of freedom gas"]],
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
    ["Chemistry","Some Basic Concepts in Chemistry",["mole concept","some basic concepts in chemistry","stoichiometry"]],
    ["Chemistry","Atomic Structure",["structure of atom","atomic structure","quantum numbers","bohr model chemistry"]],
    ["Chemistry","Chemical Bonding and Molecular Structure",["chemical bonding","molecular structure","vsepr","hybridisation","molecular orbital theory"]],
    ["Chemistry","Chemical Thermodynamics",["chemical thermodynamics","enthalpy","gibbs free energy"]],
    ["Chemistry","Solutions",["solutions chemistry","solutions and colligative properties","colligative properties","raoult's law","osmotic pressure","elevation in boiling point","depression in freezing point","van't hoff factor"]],
    ["Chemistry","Equilibrium",["chemical equilibrium","ionic equilibrium","buffer solution","solubility product"]],
    ["Chemistry","Redox Reactions and Electrochemistry",["redox reactions","electrochemistry","nernst equation","electrochemical cell"]],
    ["Chemistry","Chemical Kinetics",["chemical kinetics","rate law","order of reaction","half life","pseudo first order"]],
    ["Chemistry","Classification of Elements and Periodicity in Properties",["periodic table","periodicity in properties"]],
    ["Chemistry","p-Block Elements",["p block elements","p-block elements"]],
    ["Chemistry","d- and f-Block Elements",["d and f block","d-block elements","f-block elements"]],
    ["Chemistry","Coordination Compounds",["coordination compounds","crystal field theory","isomerism in coordination"]],
    ["Chemistry","Some Basic Principles of Organic Chemistry",["goc","general organic chemistry","basic principles of organic chemistry","inductive effect","resonance effect","isomerism organic","isomerism in organic chemistry"]],
    ["Chemistry","Hydrocarbons",["hydrocarbons","alkanes","alkenes","alkynes","aromatic hydrocarbons"]],
    ["Chemistry","Organic Compounds Containing Halogens",["haloalkanes","haloarenes","organic compounds containing halogens"]],
    ["Chemistry","Organic Compounds Containing Oxygen",["alcohols phenols ethers","alcohols phenols and ethers","alcohol phenol ether","phenols and ethers","aldehydes ketones carboxylic acids","aldehyde ketone carboxylic acid","carbonyl compounds","organic compounds containing oxygen"]],
    ["Chemistry","Organic Compounds Containing Nitrogen",["amines chemistry","diazonium salts","organic compounds containing nitrogen"]],
    ["Chemistry","Biomolecules",["biomolecules","carbohydrates","proteins","tollens reagent","fehling solution"]],
    ["Mathematics","Sets, Relations and Functions",["sets relations and functions","relations and functions"]],
    ["Mathematics","Complex Numbers and Quadratic Equations",["complex numbers","quadratic equations","argand plane"]],
    ["Mathematics","Matrices and Determinants",["matrices and determinants","matrices","determinants","inverse of a matrix"]],
    ["Mathematics","Permutations and Combinations",["permutations and combinations","p and c"]],
    ["Mathematics","Binomial Theorem and Its Simple Applications",["binomial theorem","general term binomial"]],
    ["Mathematics","Sequence and Series",["sequences and series","sequence and series","arithmetic progression","geometric progression","ap and gp"]],
    ["Mathematics","Limit, Continuity and Differentiability",["limits continuity differentiability","limits and derivatives","continuity and differentiability"]],
    ["Mathematics","Integral Calculus",["indefinite integration","definite integration","integral calculus","area under curves"]],
    ["Mathematics","Differential Equations",["differential equations"]],
    ["Mathematics","Coordinate Geometry",["straight lines","circle maths","conic sections","parabola ellipse hyperbola"]],
    ["Mathematics","Three-Dimensional Geometry",["three dimensional geometry","three-dimensional geometry","3d geometry","direction cosines"]],
    ["Mathematics","Vector Algebra",["vector algebra","dot product","cross product"]],
    ["Mathematics","Statistics and Probability",["statistics and probability","probability","mean variance","standard deviation"]],
    ["Mathematics","Trigonometry",["trigonometric functions","trigonometry","inverse trigonometric functions"]]
  ].filter(item => Array.isArray(item) && Array.isArray(item[2]));
  CHAPTERS.sort((a, b) => Math.max(...b[2].map(term => term.length)) - Math.max(...a[2].map(term => term.length)));

  const JEE_HINTS = ["jee","mains","main 2027","advanced","ncert","one shot","one-shot","lecture","class 11","class 12","chapter","pyq","revision","unacademy","physics wallah","pw","competishun","vedantu","mathongo","allen","akash"];
  const EXCLUDE = ["official music video","lyric video","full episode","anime episode","movie trailer","gameplay","reaction video","reaction channel","vlog","meme compilation"];
  const videoId = () => {
    try { return new URL(location.href).searchParams.get("v"); } catch { return null; }
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
        if (needle.length >= 4 && sourceText.includes(needle)) {
          matches.push({ item, score: needle.length });
        }
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
    const video = document.querySelector("video");
    const id = videoId();
    if (!video || !id) {
      reportStatus("waiting", "Tracker script loaded, but it cannot see a YouTube watch player yet. Open a video URL and refresh that tab.", videoTitle());
      setTimeout(waitForVideo, 1200);
      return;
    }

    const titleAtStart = videoTitle();
    reportStatus("checking", "YouTube player found. Checking the title against JEE chapter names…", titleAtStart, null, id);
    let lastTime = video.currentTime || 0;
    let lastUrl = location.href;
    let busy = false;

    setInterval(async () => {
      if (location.href !== lastUrl) {
        reportStatus("navigating", "YouTube changed videos. Reloading the tracker for the new video.", videoTitle(), null, videoId() || "");
        location.reload();
        return;
      }
      if (busy) return;
      busy = true;
      try {
        const title = videoTitle();
        const channel = channelName();
        const match = classify(title, channel);
        const now = video.currentTime || 0;
        const delta = Math.max(0, Math.min(8, now - lastTime));
        lastTime = now;

        if (!match) {
          reportStatus("unmatched", "Player found, but the title/channel did not match a known JEE chapter phrase. This tracker uses titles, not transcripts.", title, null, id);
          return;
        }
        if (video.paused || video.ended) {
          reportStatus("matched-paused", "Recognized " + match.subject + " · " + match.chapter + ". Press Play to record watch time.", title, match, id);
          return;
        }
        if (delta <= 0) {
          reportStatus("matched-waiting", "Recognized " + match.subject + " · " + match.chapter + ". Waiting for playback time to advance…", title, match, id);
          return;
        }

        const stored = await chrome.storage.local.get(STORE);
        const rows = Array.isArray(stored[STORE]) ? stored[STORE] : [];
        const existing = rows.find(row => row.videoId === id);
        const record = existing || {
          videoId: id,
          url: "https://www.youtube.com/watch?v=" + id,
          title,
          channel,
          subject: match.subject,
          chapter: match.chapter,
          watchedSeconds: 0,
          durationSeconds: Math.round(video.duration || 0),
          firstWatchedAt: new Date().toISOString(),
          lastWatchedAt: new Date().toISOString(),
          classification: "title-match"
        };
        record.title = title;
        record.channel = channel;
        record.subject = match.subject;
        record.chapter = match.chapter;
        record.durationSeconds = Math.round(video.duration || record.durationSeconds || 0);
        record.watchedSeconds = Math.min(record.durationSeconds || Infinity, (record.watchedSeconds || 0) + delta);
        record.lastWatchedAt = new Date().toISOString();
        const updated = [record, ...rows.filter(row => row.videoId !== id)].slice(0, 500);
        await chrome.storage.local.set({ [STORE]: updated });
        reportStatus("tracking", "Tracking watch time for " + match.subject + " · " + match.chapter + ".", title, match, id);
      } catch (error) {
        reportStatus("error", "Tracker error: " + String(error?.message || error), videoTitle(), null, id);
      } finally {
        busy = false;
      }
    }, 5000);
  }

  reportStatus("loaded", "Tracker script loaded on a YouTube watch page. Looking for the video player…", videoTitle());
  waitForVideo();
})();