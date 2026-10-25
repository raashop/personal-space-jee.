(() => {
  "use strict";
  if (window.__psJeeTelegramTrackerInstalled) return;
  window.__psJeeTelegramTrackerInstalled = true;

  const STORE = "psJeeTelegramLectureRecordsV1";
  const STATUS = "psJeeTelegramTrackerStatusV1";
  const normalize = value => String(value || "").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  const CHAPTERS = [
    ["Physics","Units and Measurements",["units and measurements","dimensional analysis","measurement errors"]],
    ["Physics","Kinematics",["kinematics","motion in a straight line","projectile motion","relative velocity"]],
    ["Physics","Laws of Motion",["laws of motion","newton's laws","friction","free body diagram"]],
    ["Physics","Work, Energy and Power",["work energy power","work power energy","work-energy theorem","wpe"]],
    ["Physics","Rotational Motion",["rotational motion","moment of inertia","angular momentum","torque","centre of mass","center of mass"]],
    ["Physics","Gravitation",["gravitation","escape velocity","satellite motion"]],
    ["Physics","Thermodynamics",["thermodynamics","first law of thermodynamics","heat engine"]],
    ["Physics","Kinetic Theory of Gases",["kinetic theory of gases","kinetic theory","ktg"]],
    ["Physics","Oscillations and Waves",["oscillations","simple harmonic motion","waves and sound"]],
    ["Physics","Electrostatics",["electrostatics","electric charges and fields","electric potential","capacitance"]],
    ["Physics","Current Electricity",["current electricity","kirchhoff","wheatstone bridge"]],
    ["Physics","Magnetic Effects of Current and Magnetism",["moving charges and magnetism","magnetic effects of current","magnetism and matter","biot savart","ampere's law"]],
    ["Physics","Electromagnetic Induction and Alternating Currents",["electromagnetic induction","alternating current","alternating currents","faraday's law","lenz's law","emi and ac"]],
    ["Physics","Electromagnetic Waves",["electromagnetic waves"]],
    ["Physics","Optics",["ray optics","wave optics","young's double slit"]],
    ["Physics","Dual Nature of Matter and Radiation",["dual nature","photoelectric effect","de broglie"]],
    ["Physics","Atoms and Nuclei",["atoms and nuclei","radioactivity","bohr model","nuclear binding energy"]],
    ["Physics","Electronic Devices",["semiconductor","electronic devices","logic gates","diode"]],
    ["Chemistry","Some Basic Concepts in Chemistry",["mole concept","stoichiometry","some basic concepts in chemistry"]],
    ["Chemistry","Atomic Structure",["structure of atom","atomic structure","quantum numbers","bohr model chemistry"]],
    ["Chemistry","Chemical Bonding and Molecular Structure",["chemical bonding","molecular structure","vsepr","hybridisation"]],
    ["Chemistry","Chemical Thermodynamics",["chemical thermodynamics","enthalpy","gibbs free energy"]],
    ["Chemistry","Solutions",["colligative properties","raoult's law","solutions chemistry","osmotic pressure"]],
    ["Chemistry","Equilibrium",["chemical equilibrium","ionic equilibrium","buffer solution"]],
    ["Chemistry","Redox Reactions and Electrochemistry",["redox reactions","electrochemistry","nernst equation"]],
    ["Chemistry","Chemical Kinetics",["chemical kinetics","rate law","order of reaction","half life","pseudo first order"]],
    ["Chemistry","Coordination Compounds",["coordination compounds","crystal field theory"]],
    ["Chemistry","Some Basic Principles of Organic Chemistry",["general organic chemistry","goc","inductive effect","resonance effect","isomerism in organic chemistry"]],
    ["Chemistry","Hydrocarbons",["hydrocarbons","alkanes","alkenes","alkynes","aromatic hydrocarbons"]],
    ["Chemistry","Organic Compounds Containing Halogens",["haloalkanes","haloarenes","organic compounds containing halogens"]],
    ["Chemistry","Organic Compounds Containing Oxygen",["alcohols phenols ethers","aldehydes ketones carboxylic acids","carbonyl compounds"]],
    ["Chemistry","Organic Compounds Containing Nitrogen",["amines","diazonium salts","organic compounds containing nitrogen"]],
    ["Chemistry","Biomolecules",["biomolecules","carbohydrates","proteins","tollens reagent","fehling solution"]],
    ["Mathematics","Sets, Relations and Functions",["sets relations and functions","relations and functions"]],
    ["Mathematics","Complex Numbers and Quadratic Equations",["complex numbers","quadratic equations","argand plane"]],
    ["Mathematics","Matrices and Determinants",["matrices and determinants","matrices","determinants"]],
    ["Mathematics","Permutations and Combinations",["permutations and combinations","p and c"]],
    ["Mathematics","Binomial Theorem and Its Simple Applications",["binomial theorem"]],
    ["Mathematics","Sequence and Series",["sequences and series","arithmetic progression","geometric progression"]],
    ["Mathematics","Limit, Continuity and Differentiability",["limits continuity differentiability","continuity and differentiability","differentiation","application of derivatives"]],
    ["Mathematics","Integral Calculus",["indefinite integration","definite integration","integral calculus","integration","area under curves"]],
    ["Mathematics","Differential Equations",["differential equations"]],
    ["Mathematics","Coordinate Geometry",["straight lines","conic sections","parabola ellipse hyperbola"]],
    ["Mathematics","Three-Dimensional Geometry",["three dimensional geometry","3d geometry","direction cosines"]],
    ["Mathematics","Vector Algebra",["vector algebra","dot product","cross product"]],
    ["Mathematics","Statistics and Probability",["statistics and probability","probability","mean variance","standard deviation"]],
    ["Mathematics","Trigonometry",["trigonometric functions","trigonometry","inverse trigonometric functions"]]
  ];
  CHAPTERS.sort((a,b)=>Math.max(...b[2].map(x=>x.length))-Math.max(...a[2].map(x=>x.length)));

  let statusSignature = "";
  function report(type,message,extra={}) {
    const payload={type,message,...extra,updatedAt:new Date().toISOString(),url:location.href};
    const sig=JSON.stringify(payload);
    if(sig===statusSignature)return;
    statusSignature=sig;
    chrome.storage.local.set({[STATUS]:payload}).catch(()=>{});
  }
  // A chapter-name match by itself is not enough: ordinary Telegram clips can
  // mention a chapter. Require clear study/lecture wording in the same post too.
  function isLecturePost(text) {
    const t=" "+normalize(text)+" ";
    const cues=[
      "lecture","lectures","lec","class","one shot","oneshot","revision",
      "revise","pyq","previous year questions","question practice","practice session",
      "jee","neet","ncert","dpp","problem solving","concepts","chapterwise",
      "chapter wise","part 1","part 2","part 3","part 4","session"
    ];
    return cues.some(cue=>t.includes(" "+normalize(cue)+" "));
  }
  function classify(text) {
    const t=normalize(text);
    if(!isLecturePost(text)) return null;
    for(const item of CHAPTERS) {
      const terms=[item[1],...item[2]].map(normalize).sort((a,b)=>b.length-a.length);
      const hit=terms.find(term=>term.length>=4?t.includes(term):(["goc","ktg","wpe","aod","emi","p c"].includes(term)&&(" "+t+" ").includes(" "+term+" ")));
      if(hit)return {subject:item[0],chapter:item[1],matchedPhrase:hit};
    }
    return null;
  }
  function getMessageContainer(video) {
    let node=video;
    for(let depth=0;node&&depth<12;depth++,node=node.parentElement) {
      if(node.matches?.('[data-message-id], [data-mid], .Message, .message, .bubble, [class*="message"], [class*="Message"]')) {
        const text=(node.innerText||node.textContent||"").trim();
        if(text.length>4&&text.length<6000)return node;
      }
    }
    return video.closest("figure")?.parentElement || video.parentElement;
  }
  function getContext(video) {
    const box=getMessageContainer(video);
    const messageText=String(box?.innerText||box?.textContent||"").replace(/\s+/g," ").trim();
    const videoTitle=video.getAttribute("aria-label")||video.getAttribute("title")||"";
    const sourceText=[videoTitle,messageText].filter(Boolean).join(" · ").slice(0,5000);
    const link=box?.querySelector('a[href*="t.me/"],a[href*="telegram.me/"]');
    const url=link?.href||location.href;
    const msgId=box?.getAttribute("data-message-id")||box?.getAttribute("data-mid")||"";
    const title=videoTitle.trim()||messageText.slice(0,180)||"Telegram video lecture";
    return {title,sourceText,url,msgId,boxText:messageText};
  }
  const tracked=new WeakMap();
  function attach(video) {
    if(tracked.has(video))return;
    tracked.set(video,true);
    let lastTime=video.currentTime||0;
    let lastContext="";
    let recordId="";
    report("player-found","Telegram video player found. Checking its message text for a JEE chapter.");
    const tick=async()=>{
      try{
        const context=getContext(video);
        const match=classify(context.sourceText);
        const now=video.currentTime||0;
        const delta=Math.max(0,Math.min(8,now-lastTime));
        lastTime=now;
        if(!match){
          report("unmatched","Not recorded: this post needs both a recognizable JEE chapter name and a lecture/study cue (such as Lecture, One Shot, Revision, PYQ, JEE or NEET).",{title:context.title});
          return;
        }
        const signature=context.msgId+"|"+context.title+"|"+match.chapter;
        if(signature!==lastContext){lastContext=signature;recordId="tgweb-"+(context.msgId||btoa(unescape(encodeURIComponent(context.url))).replace(/[^a-z0-9]/gi,"").slice(-24));}
        if(video.paused||video.ended||delta<=0){
          report("matched-paused","Recognized "+match.subject+" · "+match.chapter+". Press Play; recorded time increases while the video plays.",{title:context.title,subject:match.subject,chapter:match.chapter,videoId:recordId});
          return;
        }
        const data=await chrome.storage.local.get(STORE);
        const rows=Array.isArray(data[STORE])?data[STORE]:[];
        const old=rows.find(r=>r.id===recordId);
        const row={...(old||{}),id:recordId,title:context.title,url:context.url,messageId:context.msgId,source:"Telegram Web",subject:match.subject,chapter:match.chapter,matchedPhrase:match.matchedPhrase,watchedSeconds:Math.min(86400,(Number(old?.watchedSeconds)||0)+delta),firstWatchedAt:old?.firstWatchedAt||new Date().toISOString(),lastWatchedAt:new Date().toISOString(),durationSeconds:Math.round(video.duration||old?.durationSeconds||0)};
        const next=[row,...rows.filter(r=>r.id!==recordId)].slice(0,1000);
        await chrome.storage.local.set({[STORE]:next});
        report("tracking","Tracking Telegram playback · "+match.subject+" · "+match.chapter+".",{title:context.title,subject:match.subject,chapter:match.chapter,videoId:recordId,watchedSeconds:row.watchedSeconds});
      }catch(error){report("error","Telegram tracker error: "+String(error?.message||error));}
    };
    video.addEventListener("play",()=>{lastTime=video.currentTime||0;report("playing","Telegram video is playing. Checking lecture title and chapter.");});
    video.addEventListener("pause",tick);
    const timer=setInterval(()=>{if(!video.isConnected){clearInterval(timer);return;}tick();},3000);
    tick();
  }
  function scan(){document.querySelectorAll("video").forEach(attach);}
  const observer=new MutationObserver(()=>scan());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  scan();
  report("loaded","Telegram Web tracker loaded. Open a channel post with a playable video.");
})();