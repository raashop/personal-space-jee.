
/* Personal Space 6.0 — study journal, daily plan, focus timer, weekly analytics */
(function(){
  const byId = id => document.getElementById(id);
  const ensure = () => {
    if(!Array.isArray(state.studySessions)) state.studySessions=[];
    if(!Array.isArray(state.dailyTasks)) state.dailyTasks=[];
    if(!Array.isArray(state.dailyReviews)) state.dailyReviews=[];
    if(!Array.isArray(state.weeklyReviews)) state.weeklyReviews=[];
    if(!state.studyGoals) state.studyGoals={dailyMinutes:180,weeklyDays:6};
  };
  ensure();
  const isoDate = d => {
    const x=new Date(d);
    return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
  };
  const addDays = (iso,n) => {const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return isoDate(d);};
  const niceDay = iso => {if(!iso)return "—";const d=new Date(iso+"T12:00:00");return d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});};
  const sum = list => list.reduce((n,x)=>n+(Number(x.minutes)||0),0);
  const sessionsFor = date => state.studySessions.filter(x=>x.date===date);
  const tasksFor = date => state.dailyTasks.filter(x=>x.date===date);
  const dateReview = date => state.dailyReviews.find(x=>x.date===date)||{date:date,focus:"",energy:"",wins:"",blockers:"",tomorrow:""};
  const unique = list => [...new Set(list)];
  const dayMinutes = date => sum(sessionsFor(date));
  const isStudyDay = date => dayMinutes(date)>0 || tasksFor(date).some(t=>t.done);
  const subjectNames = ["Physics","Chemistry","Mathematics"];
  let timerInterval=null,timerEnd=0,timerInitial=0,timerStarted=0,timerChosen=25,timerRunning=false;

  const dailyMarkup = `
  <section class="page" id="page-daily">
    <div class="page-hero"><div><h2>Your daily log</h2><p>Plan the day, record what you actually studied, and leave yourself a useful note for tomorrow. Nothing here is guessed — your reports use the sessions and tasks you log.</p></div><button class="btn btn-primary" onclick="openStudySessionModal()">＋ Log study</button></div>
    <div class="daily-datebar"><div><label for="dailyDate">VIEW A DAY</label><input class="control" type="date" id="dailyDate" onchange="renderDailyLog()"></div><div class="daily-date-actions"><button class="btn btn-secondary" onclick="setDailyDate(-1)">← Previous day</button><button class="btn btn-quiet" onclick="setDailyDate(0)">Today</button><button class="btn btn-secondary" onclick="setDailyDate(1)">Next day →</button></div></div>
    <div class="daily-stats" id="dailyStats"></div>
    <div class="daily-layout">
      <div class="daily-main-column">
        <section class="panel daily-section-panel"><div class="daily-section-head"><div><h3>Today's plan</h3><p>Small, specific tasks beat an overwhelming to-do list.</p></div><button class="btn btn-secondary" onclick="openDailyTaskModal()">＋ Add task</button></div><div id="dailyTaskList" class="daily-task-list"></div><div class="daily-task-footer"><span id="dailyTaskProgress"></span><button class="small-btn" onclick="carryOverTasks()">Carry unfinished from yesterday ↗</button></div></section>
        <section class="panel daily-section-panel"><div class="daily-section-head"><div><h3>What you studied</h3><p>Sessions entered here power your weekly stats and day-to-day comparisons.</p></div><span class="badge blue" id="sessionCountBadge">0 sessions</span></div><div id="studySessionList" class="study-session-list"></div></section>
        <section class="panel daily-section-panel"><div class="daily-section-head"><div><h3>Daily shutdown</h3><p>Capture one win, one obstacle and a clear next step.</p></div><span class="badge">Personal reflection</span></div><div class="reflection-grid"><label class="form-field">Focus today<select class="control" id="reviewFocus"><option value="">Choose rating</option><option value="1">1 · Scattered</option><option value="2">2 · Below average</option><option value="3">3 · Okay</option><option value="4">4 · Focused</option><option value="5">5 · Deep focus</option></select></label><label class="form-field">Energy today<select class="control" id="reviewEnergy"><option value="">Choose rating</option><option value="1">1 · Drained</option><option value="2">2 · Low</option><option value="3">3 · Average</option><option value="4">4 · Good</option><option value="5">5 · Great</option></select></label><label class="form-field full">What went well?<textarea id="reviewWins" class="control" rows="2" placeholder="A concept clicked, a difficult set finished…"></textarea></label><label class="form-field full">What got in the way?<textarea id="reviewBlockers" class="control" rows="2" placeholder="Distractions, confusing topics, low energy…"></textarea></label><label class="form-field full">First step for next time<textarea id="reviewTomorrow" class="control" rows="2" placeholder="Make tomorrow easier to start by choosing one first task."></textarea></label></div><div class="daily-section-footer"><span class="helper-note" id="reviewSavedLabel">Reflection saves when you press save.</span><button class="btn btn-primary" onclick="saveDailyReview()">Save reflection ✓</button></div></section>
      </div>
      <div class="daily-side-column">
        <section class="panel focus-timer-panel"><div class="timer-kicker">FOCUS ROOM · NO DISTRACTIONS</div><h3>One thing at a time.</h3><p class="panel-sub">Run a focus block; when it ends, the time is added to your study log.</p><div class="timer-display" id="focusTimerDisplay">25:00</div><div class="timer-presets"><button class="type-tab active" data-timer-min="25" onclick="setTimerPreset(25)">25 min</button><button class="type-tab" data-timer-min="50" onclick="setTimerPreset(50)">50 min</button><button class="type-tab" data-timer-min="90" onclick="setTimerPreset(90)">90 min</button></div><div class="timer-form"><label class="form-field">Subject<select class="control" id="timerSubject" onchange="updateTimerChapters()"><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></label><label class="form-field">Chapter<select class="control" id="timerChapter"></select></label><label class="form-field">Session type<select class="control" id="timerKind"><option value="Study">Study</option><option value="Revision">Revision</option><option value="PYQ practice">PYQ practice</option><option value="Test review">Test review</option></select></label></div><div class="timer-actions"><button class="btn btn-primary" id="timerStartButton" onclick="toggleFocusTimer()">Start focus ↗</button><button class="btn btn-secondary" id="timerResetButton" onclick="resetFocusTimer()">Reset</button></div><div class="timer-footnote" id="timerFootnote">Timer entries are saved locally with your other study data.</div></section>
        <section class="panel yesterday-panel"><div class="daily-section-head"><div><h3>Yesterday, in review</h3><p id="yesterdayLabel">A quick look back.</p></div></div><div id="yesterdaySummary" class="yesterday-summary"></div><button class="btn btn-secondary" style="width:100%;margin-top:12px" onclick="openYesterday()">Open yesterday's log ↗</button></section>
        <section class="panel"><h3>Quick note</h3><p class="panel-sub">A quick capture is better than losing a useful thought.</p><textarea id="quickCapture" class="control" rows="4" placeholder="A formula to revise, a doubt to ask, a mistake to remember…"></textarea><button class="btn btn-secondary" style="margin-top:9px" onclick="saveQuickCapture()">Save to today's reflection</button></section>
      </div>
    </div>
  </section>
  <section class="page" id="page-performance">
    <div class="page-hero"><div><h2>Performance studio</h2><p>Your real study record, not a made-up score. Compare days, subjects and weeks to learn what is working and what needs adjusting.</p></div><button class="btn btn-secondary" onclick="openWeeklyReviewModal()">Weekly reflection ✎</button></div>
    <div class="performance-controls"><div><label for="performanceRange">REPORT WINDOW</label><select id="performanceRange" class="control" onchange="renderPerformance()"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></div><div><label for="performanceGoalDaily">DAILY STUDY TARGET</label><div class="goal-input"><input class="control" id="performanceGoalDaily" type="number" min="15" max="900" step="15" value="180"><span>min</span></div></div><div><label for="performanceGoalDays">WEEKLY STUDY DAYS</label><select class="control" id="performanceGoalDays"><option value="3">3 days</option><option value="4">4 days</option><option value="5">5 days</option><option value="6" selected>6 days</option><option value="7">7 days</option></select></div><button class="btn btn-primary goal-save" onclick="saveStudyGoals()">Save targets</button></div>
    <div class="performance-kpis" id="performanceKpis"></div>
    <div class="performance-grid"><section class="panel"><div class="daily-section-head"><div><h3>Study minutes by day</h3><p id="minutesChartHint">Your logged sessions over the selected period.</p></div><span class="badge blue">Actual time</span></div><div id="minutesChart" class="minutes-chart"></div></section><section class="panel"><div class="daily-section-head"><div><h3>Where your time went</h3><p>Study minutes grouped by subject.</p></div></div><div id="subjectTimeBreakdown" class="subject-time-breakdown"></div></section></div>
    <div class="performance-grid"><section class="panel"><div class="daily-section-head"><div><h3>This week vs last week</h3><p>Compare tracked work for the last two 7-day windows.</p></div></div><div id="weekComparison" class="week-comparison"></div></section><section class="panel"><div class="daily-section-head"><div><h3>Your patterns</h3><p>Helpful suggestions from the numbers you've logged.</p></div></div><div id="performanceInsights" class="performance-insights"></div></section></div>
    <section class="panel weekly-table-panel"><div class="daily-section-head"><div><h3>Daily breakdown</h3><p id="performanceTableHint">Each day adds up from your study sessions and tasks.</p></div><button class="small-btn" onclick="go('daily')">Open daily log ↗</button></div><div class="table-scroll"><table><thead><tr><th>Date</th><th>Study time</th><th>Sessions</th><th>Tasks done</th><th>Task completion</th><th>Reflection</th></tr></thead><tbody id="performanceRows"></tbody></table></div></section>
    <section class="panel weekly-review-card"><div class="daily-section-head"><div><h3>Weekly review</h3><p>Review your wins, friction and one change for next week.</p></div><span class="badge green" id="weeklyReviewStatus">Not written yet</span></div><div id="weeklyReviewContent" class="weekly-review-content"></div><button class="btn btn-primary" onclick="openWeeklyReviewModal()">Write / update weekly review</button></section>
  </section>`;

  const nav = document.getElementById("nav");
  if(nav && !document.querySelector('[data-page="daily"]')){
    nav.insertAdjacentHTML("beforeend",'<button data-page="daily"><span class="nav-icon">✎</span>Daily log</button><button data-page="performance"><span class="nav-icon">↗</span>Performance</button>');
  }
  const footer = document.querySelector(".footer-line");
  if(footer && !byId("page-daily")) footer.insertAdjacentHTML("beforebegin",dailyMarkup);
  const head = document.head;
  if(head && !document.querySelector('link[href="./productivity.css"]')){
    const css=document.createElement("link");css.rel="stylesheet";css.href="./productivity.css";head.appendChild(css);
  }

  function renderTaskItem(t){
    return '<article class="daily-task '+(t.done?'is-done':'')+'"><button class="task-check '+(t.done?'checked':'')+'" aria-label="'+(t.done?'Mark incomplete':'Mark complete')+'" onclick="toggleDailyTask(\''+escapeAttr(t.id)+'\')">'+(t.done?'✓':'')+'</button><div class="task-copy"><strong>'+escapeHTML(t.title)+'</strong><div class="task-meta">'+escapeHTML(t.subject||'General')+(t.chapter?' · '+escapeHTML(chapterDisplayName(t.subject,t.chapter)):'')+(t.estimate?' · '+Number(t.estimate)+' min':'')+'</div></div><span class="task-priority '+escapeAttr((t.priority||'Normal').toLowerCase())+'">'+escapeHTML(t.priority||'Normal')+'</span><button class="mini-delete" title="Delete task" onclick="deleteDailyTask(\''+escapeAttr(t.id)+'\')">×</button></article>';
  }
  function renderSessionItem(s){
    return '<article class="study-session"><div class="session-kind">'+escapeHTML(s.kind||'Study')+'</div><div class="session-main"><strong>'+escapeHTML(s.title||chapterDisplayName(s.subject,s.chapter||''))+'</strong><div class="session-meta">'+escapeHTML(s.subject||'General')+(s.chapter?' · '+escapeHTML(chapterDisplayName(s.subject,s.chapter)):'')+' · '+(Number(s.focus)||3)+'/5 focus</div>'+(s.notes?'<p>'+escapeHTML(s.notes)+'</p>':'')+'</div><div class="session-time"><strong>'+Number(s.minutes||0)+'m</strong><small>'+escapeHTML((s.createdAt||'').slice(11,16)||'Logged')+'</small></div><button class="mini-delete" title="Delete session" onclick="deleteStudySession(\''+escapeAttr(s.id)+'\')">×</button></article>';
  }
  window.renderDailyPulse = function(){
    if(!byId("dailyPulseTasks"))return;
    const today=todayISO(),yesterday=addDays(today,-1),yt=sessionsFor(yesterday),ydone=tasksFor(yesterday).filter(t=>t.done).length,yMinutes=sum(yt),todayTasks=tasksFor(today),doneToday=todayTasks.filter(t=>t.done).length;
    byId("pulseYesterdayTitle").textContent=yMinutes ? (Math.floor(yMinutes/60)?Math.floor(yMinutes/60)+"h ":"")+yMinutes%60+"m tracked yesterday" : "Yesterday is ready to review";
    byId("pulseYesterdayMeta").textContent=ydone+" of "+tasksFor(yesterday).length+" planned tasks done · "+yt.length+" study sessions";
    byId("pulseTodayTitle").textContent=todayTasks.length?doneToday+" of "+todayTasks.length+" tasks done today":"Set your first task for today";
    byId("pulseTodayMeta").textContent=dayMinutes(today)+" minutes logged so far · target "+(state.studyGoals.dailyMinutes||180)+" minutes";
    byId("dailyPulseTasks").innerHTML=todayTasks.slice(0,4).map(t=>renderTaskItem(t)).join("")||'<div class="empty">No tasks planned yet. Add two or three realistic tasks to get started.</div>';
    const pulse=byId("dailyPulse");if(pulse)pulse.classList.toggle("pulse-complete",todayTasks.length>0&&doneToday===todayTasks.length);
  };

  function renderDailyLog(){
    ensure();const selected=byId("dailyDate");if(!selected)return;
    if(!selected.value)selected.value=todayISO();
    const date=selected.value,items=sessionsFor(date).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))),tasks=tasksFor(date),done=tasks.filter(t=>t.done).length,minutes=sum(items);
    const target=Number(state.studyGoals.dailyMinutes)||180,review=dateReview(date);
    byId("dailyStats").innerHTML=[
      ["Study time",Math.floor(minutes/60)?Math.floor(minutes/60)+"h "+minutes%60+"m":minutes+" min",Math.min(100,Math.round(minutes/target*100))+"% of daily target"],
      ["Focus sessions",items.length,"Recorded study blocks"],
      ["Tasks finished",done+" / "+tasks.length,tasks.length?pct(done,tasks.length)+"% complete":"No tasks planned"],
      ["Target",target+" min",Math.max(0,target-minutes)+" min left"]
    ].map((x,i)=>'<div class="daily-stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><div class="daily-stat-foot"><span>'+x[2]+'</span></div>'+(i===0?'<div class="progress-track"><div class="progress-fill" style="width:'+(parseInt(x[2],10)||0)+'%;--subject:var(--green)"></div></div>':'')+'</div>').join("");
    byId("dailyTaskList").innerHTML=tasks.map(renderTaskItem).join("")||'<div class="empty"><strong>Your plan is still open.</strong>Add one clear task, like “Revise electrostatics formulas” or “Solve 20 mole concept PYQs”.</div>';
    byId("dailyTaskProgress").textContent=tasks.length?done+" / "+tasks.length+" complete":"No tasks for "+niceDay(date);
    byId("studySessionList").innerHTML=items.map(renderSessionItem).join("")||'<div class="empty"><strong>No study sessions logged for this day.</strong>Use the focus timer or add a session after studying. Your performance charts build from these records.</div>';
    byId("sessionCountBadge").textContent=items.length+" session"+(items.length===1?"":"s");
    byId("reviewFocus").value=review.focus||"";byId("reviewEnergy").value=review.energy||"";byId("reviewWins").value=review.wins||"";byId("reviewBlockers").value=review.blockers||"";byId("reviewTomorrow").value=review.tomorrow||"";
    byId("reviewSavedLabel").textContent=state.dailyReviews.some(x=>x.date===date)?"Saved for "+niceDay(date):"Reflection saves when you press save.";
    byId("yesterdayLabel").textContent=niceDay(addDays(date,-1))+" · the day before this log.";
    const y=addDays(date,-1),ys=sessionsFor(y),yt=tasksFor(y),yd=yt.filter(t=>t.done).length;
    byId("yesterdaySummary").innerHTML='<div class="yesterday-big"><strong>'+sum(ys)+'</strong><span>study minutes</span></div><div class="yesterday-small"><span>'+ys.length+' focus sessions</span><span>'+yd+' / '+yt.length+' tasks completed</span></div><p>'+escapeHTML(dateReview(y).wins||"No reflection saved for this day yet.")+'</p>';
    byId("quickCapture").value=review.tomorrow||"";
  }
  window.renderDailyLog=renderDailyLog;
  window.setDailyDate=function(delta){const input=byId("dailyDate");input.value=delta===0?todayISO():addDays(input.value||todayISO(),delta);renderDailyLog();};
  window.openYesterday=function(){byId("dailyDate").value=addDays(todayISO(),-1);go("daily");renderDailyLog();};
  window.openDailyTaskModal=function(){
    const date=(byId("dailyDate")&&byId("dailyDate").value)||todayISO();
    const fields=[{name:"date",label:"Day",type:"date",value:date,required:true},{name:"title",label:"What needs to get done?",type:"text",value:"",required:true},{name:"subject",label:"Subject",type:"select",value:currentChapterSubject,options:[{value:"General",label:"General / admin"},{value:"Physics",label:"Physics"},{value:"Chemistry",label:"Chemistry"},{value:"Mathematics",label:"Mathematics"}]},{name:"chapter",label:"Chapter (optional)",type:"select",value:"",options:[{value:"",label:"No chapter"}].concat(state.chapters.filter(c=>c.subject===currentChapterSubject).map(c=>({value:c.chapter,label:chapterDisplayName(c.subject,c.chapter)})))},{name:"estimate",label:"Estimated minutes",type:"number",value:30,min:0,max:600},{name:"priority",label:"Priority",type:"select",value:"Normal",options:["Low","Normal","High"].map(x=>({value:x,label:x}))}];
    openModal("Add to daily plan",fields,{type:"dailyTask"});
  };
  window.openStudySessionModal=function(){
    const date=(byId("dailyDate")&&byId("dailyDate").value)||todayISO(),sub=currentChapterSubject;
    const fields=[{name:"date",label:"Study date",type:"date",value:date,required:true},{name:"kind",label:"Session type",type:"select",value:"Study",options:["Study","Revision","PYQ practice","Topic test","Mock analysis","Doubt clearing"].map(x=>({value:x,label:x}))},{name:"subject",label:"Subject",type:"select",value:sub,options:subjectNames.map(x=>({value:x,label:x}))},{name:"chapter",label:"Chapter",type:"select",value:"",options:[{value:"",label:"General / multiple chapters"}].concat(state.chapters.filter(c=>c.subject===sub).map(c=>({value:c.chapter,label:chapterDisplayName(c.subject,c.chapter)})))},{name:"title",label:"What did you work on?",type:"text",value:"",required:true},{name:"minutes",label:"Actual study time (minutes)",type:"number",value:45,min:1,max:600,required:true},{name:"focus",label:"Focus quality",type:"select",value:"3",options:[{value:"1",label:"1 · Distracted"},{value:"2",label:"2 · Uneven"},{value:"3",label:"3 · Okay"},{value:"4",label:"4 · Focused"},{value:"5",label:"5 · Deep focus"}]},{name:"notes",label:"What did you learn / what remains?",type:"textarea",value:"",full:true}];
    openModal("Log a study session",fields,{type:"studySession"});
  };
  window.saveDailyReview=function(){
    const date=(byId("dailyDate")&&byId("dailyDate").value)||todayISO(),r={date:date,focus:byId("reviewFocus").value,energy:byId("reviewEnergy").value,wins:byId("reviewWins").value.trim(),blockers:byId("reviewBlockers").value.trim(),tomorrow:byId("reviewTomorrow").value.trim()};
    const i=state.dailyReviews.findIndex(x=>x.date===date);if(i<0)state.dailyReviews.unshift(r);else state.dailyReviews[i]=r;
    saveState();renderDailyLog();toast("Daily reflection saved.");
  };
  window.saveQuickCapture=function(){byId("reviewTomorrow").value=byId("quickCapture").value;saveDailyReview();};
  window.toggleDailyTask=function(id){const t=state.dailyTasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;t.completedAt=t.done?new Date().toISOString():"";saveState();renderDailyLog();};
  window.deleteDailyTask=function(id){state.dailyTasks=state.dailyTasks.filter(x=>x.id!==id);saveState();renderDailyLog();toast("Task deleted.");};
  window.deleteStudySession=function(id){if(!confirm("Delete this study session? Performance totals will be recalculated."))return;state.studySessions=state.studySessions.filter(x=>x.id!==id);saveState();renderDailyLog();toast("Session deleted.");};
  window.carryOverTasks=function(){
    const date=(byId("dailyDate")&&byId("dailyDate").value)||todayISO(),y=addDays(date,-1),unfinished=tasksFor(y).filter(t=>!t.done);
    if(!unfinished.length){toast("No unfinished tasks from "+niceDay(y)+".");return;}
    const existing=new Set(tasksFor(date).map(t=>t.title.toLowerCase()));
    let count=0;unfinished.forEach(t=>{if(existing.has(t.title.toLowerCase()))return;state.dailyTasks.push({...t,id:"task-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),date:date,done:false,completedAt:"",createdAt:new Date().toISOString()});count++;});
    saveState();renderDailyLog();toast(count?count+" unfinished task(s) carried forward.":"Those tasks are already on this day.");
  };
  window.updateTimerChapters=function(){
    const sub=byId("timerSubject").value,sel=byId("timerChapter");if(!sel)return;
    const arr=state.chapters.filter(c=>c.subject===sub);
    sel.innerHTML='<option value="">General / multiple chapters</option>'+arr.map(c=>'<option value="'+escapeAttr(c.chapter)+'">'+escapeHTML(chapterDisplayName(c.subject,c.chapter))+'</option>').join("");
  };
  window.setTimerPreset=function(min){
    if(timerRunning){toast("Stop the current timer before changing its duration.");return;}
    timerChosen=min;timerInitial=min*60;byId("focusTimerDisplay").textContent=String(min).padStart(2,"0")+":00";
    document.querySelectorAll("[data-timer-min]").forEach(b=>b.classList.toggle("active",Number(b.dataset.timerMin)===min));
  };
  function drawTimer(){
    const secs=Math.max(0,Math.ceil((timerEnd-Date.now())/1000)),mins=Math.floor(secs/60),rem=secs%60;
    byId("focusTimerDisplay").textContent=String(mins).padStart(2,"0")+":"+String(rem).padStart(2,"0");
    if(secs<=0){finishTimer(true);}
  }
  function finishTimer(completed){
    if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
    timerRunning=false;const elapsed=Math.max(0,Math.round((Date.now()-timerStarted)/60000));
    byId("timerStartButton").textContent="Start focus ↗";byId("timerFootnote").textContent=completed?"Focus block complete — added to your study log.":"Timer stopped.";
    if(elapsed>0){
      if(byId("dailyDate"))byId("dailyDate").value=todayISO();
      const subject=byId("timerSubject").value,chapter=byId("timerChapter").value,kind=byId("timerKind").value;
      state.studySessions.unshift({id:"session-"+Date.now(),date:todayISO(),subject:subject,chapter:chapter,title:chapter?chapterDisplayName(subject,chapter):kind+" focus block",kind:kind,minutes:elapsed,focus:4,notes:completed?"Completed a "+timerChosen+" minute focus block.":"Timer stopped early; tracked elapsed time.",createdAt:new Date().toISOString()});
      saveState();renderDailyLog();
    }
    if(completed)toast("Focus block complete. Take a short break.");
  }
  window.toggleFocusTimer=function(){
    if(timerRunning){if(confirm("Stop this focus block and save the elapsed time?"))finishTimer(false);return;}
    timerStarted=Date.now();timerInitial=timerChosen*60;timerEnd=Date.now()+timerInitial*1000;timerRunning=true;
    byId("timerStartButton").textContent="Stop & save";byId("timerFootnote").textContent="Focus mode is running. Stay with one task.";
    timerInterval=setInterval(drawTimer,250);drawTimer();
  };
  window.resetFocusTimer=function(){if(timerRunning){toast("Stop the timer before resetting it.");return;}if(timerInterval)clearInterval(timerInterval);timerInitial=timerChosen*60;byId("focusTimerDisplay").textContent=String(timerChosen).padStart(2,"0")+":00";byId("timerFootnote").textContent="Timer reset. Ready when you are.";};
  window.openWeeklyReviewModal=function(){
    const start=addDays(todayISO(),-((new Date(todayISO()+"T12:00:00").getDay()+6)%7)),old=state.weeklyReviews.find(x=>x.weekStart===start)||{};
    openModal("Weekly review · week of "+niceDay(start),[{name:"wins",label:"What went well this week?",type:"textarea",value:old.wins||"",full:true},{name:"friction",label:"What wasted time or felt difficult?",type:"textarea",value:old.friction||"",full:true},{name:"learned",label:"What did you learn about your study habits?",type:"textarea",value:old.learned||"",full:true},{name:"next",label:"One adjustment for next week",type:"textarea",value:old.next||"",full:true}],{type:"weeklyReview",weekStart:start});
  };
  window.saveStudyGoals=function(){
    const daily=Math.max(15,Math.min(900,Number(byId("performanceGoalDaily").value)||180)),days=Math.max(3,Math.min(7,Number(byId("performanceGoalDays").value)||6));
    state.studyGoals={dailyMinutes:daily,weeklyDays:days};saveState();renderPerformance();renderDailyLog();toast("Study targets saved.");
  };
  window.renderPerformance=function(){
    ensure();const range=Math.max(7,Math.min(30,Number(byId("performanceRange").value)||7)),today=todayISO(),start=addDays(today,-(range-1)),prevStart=addDays(start,-range),prevEnd=addDays(start,-1),days=[];
    byId("performanceGoalDaily").value=state.studyGoals.dailyMinutes||180;byId("performanceGoalDays").value=String(state.studyGoals.weeklyDays||6);
    for(let i=0;i<range;i++)days.push(addDays(start,i));
    const logs=state.studySessions.filter(s=>s.date>=start&&s.date<=today),mins=sum(logs),activeDays=unique(logs.filter(s=>Number(s.minutes)>0).map(s=>s.date)).length,tasksIn=state.dailyTasks.filter(t=>t.date>=start&&t.date<=today),tasksDone=tasksIn.filter(t=>t.done).length,taskPct=tasksIn.length?pct(tasksDone,tasksIn.length):0;
    const previous=state.studySessions.filter(s=>s.date>=prevStart&&s.date<=prevEnd),prevMins=sum(previous),prevDays=unique(previous.filter(s=>Number(s.minutes)>0).map(s=>s.date)).length;
    const kpis=[["Study time",Math.floor(mins/60)+"h "+mins%60+"m",range+" day window"],["Active study days",activeDays, "In the selected date window"],["Focus sessions",logs.length,"Across all subjects"],["Task completion",tasksIn.length?taskPct+"%":"—",tasksDone+" of "+tasksIn.length+" tasks done"]];
    byId("performanceKpis").innerHTML=kpis.map((x,i)=>'<div class="performance-kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>').join("");
    const max=Math.max(30,...days.map(d=>dayMinutes(d)));
    byId("minutesChart").innerHTML=days.map(d=>{const m=dayMinutes(d),height=Math.max(m?5:2,Math.round(m/max*100));return '<div class="chart-column"><div class="chart-value">'+(m?m:"")+'</div><div class="chart-track" title="'+escapeAttr(niceDay(d)+": "+m+" minutes")+'"><div class="chart-bar '+(d===today?"is-today":"")+'" style="height:'+height+'%"></div></div><small>'+new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"}).slice(0,2)+'</small><span>'+new Date(d+"T12:00:00").getDate()+'</span></div>'}).join("");
    byId("minutesChartHint").textContent=mins+" minutes logged across "+activeDays+" active day(s).";
    const bySubject=subjectNames.map(s=>({name:s,minutes:sum(logs.filter(x=>x.subject===s)),color:chapterColor(s)})),subjectTotal=sum(bySubject);
    byId("subjectTimeBreakdown").innerHTML=bySubject.map(s=>'<div class="subject-time-row"><div class="subject-time-top"><span><i style="background:'+s.color+'"></i>'+s.name+'</span><strong>'+s.minutes+' min</strong></div><div class="progress-track"><div class="progress-fill" style="width:'+pct(s.minutes,subjectTotal)+'%;--subject:'+s.color+'"></div></div><small>'+pct(s.minutes,subjectTotal)+'% of logged time</small></div>').join("")+(subjectTotal?'':'<p class="helper-note">Log a study session to begin seeing your subject split.</p>');
    const diff=mins-prevMins,delta=prevMins?pct(Math.abs(diff),prevMins):0,dir=diff>0?"more":diff<0?"less":"the same amount of";
    const studyStreak=(()=>{let n=0,d=today;while(isStudyDay(d)){n++;d=addDays(d,-1);}return n;})();
    byId("weekComparison").innerHTML='<div class="comparison-pair"><div><small>Current window</small><strong>'+mins+' min</strong><span>'+activeDays+' active days</span></div><div><small>Previous '+range+' days</small><strong>'+prevMins+' min</strong><span>'+prevDays+' active days</span></div></div><div class="comparison-delta '+(diff>=0?'positive':'negative')+'">'+(diff===0?'Same study time as the previous window':(diff>0?'↑ ':'↓ ')+delta+'% '+dir+' than the previous window')+'</div><div class="comparison-mini"><span>Current daily avg.</span><strong>'+Math.round(mins/range)+' min</strong><span>Current streak</span><strong>'+studyStreak+' day'+(studyStreak===1?'':'s')+'</strong></div>';
    const insights=[];
    if(!mins)insights.push(["Start with the record","Log your next study session. Your charts and comparisons will become useful once actual time is recorded."]);
    else{
      const best=days.slice().sort((a,b)=>dayMinutes(b)-dayMinutes(a))[0];
      insights.push(["Your strongest day",niceDay(best)+" was your highest logged day, with "+dayMinutes(best)+" study minutes."]);
      if(diff>0)insights.push(["Momentum is up","You logged "+delta+"% more study time than the previous window. Note what helped you stay consistent."]);
      else if(diff<0)insights.push(["A gentle reset","Study time is lower than the previous window. Choose one achievable session today instead of trying to make up everything at once."]);
      const weak=bySubject.slice().sort((a,b)=>a.minutes-b.minutes)[0];
      if(subjectTotal&&weak.minutes===0)insights.push(["Subject balance","No minutes logged for "+weak.name+" in this window. Check whether that is intentional."]);
      if(tasksIn.length&&taskPct<50)insights.push(["Plan smaller","Fewer than half of planned tasks are complete. Consider fewer, clearer tasks or smaller time estimates."]);
      else if(tasksIn.length&&taskPct>=80)insights.push(["Plans are realistic","You completed "+taskPct+"% of tasks. Keep this workload shape if it felt sustainable."]);
    }
    byId("performanceInsights").innerHTML=insights.map((x,i)=>'<article class="insight-row"><span class="insight-number">'+String(i+1).padStart(2,"0")+'</span><div><strong>'+escapeHTML(x[0])+'</strong><p>'+escapeHTML(x[1])+'</p></div></article>').join("");
    byId("performanceRows").innerHTML=days.slice().reverse().map(d=>{const ses=sessionsFor(d),task=tasksFor(d),done=task.filter(t=>t.done).length,review=state.dailyReviews.find(r=>r.date===d);return '<tr><td><strong>'+escapeHTML(niceDay(d))+'</strong>'+(d===today?'<div class="badge green">Today</div>':'')+'</td><td>'+dayMinutes(d)+' min</td><td>'+ses.length+'</td><td>'+done+' / '+task.length+'</td><td>'+(task.length?pct(done,task.length)+'%':'—')+'</td><td class="cell-muted">'+escapeHTML(review&&review.wins?review.wins.slice(0,70):"—")+'</td></tr>'}).join("");
    byId("performanceTableHint").textContent="Showing "+range+" days · "+niceDay(start)+" – "+niceDay(today)+".";
    const weekStart=addDays(today,-((new Date(today+"T12:00:00").getDay()+6)%7)),wr=state.weeklyReviews.find(x=>x.weekStart===weekStart);
    byId("weeklyReviewStatus").textContent=wr?"Saved · week of "+niceDay(weekStart):"Not written yet";
    byId("weeklyReviewContent").innerHTML=wr?'<div class="weekly-review-quotes"><div><small>WINS</small><p>'+escapeHTML(wr.wins||"—")+'</p></div><div><small>FRICTION</small><p>'+escapeHTML(wr.friction||"—")+'</p></div><div><small>LEARNED</small><p>'+escapeHTML(wr.learned||"—")+'</p></div><div><small>NEXT WEEK</small><p>'+escapeHTML(wr.next||"—")+'</p></div></div>':'<p class="helper-note">Your next weekly reflection will be saved here. Review the numbers first, then write what you want to keep or change.</p>';
  };
  window.renderAllProductivity=function(){renderDailyLog();renderPerformance();window.renderDailyPulse();};
  /* Preserve the original app handlers and route extra work through the same save/cloud layer. */
  const originalSaveState=saveState;
  saveState=function(){originalSaveState();if(byId("page-daily"))renderDailyLog();if(byId("page-performance"))renderPerformance();window.renderDailyPulse();};
  const originalRenderDashboard=renderDashboard;
  renderDashboard=function(){originalRenderDashboard();window.renderDailyPulse();};
  const originalGo=go;
  go=function(page){
    if(page!=="daily"&&page!=="performance")return originalGo(page);
    currentPage=page;
    document.querySelectorAll(".page").forEach(n=>n.classList.toggle("active",n.id==="page-"+page));
    document.querySelectorAll("nav [data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const title=page==="daily"?["YOUR DAY","Daily log","Plan, track and reflect on what you studied."]:["YOUR PROGRESS","Performance studio","Weekly trends, goals and patterns from your study history."];
    byId("pageCrumb").textContent=title[0];byId("pageTitle").textContent=title[1];byId("pageSubtitle").textContent=title[2];
    window.scrollTo({top:0,behavior:"smooth"});
    if(page==="daily")renderDailyLog();else renderPerformance();
  };
  const originalSaveModal=saveModal;
  saveModal=function(e){
    if(!modalContext||!["studySession","dailyTask","weeklyReview"].includes(modalContext.type))return originalSaveModal(e);
    e.preventDefault();const v=valuesFromForm(),ctx=modalContext;
    if(ctx.type==="studySession"){
      const mins=Number(v.minutes);if(!v.title.trim()||!Number.isFinite(mins)||mins<1||mins>600){toast("Add a session title and a duration between 1 and 600 minutes.");return;}
      state.studySessions.unshift({id:"session-"+Date.now(),date:v.date||todayISO(),kind:v.kind||"Study",subject:v.subject||"General",chapter:v.chapter||"",title:v.title.trim(),minutes:Math.round(mins),focus:Number(v.focus)||3,notes:v.notes||"",createdAt:new Date().toISOString()});
    }else if(ctx.type==="dailyTask"){
      if(!v.title.trim()){toast("Give your task a clear name.");return;}
      state.dailyTasks.push({id:"task-"+Date.now(),date:v.date||todayISO(),title:v.title.trim(),subject:v.subject||"General",chapter:v.chapter||"",estimate:Math.max(0,Number(v.estimate)||0),priority:v.priority||"Normal",done:false,completedAt:"",createdAt:new Date().toISOString()});
    }else{
      const record={weekStart:ctx.weekStart,wins:v.wins||"",friction:v.friction||"",learned:v.learned||"",next:v.next||"",updatedAt:new Date().toISOString()};
      const i=state.weeklyReviews.findIndex(x=>x.weekStart===ctx.weekStart);if(i<0)state.weeklyReviews.unshift(record);else state.weeklyReviews[i]=record;
    }
    closeModal();saveState();toast(ctx.type==="studySession"?"Study session logged.":ctx.type==="dailyTask"?"Task added to your plan.":"Weekly review saved.");
  };
  /* Wire cross-subject chapter pickers after the base modal has rendered. */
  document.getElementById("modalForm").addEventListener("change",function(e){
    if(!e.target.matches('#modalFields [name="subject"]'))return;
    const sub=e.target.value,chapter=byId("modalFields").querySelector('[name="chapter"]');if(!chapter)return;
    const picked=chapter.value,opts=state.chapters.filter(c=>c.subject===sub);
    chapter.innerHTML='<option value="">General / multiple chapters</option>'+opts.map(c=>'<option value="'+escapeAttr(c.chapter)+'">'+escapeHTML(chapterDisplayName(c.subject,c.chapter))+'</option>').join("");
    if(opts.some(c=>c.chapter===picked))chapter.value=picked;
  });
  byId("dailyDate").value=todayISO();updateTimerChapters();
  /* Daily review prompt: gently surface the previous day without blocking the workspace. */
  const reviewDate=sessionStorage.getItem("ps-v6-last-open-date");
  if(reviewDate!==todayISO()){
    const y=addDays(todayISO(),-1),hasYesterday=sessionsFor(y).length||tasksFor(y).length;
    if(hasYesterday){byId("pulseYesterdayTitle").textContent="Yesterday’s recap is ready";byId("pulseYesterdayMeta").textContent="Review your sessions, completed tasks and reflection before planning today.";}
    try{sessionStorage.setItem("ps-v6-last-open-date",todayISO());}catch(e){}
  }
  renderAllProductivity();
})();
