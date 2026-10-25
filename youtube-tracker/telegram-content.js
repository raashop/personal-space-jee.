(() => {
  "use strict";
  if (window.__psJeeTelegramTrackerInstalled) return;
  window.__psJeeTelegramTrackerInstalled = true;

  const STORE = "psJeeTelegramLectureRecordsV1";
  const STATUS = "psJeeTelegramTrackerStatusV1";
  const normalize = value => String(value || "").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
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
    ["Physics","Electromagnetic Waves",["electromagnetic waves","em waves","properties of em waves","maxwell equations"]],
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
      "revise","pyq","previous year questions","question practice","questions","solutions","problems","practice","practice session","important questions",
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
  function textHasChapter(text) {
    const t=normalize(text);
    return CHAPTERS.some(item=>[item[1],...item[2]].some(term=>{
      const n=normalize(term);
      return n.length>=4 && t.includes(n);
    }));
  }
  const nearbyCaptionCache=new WeakMap();
  function findNearbyLectureCaption(video) {
    const cached=nearbyCaptionCache.get(video);
    if(cached && Date.now()-cached.at<5000) return cached.value;
    const vr=video.getBoundingClientRect();
    const cx=(vr.left+vr.right)/2, cy=(vr.top+vr.bottom)/2;
    let best=null, bestScore=Infinity;
    // Telegram may render the caption outside the video ancestry. Search only
    // visible, nearby text elements that independently look like study content.
    for(const el of document.querySelectorAll("div,span,p,a")) {
      if(!el.isConnected || !el.getClientRects().length) continue;
      const style=getComputedStyle(el);
      if(style.display==="none" || style.visibility==="hidden" || Number(style.opacity)===0) continue;
      const text=String(el.innerText||"").replace(/\s+/g," ").trim();
      if(text.length<8 || text.length>500 || !textHasChapter(text) || !isLecturePost(text)) continue;
      const r=el.getBoundingClientRect();
      if(!r.width || !r.height) continue;
      const dx=Math.max(0,vr.left-r.right,r.left-vr.right);
      const dy=Math.max(0,vr.top-r.bottom,r.top-vr.bottom);
      const distance=Math.hypot(dx,dy);
      if(distance>1000) continue;
      const areaPenalty=Math.min(180,Math.sqrt(r.width*r.height)*0.08);
      const score=distance + text.length*0.28 + areaPenalty + el.childElementCount*2;
      if(score<bestScore) { bestScore=score; best={element:el,text,score}; }
    }
    nearbyCaptionCache.set(video,{at:Date.now(),value:best});
    return best;
  }
  function getContext(video) {
    const clean=node=>String(node?.innerText||"").replace(/\s+/g," ").trim();
    const ancestors=[];
    let node=video.parentElement;
    for(let depth=0;node&&depth<22;depth++,node=node.parentElement) {
      const text=clean(node);
      if(text.length>4&&text.length<6000&&!ancestors.includes(text)) ancestors.push(text);
    }
    const captionTexts=[];
    const overlaySelectors=[
      '.media-viewer-caption','.media-viewer-metadata',
      '[class*="media-viewer-caption"]','[class*="media-viewer-metadata"]',
      '[class*="viewer-caption"]','[class*="viewer-metadata"]'
    ];
    for(const selector of overlaySelectors) {
      try {
        for(const el of document.querySelectorAll(selector)) {
          if(!el.getClientRects().length) continue;
          const text=clean(el);
          if(text.length>4&&text.length<3000&&!captionTexts.includes(text)) captionTexts.push(text);
        }
      } catch {}
    }
    const videoLabel=[video.getAttribute("aria-label")||"",video.getAttribute("title")||""].filter(Boolean).join(" ").trim();
    // Prefer a visible caption that independently matches a chapter plus a study cue.
    // Avoid classifying from a large parent container that may contain other posts.
    const localCandidate=[...captionTexts,...ancestors].find(text=>textHasChapter(text)&&isLecturePost(text));
    const nearby=findNearbyLectureCaption(video);
    const candidate=nearby?.text||localCandidate||
      ([videoLabel].find(text=>textHasChapter(text)&&isLecturePost(text))||"");
    const sourceText=(candidate||videoLabel).slice(0,7000);
    const anchor=(nearby?.element||video).closest?.('[data-message-id], [data-mid]') ||
      video.closest?.('[data-message-id], [data-mid]');
    const msgId=anchor?.getAttribute("data-message-id")||anchor?.getAttribute("data-mid")||"";
    const link=anchor?.querySelector?.('a[href*="t.me/"],a[href*="telegram.me/"]');
    const title=(candidate||videoLabel||"Telegram video").trim().slice(0,180);
    return {title,sourceText,url:link?.href||location.href,msgId,boxText:candidate};
  }
  const tracked=new WeakMap();
  function attach(video) {
    if(tracked.has(video))return;
    tracked.set(video,true);
    let lastTime=video.currentTime||0;
    let lastContext="";
    let recordId="";
    let pendingSeconds=0;
    let ticking=false;
    let seeking=false;
    report("player-found","Telegram video player found. Checking its message text for a JEE chapter.");

    const tick=async(forceFlush=false)=>{
      if(ticking)return;
      ticking=true;
      let secondsToSave=0;
      try{
        const rect=video.getBoundingClientRect();
        const visible=rect.width>50&&rect.height>50&&rect.bottom>0&&rect.right>0&&rect.top<window.innerHeight&&rect.left<window.innerWidth;
        if(!visible){lastTime=video.currentTime||lastTime;return;}

        const context=getContext(video);
        const match=classify(context.sourceText);
        const now=video.currentTime||0;
        const delta=now-lastTime;
        lastTime=now;
        if(seeking){seeking=false;return;}

        if(!match){
          pendingSeconds=0;
          report("unmatched","Not recorded: this post needs its own recognizable JEE chapter name plus a study cue (Lecture, One Shot, Revision, Questions, PYQ, JEE or NEET).",{title:context.title});
          return;
        }

        const signature=context.msgId+"|"+context.title+"|"+match.chapter;
        if(signature!==lastContext){
          // Never carry seconds across a changed caption/chapter and attribute them
          // to the next post.
          if(lastContext)pendingSeconds=0;
          lastContext=signature;
          const key=context.msgId||context.url+"|"+context.title;
          let hash=2166136261;
          for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
          recordId="tgweb-"+(hash>>>0).toString(36);
        }

        if(delta>0&&delta<=8)pendingSeconds+=delta;
        const paused=video.paused||video.ended;
        const shouldFlush=pendingSeconds>=5||forceFlush||paused;

        if(!shouldFlush||pendingSeconds<=0){
          if(paused){
            report("matched-paused","Recognized "+match.subject+" · "+match.chapter+". Video is paused or ended; saved watch time is retained.",{title:context.title,subject:match.subject,chapter:match.chapter,videoId:recordId});
          }else if(delta<=0){
            report("playing-waiting","Recognized "+match.subject+" · "+match.chapter+". Video is playing; waiting for playback time to advance.",{title:context.title,subject:match.subject,chapter:match.chapter,videoId:recordId});
          }else{
            report("tracking","Tracking Telegram playback · "+match.subject+" · "+match.chapter+". Watch time is accumulating.",{title:context.title,subject:match.subject,chapter:match.chapter,videoId:recordId});
          }
          return;
        }

        secondsToSave=pendingSeconds;
        pendingSeconds=0;
        const data=await chrome.storage.local.get(STORE);
        const rows=Array.isArray(data[STORE])?data[STORE]:[];
        const old=rows.find(row=>row.id===recordId);
        const row={
          ...(old||{}),
          id:recordId,
          title:context.title,
          url:context.url,
          messageId:context.msgId,
          source:"Telegram Web",
          subject:match.subject,
          chapter:match.chapter,
          matchedPhrase:match.matchedPhrase,
          watchedSeconds:Math.min(86400,(Number(old?.watchedSeconds)||0)+secondsToSave),
          firstWatchedAt:old?.firstWatchedAt||new Date().toISOString(),
          lastWatchedAt:new Date().toISOString(),
          durationSeconds:Math.round(video.duration||old?.durationSeconds||0)
        };
        const next=[row,...rows.filter(item=>item.id!==recordId)].slice(0,1000);
        await chrome.storage.local.set({[STORE]:next});
        report(paused?"matched-paused":"tracking",
          paused
            ? "Recognized "+match.subject+" · "+match.chapter+". Playback paused; final watch time saved."
            : "Tracking Telegram playback · "+match.subject+" · "+match.chapter+".",
          {title:context.title,subject:match.subject,chapter:match.chapter,videoId:recordId,watchedSeconds:row.watchedSeconds});
      }catch(error){
        if(secondsToSave>0)pendingSeconds+=secondsToSave;
        report("error","Telegram tracker error: "+String(error?.message||error));
      }finally{
        ticking=false;
      }
    };

    video.addEventListener("play",()=>{lastTime=video.currentTime||0;report("playing","Telegram video is playing. Checking lecture title and chapter.");tick();});
    video.addEventListener("loadedmetadata",()=>{nearbyCaptionCache.delete(video);lastTime=video.currentTime||0;pendingSeconds=0;lastContext="";tick();});
    video.addEventListener("seeking",()=>{seeking=true;lastTime=video.currentTime||0;});
    video.addEventListener("timeupdate",()=>tick(),{passive:true});
    video.addEventListener("pause",()=>tick(true));
    video.addEventListener("ended",()=>tick(true));
    const timer=setInterval(()=>{if(!video.isConnected){clearInterval(timer);return;}tick();},3000);
    tick();
  }

  let scanTimer=null;
  function scan(){document.querySelectorAll("video").forEach(attach);}
  function scheduleScan(){
    if(scanTimer!==null)return;
    scanTimer=setTimeout(()=>{scanTimer=null;scan();},180);
  }
  const observer=new MutationObserver(scheduleScan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  scan();
  report("loaded","Telegram Web tracker loaded. Open a channel post with a playable video.");
})();