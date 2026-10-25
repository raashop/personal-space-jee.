
/* Personal Space 6.0 — study journal, daily plan, focus timer, weekly analytics */
(function(){
  const byId = id => document.getElementById(id);
  const ensure = () => {
    if(!Array.isArray(state.studySessions)) state.studySessions=[];
    if(!Array.isArray(state.dailyTasks)) state.dailyTasks=[];
    if(!Array.isArray(state.dailyReviews)) state.dailyReviews=[];
    if(!Array.isArray(state.studyMistakes)) state.studyMistakes=[];
    if(!Array.isArray(state.weeklyReviews)) state.weeklyReviews=[];
    if(!Array.isArray(state.notes)) state.notes=[];
    if(!Array.isArray(state.habits)) state.habits=[
      {id:"habit-pyq",title:"Solve a PYQ set",category:"Practice"},
      {id:"habit-revision",title:"Revise one formula sheet",category:"Revision"},
      {id:"habit-mistake",title:"Review one mistake",category:"Review"},
      {id:"habit-focus",title:"Complete a focus block",category:"Focus"}
    ];
    if(!state.habitLogs||typeof state.habitLogs!=="object"||Array.isArray(state.habitLogs))state.habitLogs={};
    if(!state.studyGoals) state.studyGoals={dailyMinutes:300,weeklyDays:6,weeklyTopicTests:3,weeklyPyqQuestions:500};
    if(state.studyGoals.weeklyTopicTests===undefined)state.studyGoals.weeklyTopicTests=3;
    if(state.studyGoals.weeklyPyqQuestions===undefined)state.studyGoals.weeklyPyqQuestions=500;
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
  let timerInterval=null,timerEnd=0,timerInitial=0,timerStarted=0,timerChosen=25,timerRunning=false,activeMistakeTab="all";

  const dailyMarkup = `
  <section class="page" id="page-daily">
    <div class="page-hero daily-journal-hero"><div><h2>Daily Study Journal</h2><p>Log what you study, track your time and build consistency.</p></div><button class="btn btn-primary" onclick="openDailyTaskModal()">＋ Add Task</button></div>
    <div class="daily-journal-toolbar"><div class="daily-date-pick"><label for="dailyDate">YOUR STUDY DAY</label><input class="control" type="date" id="dailyDate" onchange="renderDailyLog()"></div><div class="daily-date-actions"><button class="btn btn-secondary" onclick="setDailyDate(-1)">‹</button><button class="btn btn-secondary daily-today-button" onclick="setDailyDate(0)">Today</button><button class="btn btn-secondary" onclick="setDailyDate(1)">›</button></div></div>
    <div class="daily-rollover-notice" id="dailyRolloverNotice" hidden><div><strong>Yesterday's plan needs your review</strong><span id="dailyRolloverText">Tick off completed work or carry unfinished tasks forward.</span></div><button type="button" class="btn btn-secondary" onclick="openYesterday()">Review yesterday</button><button type="button" class="btn btn-primary" onclick="carryOverTasks()">Carry unfinished</button></div>
    <div class="daily-stats" id="dailyStats" hidden></div>
    <div class="daily-layout daily-reference-layout">
      <div class="daily-main-column">
        <section class="panel daily-section-panel daily-task-panel"><div class="daily-section-head"><div><h3>Today's Tasks</h3><p id="dailyTaskProgress">0 / 0 completed</p></div><button class="btn btn-primary" onclick="openDailyTaskModal()">＋ Add Task</button></div><div id="dailyTaskList" class="daily-task-list"></div><div class="daily-task-footer"><span></span><button class="small-btn" onclick="carryOverTasks()">Carry unfinished from yesterday ↗</button></div></section>
        <section class="panel daily-section-panel daily-study-log-panel"><div class="daily-section-head"><div><h3>Study Log</h3><p>Every session adds to your progress record.</p></div><button class="btn btn-primary" onclick="openStudySessionModal()">＋ Add Log</button></div><div id="studySessionList" class="study-session-list"></div><div class="daily-session-footer"><span class="badge blue" id="sessionCountBadge">0 sessions</span><span class="daily-summary-note">Tracked study time updates automatically.</span></div></section>
      </div>
      <div class="daily-side-column">
        <section class="panel focus-timer-panel daily-focus-timer"><div class="daily-focus-top"><div class="timer-kicker">FOCUS TIMER</div><button type="button" class="timer-settings-button" onclick="document.getElementById('timerOptionsDetails').open=!document.getElementById('timerOptionsDetails').open" aria-label="Timer options">⚙</button></div><h3>One thing at a time.</h3><div class="timer-circle" id="focusTimerRing"><div class="timer-display" id="focusTimerDisplay">25:00</div><span class="timer-circle-caption">FOCUSED TIME</span></div><div class="timer-presets"><button class="type-tab active" data-timer-min="25" onclick="setTimerPreset(25)">Pomodoro</button><button class="type-tab" data-timer-min="50" onclick="setTimerPreset(50)">Deep Work</button><button class="type-tab" data-timer-min="90" onclick="setTimerPreset(90)">Long Session</button></div><div class="timer-actions"><button class="btn btn-primary" id="timerStartButton" onclick="toggleFocusTimer()">Start</button><button class="btn btn-secondary" id="timerResetButton" onclick="resetFocusTimer()" aria-label="Reset timer">↺</button></div><div class="timer-footnote" id="timerFootnote">Your time is saved in the study log.</div><details id="timerOptionsDetails" class="timer-options-details"><summary>Custom duration and session options</summary><div class="timer-custom-duration"><label class="form-field">Hours<input class="control" id="customTimerHours" type="number" min="0" max="24" step="1" value="0"></label><label class="form-field">Extra minutes<input class="control" id="customTimerMinutes" type="number" min="0" max="59" step="1" value="45"></label><button type="button" class="btn btn-secondary" onclick="setCustomTimerDuration()">Apply duration</button><small>Use up to 24 hours. The timer automatically logs elapsed minutes to your study history.</small></div><div class="timer-form"><label class="form-field">Subject<select class="control" id="timerSubject" onchange="updateTimerChapters()"><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></label><label class="form-field">Chapter<select class="control" id="timerChapter"></select></label><label class="form-field">Session type<select class="control" id="timerKind"><option value="Study">Study</option><option value="Revision">Revision</option><option value="PYQ practice">PYQ practice</option><option value="Test review">Test review</option></select></label></div></details></section>
        <section class="panel daily-summary-panel"><div class="daily-section-head"><div><h3>Today's Summary</h3><p>Your logged work for the selected day.</p></div></div><div class="daily-summary-main"><div><span class="summary-icon summary-time">◷</span><div><strong id="journalStudyTime">0h</strong><small>Study Time</small></div></div><div><span class="summary-icon summary-tasks">✓</span><div><strong id="journalTaskCount">0 / 0</strong><small>Tasks Done</small></div></div></div><div class="daily-summary-meter"><div class="daily-summary-meter-head"><span>Daily target</span><strong id="journalTargetLabel">0 / 180 min</strong></div><div class="progress-track"><div class="progress-fill" id="journalTargetFill" style="width:0%"></div></div></div><div class="daily-summary-bottom"><span id="journalSessionCount">0 sessions</span><span id="journalFocusQuality">Focus not rated</span></div></section>
      </div>
    </div>
    <details class="journal-more-details"><summary>Reflection, revision queue and notes</summary><div class="journal-extra-grid">
      <section class="panel daily-section-panel"><div class="daily-section-head"><div><h3>Daily shutdown</h3><p>Capture one win, one obstacle and a clear next step.</p></div><span class="badge">Reflection</span></div><div class="reflection-grid"><label class="form-field">Focus today<select class="control" id="reviewFocus"><option value="">Choose rating</option><option value="1">1 · Scattered</option><option value="2">2 · Below average</option><option value="3">3 · Okay</option><option value="4">4 · Focused</option><option value="5">5 · Deep focus</option></select></label><label class="form-field">Energy today<select class="control" id="reviewEnergy"><option value="">Choose rating</option><option value="1">1 · Drained</option><option value="2">2 · Low</option><option value="3">3 · Average</option><option value="4">4 · Good</option><option value="5">5 · Great</option></select></label><label class="form-field full">What went well?<textarea id="reviewWins" class="control" rows="2" placeholder="A concept clicked, a difficult set finished…"></textarea></label><label class="form-field full">What got in the way?<textarea id="reviewBlockers" class="control" rows="2" placeholder="Distractions, confusing topics, low energy…"></textarea></label><label class="form-field full">First step for next time<textarea id="reviewTomorrow" class="control" rows="2" placeholder="Make tomorrow easier to start by choosing one first task."></textarea></label></div><div class="daily-section-footer"><span class="helper-note" id="reviewSavedLabel">Reflection saves when you press save.</span><button class="btn btn-primary" onclick="saveDailyReview()">Save reflection ✓</button></div></section>
      <section class="panel yesterday-panel"><div class="daily-section-head"><div><h3>Yesterday, in review</h3><p id="yesterdayLabel">A quick look back.</p></div></div><div id="yesterdaySummary" class="yesterday-summary"></div><button class="btn btn-secondary" style="width:100%;margin-top:12px" onclick="openYesterday()">Open yesterday's log ↗</button></section>
      <section class="panel revision-queue-panel"><div class="daily-section-head"><div><h3>Smart revision queue</h3><p>Weak chapters and mistakes ready to revisit.</p></div><span class="badge orange" id="revisionQueueCount">0</span></div><div id="revisionQueue" class="revision-queue"></div></section>
      <section class="panel quick-note-panel"><h3>Quick note</h3><p class="panel-sub">Capture a formula, doubt or idea before it slips away.</p><textarea id="quickCapture" class="control" rows="4" placeholder="A formula to revise, a doubt to ask, a mistake to remember…"></textarea><button class="btn btn-secondary" style="margin-top:9px" onclick="saveQuickCapture()">Save note</button></section>
    </div></details>
  </section>
  <section class="page" id="page-notes">
    <div class="page-hero notes-hero"><div><h2>Notes</h2><p>Keep formulas, doubts and useful reminders close to your study plan.</p></div><span class="notes-count-chip"><strong id="notesCount">0</strong> saved notes</span></div>
    <div class="notes-layout">
      <section class="panel notes-editor-panel"><div class="daily-section-head"><div><h3 id="noteEditorTitle">New note</h3><p>Save a concept while it is still fresh.</p></div></div><input id="noteEditId" type="hidden"><label class="form-field">Note title<input class="control" id="noteTitle" type="text" placeholder="e.g. Tollens' reagent — key points"></label><label class="form-field">Subject<select class="control" id="noteSubject"><option>General</option><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></label><label class="form-field">Your note<textarea class="control" id="noteBody" rows="7" placeholder="Formula, explanation, example, doubt to ask…"></textarea></label><div class="notes-editor-actions"><button class="btn btn-primary" id="saveNoteButton" onclick="saveStudyNote()">Save note</button><button class="btn btn-secondary" onclick="cancelStudyNoteEdit()">Clear</button></div></section>
      <section class="panel notes-library-panel"><div class="daily-section-head"><div><h3>Your notebook</h3><p>Search the ideas you want to revisit.</p></div></div><div class="notes-filters"><select class="control" id="notesFilterSubject" onchange="renderNotes()"><option value="all">All subjects</option><option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>General</option></select><input class="control search" id="notesSearch" placeholder="Search notes…" oninput="renderNotes()"></div><div id="notesList" class="notes-list"></div></section>
    </div>
  </section>
  <section class="page" id="page-goals">
    <div class="page-hero"><div><h2>Goals &amp; Habits</h2><p>Make consistent study feel manageable. Set targets and tick off the small habits that move you forward.</p></div></div>
    <div class="goals-summary-grid">
      <section class="panel goal-highlight"><span>STUDY TIME TODAY</span><strong id="goalTodayStudyTime">0h</strong><small id="goalTodayStudyTarget">Target · 5h</small><div class="progress-track"><div class="progress-fill" id="goalTodayProgressBar" style="width:0%"></div></div></section>
      <section class="panel goal-highlight"><span>WEEKLY STUDY DAYS</span><strong id="goalWeeklyStudyDays">0 / 6</strong><small>Days with logged study or completed tasks</small><div class="progress-track"><div class="progress-fill" id="goalWeeklyDaysBar" style="width:0%;--subject:#2784d8"></div></div></section>
      <section class="panel goal-highlight"><span>TOPIC TESTS THIS WEEK</span><strong id="goalTopicTestsDone">0 / 3</strong><small>Attempted tests</small><div class="progress-track"><div class="progress-fill" id="goalTopicTestsBar" style="width:0%"></div></div></section>
      <section class="panel goal-highlight"><span>PYQ QUESTIONS THIS WEEK</span><strong id="goalPyqDone">0 / 500</strong><small>Questions logged in practice sessions</small><div class="progress-track"><div class="progress-fill" id="goalPyqBar" style="width:0%"></div></div></section>
    </div>
    <div class="goals-layout">
      <section class="panel habits-panel"><div class="daily-section-head"><div><h3>Today's Habits</h3><p>Keep the list small enough to finish.</p></div><span class="badge green" id="habitsTodayCount">0 / 0 done</span></div><div id="habitsList" class="habits-list"></div><div class="add-habit-row"><input class="control" id="newHabitTitle" placeholder="Add a small daily habit…"><button class="btn btn-primary" onclick="addStudyHabit()">＋ Add</button></div></section>
      <section class="panel goals-settings-panel"><div class="daily-section-head"><div><h3>Study Targets</h3><p>These targets are shared with Performance Studio.</p></div></div><div class="goal-settings-fields"><label class="form-field">Daily study time (minutes)<input class="control" id="goalDailyMinutes" type="number" min="15" max="900" step="15" value="300"></label><label class="form-field">Study days each week<select class="control" id="goalWeeklyDays"><option value="3">3 days</option><option value="4">4 days</option><option value="5">5 days</option><option value="6" selected>6 days</option><option value="7">7 days</option></select></label><label class="form-field">Topic tests per week<input class="control" id="goalWeeklyTopicTests" type="number" min="1" max="30" value="3"></label><label class="form-field">PYQ questions per week<input class="control" id="goalWeeklyPyqQuestions" type="number" min="10" max="5000" step="10" value="500"></label></div><button class="btn btn-primary" onclick="saveGoalSettings()">Save targets</button></section>
    </div>
  </section>
  <section class="page" id="page-performance">
    <div class="page-hero performance-hero"><div><h2>Performance Studio</h2><p>Analyse your progress, find patterns and stay on track.</p></div><div class="performance-range-tabs" role="group" aria-label="Performance report range"><button type="button" class="active" data-performance-range="7" onclick="setPerformanceRange(7)">7 Days</button><button type="button" data-performance-range="14" onclick="setPerformanceRange(14)">14 Days</button><button type="button" data-performance-range="30" onclick="setPerformanceRange(30)">30 Days</button></div></div>
    <select id="performanceRange" class="control performance-range-native" aria-label="Report window" onchange="renderPerformance()"><option value="7" selected>Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select>
    <div class="performance-kpis" id="performanceKpis"></div>
    <div class="performance-grid performance-charts-grid"><section class="panel"><div class="daily-section-head"><div><h3>Daily Study Time</h3><p id="minutesChartHint">Your logged sessions over the selected period.</p></div><span class="badge blue">Actual time</span></div><div id="minutesChart" class="minutes-chart"></div></section><section class="panel"><div class="daily-section-head"><div><h3>Subject-wise Study Time</h3><p>See where your tracked study time went.</p></div></div><div id="subjectTimeBreakdown" class="subject-time-breakdown"></div></section></div>
    <div class="performance-grid performance-lower-grid">
      <section class="panel"><div class="daily-section-head"><div><h3>Weekly Comparison</h3><p>Compare study time and completed tasks.</p></div></div><div id="weekComparison" class="week-comparison"></div></section>
      <section class="panel performance-goals-panel"><div class="daily-section-head"><div><h3>Goals &amp; Targets</h3><p>Keep your weekly effort aligned with your plan.</p></div><button class="small-btn" type="button" onclick="togglePerformanceGoalsEditor()">Edit</button></div><div id="performanceGoalsSummary" class="performance-goals-summary"></div>
       <details id="performanceGoalsEditor" class="performance-goals-editor"><summary>Update targets</summary><div class="performance-controls"><div><label for="performanceGoalDaily">DAILY STUDY TARGET</label><div class="goal-input"><input class="control" id="performanceGoalDaily" type="number" min="15" max="900" step="15" value="300"><span>min</span></div></div><div><label for="performanceGoalDays">WEEKLY STUDY DAYS</label><select class="control" id="performanceGoalDays"><option value="3">3 days</option><option value="4">4 days</option><option value="5">5 days</option><option value="6" selected>6 days</option><option value="7">7 days</option></select></div><div><label for="performanceGoalTopics">WEEKLY TOPIC TESTS</label><input class="control" id="performanceGoalTopics" type="number" min="1" max="30" value="3"></div><div><label for="performanceGoalPyqs">WEEKLY PYQ QUESTIONS</label><input class="control" id="performanceGoalPyqs" type="number" min="10" max="5000" step="10" value="500"></div><button class="btn btn-primary goal-save" onclick="saveStudyGoals()">Save targets</button></div></details>
      </section>
    </div>
    <details class="performance-more-details"><summary>Patterns, daily breakdown and weekly review</summary>
      <section class="panel performance-insights-panel"><div class="daily-section-head"><div><h3>Your Patterns</h3><p>Helpful suggestions from the numbers you've logged.</p></div></div><div id="performanceInsights" class="performance-insights"></div></section>
      <section class="panel weekly-table-panel"><div class="daily-section-head"><div><h3>Daily Breakdown</h3><p id="performanceTableHint">Each day adds up from your study sessions and tasks.</p></div><button class="small-btn" onclick="go('daily')">Open daily log ↗</button></div><div class="table-scroll"><table><thead><tr><th>Date</th><th>Study time</th><th>Sessions</th><th>Tasks done</th><th>Task completion</th><th>Reflection</th></tr></thead><tbody id="performanceRows"></tbody></table></div></section>
      <section class="panel weekly-review-card"><div class="daily-section-head"><div><h3>Weekly Review</h3><p>Review your wins, friction and one change for next week.</p></div><span class="badge green" id="weeklyReviewStatus">Not written yet</span></div><div id="weeklyReviewContent" class="weekly-review-content"></div><button class="btn btn-primary" onclick="openWeeklyReviewModal()">Write / update weekly review</button></section>
    </details>
  </section>
  <section class="page" id="page-mistakes">
    <div class="page-hero"><div><h2>Mistake Bank</h2><p>Learn from mistakes. Track, revise and improve.</p></div><button class="btn btn-primary" onclick="openMistakeModal()">＋ Add Mistake</button></div>
    <div class="mistake-stats" id="mistakeStats" hidden></div>
    <div class="mistake-toolbar">
      <select class="control" id="mistakeSubjectFilter" onchange="renderMistakes()"><option value="all">All Subjects</option><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select>
      <select class="control" id="mistakeStatusFilter" onchange="renderMistakes()"><option value="all">All Status</option><option>Needs Review</option><option>Reviewing</option><option>Mastered</option></select>
      <select class="control" id="mistakeTypeFilter" onchange="renderMistakes()"><option value="all">All Error Types</option><option>Concept gap</option><option>Formula recall</option><option>Calculation</option><option>Careless error</option><option>Time pressure</option><option>Misread question</option><option>Guesswork</option><option>Other</option></select>
      <div class="search-wrap"><input class="control search" id="mistakeSearch" placeholder="Search mistakes…" oninput="renderMistakes()"></div>
    </div>
    <div class="mistake-tabs" role="tablist" aria-label="Mistake views">
      <button type="button" class="mistake-tab active" data-mistake-tab="all" onclick="setMistakeTab('all')">All (<span id="mistakeAllCount">0</span>)</button>
      <button type="button" class="mistake-tab" data-mistake-tab="review" onclick="setMistakeTab('review')">To Review (<span id="mistakeReviewCount">0</span>)</button>
      <button type="button" class="mistake-tab" data-mistake-tab="mastered" onclick="setMistakeTab('mastered')">Reviewed (<span id="mistakeMasteredCount">0</span>)</button>
      <button type="button" class="mistake-tab" data-mistake-tab="chapter" onclick="setMistakeTab('chapter')">By Chapter</button>
    </div>
    <details class="mistake-due-details"><summary>Due for review <span class="badge orange" id="mistakeDueBadge">0 due</span></summary><div id="mistakeDueList" class="mistake-due-list"></div></details>
    <div class="table-card mistake-table-card"><div class="table-scroll"><table class="mistake-table"><thead><tr><th>Question / Topic</th><th>Error Type</th><th>Your Notes</th><th>Next Review</th><th>Status</th><th>Actions</th></tr></thead><tbody class="mistake-list" id="mistakeList"></tbody></table></div></div>
  </section>
  `;

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
    const rollover=byId("dailyRolloverNotice");
    if(rollover){
      const currentDate=todayISO(),yesterday=addDays(currentDate,-1),unfinishedYesterday=tasksFor(yesterday).filter(t=>!t.done);
      const isToday=date===currentDate&&unfinishedYesterday.length>0;
      rollover.hidden=!isToday;
      if(isToday&&byId("dailyRolloverText"))byId("dailyRolloverText").textContent=unfinishedYesterday.length+" unfinished task"+(unfinishedYesterday.length===1?"":"s")+" from "+niceDay(yesterday)+". Review the old day or carry them forward without losing the history.";
    }
    const target=Number(state.studyGoals.dailyMinutes)||180,review=dateReview(date);
    const journalStudyTime=byId("journalStudyTime");
    if(journalStudyTime)journalStudyTime.textContent=(minutes/60).toFixed(minutes%60===0?0:1)+"h";
    const journalTaskCount=byId("journalTaskCount");
    if(journalTaskCount)journalTaskCount.textContent=done+" / "+tasks.length;
    const journalSessionCount=byId("journalSessionCount");
    if(journalSessionCount)journalSessionCount.textContent=items.length+" session"+(items.length===1?"":"s");
    const journalTargetLabel=byId("journalTargetLabel");
    if(journalTargetLabel)journalTargetLabel.textContent=minutes+" / "+target+" min";
    const journalTargetFill=byId("journalTargetFill");
    if(journalTargetFill)journalTargetFill.style.width=Math.min(100,Math.round(minutes/target*100))+"%";
    const journalFocusQuality=byId("journalFocusQuality");
    if(journalFocusQuality)journalFocusQuality.textContent=review.focus?"Focus "+review.focus+"/5":"Focus not rated";
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
    const date=(byId("dailyDate")&&byId("dailyDate").value)||todayISO(),sub=currentChapterSubject||"Physics";
    const taskActions=[
      {value:"Study chapter",label:"Study chapter"},
      {value:"Revise chapter",label:"Revise chapter"},
      {value:"Solve PYQs",label:"Solve PYQs"},
      {value:"Take topic test",label:"Take topic test"},
      {value:"Review mistakes",label:"Review mistakes"}
    ];
    const fields=[
      {name:"date",label:"Day",type:"date",value:date,required:true},
      {name:"taskType",label:"What are you doing?",type:"select",value:"Study chapter",options:taskActions},
      {name:"subject",label:"Subject",type:"select",value:sub,options:[{value:"Physics",label:"Physics"},{value:"Chemistry",label:"Chemistry"},{value:"Mathematics",label:"Mathematics"}]},
      {name:"chapter",label:"Choose chapter",type:"select",value:"",options:[{value:"",label:"Choose a chapter…"}].concat(state.chapters.filter(c=>c.subject===sub).map(c=>({value:c.chapter,label:chapterDisplayName(c.subject,c.chapter)})))}
    ];
    openModal("Add a chapter task",fields,{type:"dailyTask"});
  };
  window.openStudySessionModal=function(){
    const date=(byId("dailyDate")&&byId("dailyDate").value)||todayISO(),sub=currentChapterSubject||"Physics";
    const fields=[
      {name:"date",label:"Study date",type:"date",value:date,required:true},
      {name:"kind",label:"Session type",type:"select",value:"Study",options:["Study","Revision","PYQ practice","Topic test","Mock analysis","Doubt clearing"].map(x=>({value:x,label:x}))},
      {name:"subject",label:"Subject",type:"select",value:sub,options:subjectNames.map(x=>({value:x,label:x}))},
      {name:"chapter",label:"Chapter",type:"select",value:"",options:[{value:"",label:"General / multiple chapters"}].concat(state.chapters.filter(c=>c.subject===sub).map(c=>({value:c.chapter,label:chapterDisplayName(c.subject,c.chapter)})))},
      {name:"title",label:"Session title",type:"text",value:"",required:true},
      {name:"hours",label:"Hours",type:"number",value:0,min:0,max:24},
      {name:"minutes",label:"Extra minutes",type:"number",value:45,min:0,max:59},
      {name:"focus",label:"Focus quality",type:"select",value:"3",options:[{value:"1",label:"1 · Distracted"},{value:"2",label:"2 · Uneven"},{value:"3",label:"3 · Okay"},{value:"4",label:"4 · Focused"},{value:"5",label:"5 · Deep focus"}]},
      {name:"notes",label:"What did you learn / what remains?",type:"textarea",value:"",full:true}
    ];
    openModal("Add a study session",fields,{type:"studySession"});
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
  window.setCustomTimerDuration=function(){
    if(timerRunning){toast("Stop the current timer before changing its duration.");return;}
    const hours=Math.max(0,Math.min(24,Number(byId("customTimerHours")&&byId("customTimerHours").value)||0));
    const minutes=Math.max(0,Math.min(59,Number(byId("customTimerMinutes")&&byId("customTimerMinutes").value)||0));
    const total=Math.round(hours*60+minutes);
    if(total<1||total>1440){toast("Choose a duration between 1 minute and 24 hours.");return;}
    timerChosen=total;timerInitial=total*60;paintTimerRing(0);
    byId("focusTimerDisplay").textContent=formatTimerDuration(timerInitial);
    document.querySelectorAll("[data-timer-min]").forEach(b=>b.classList.remove("active"));
    const footnote=byId("timerFootnote");if(footnote)footnote.textContent="Custom focus block · "+Math.floor(total/60)+"h "+(total%60)+"m. Ready when you are.";
    const details=byId("timerOptionsDetails");if(details)details.open=false;
    toast("Custom timer set.");
  };
  window.setTimerPreset=function(min){
    if(timerRunning){toast("Stop the current timer before changing its duration.");return;}
    timerChosen=min;timerInitial=min*60;paintTimerRing(0);byId("focusTimerDisplay").textContent=formatTimerDuration(timerInitial);
    document.querySelectorAll("[data-timer-min]").forEach(b=>b.classList.toggle("active",Number(b.dataset.timerMin)===min));
  };
  function paintTimerRing(progressDeg){
    const ring=byId("focusTimerRing");if(!ring)return;
    const progress=Math.max(0,Math.min(360,Number(progressDeg)||0));
    ring.style.background="conic-gradient(from -90deg,#15966a 0deg,#44bd91 "+progress+"deg,#dff2e8 "+progress+"deg 360deg)";
  }
  function formatTimerDuration(totalSeconds){
    const total=Math.max(0,Math.ceil(Number(totalSeconds)||0));
    if(total>=3600){
      const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
      return String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
    }
    const minutes=Math.floor(total/60),seconds=total%60;
    return String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
  }
  function drawTimer(){
    const secs=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));
    byId("focusTimerDisplay").textContent=formatTimerDuration(secs);
    paintTimerRing(Math.round((1-secs/Math.max(1,timerInitial))*360));
    if(secs<=0){finishTimer(true);}
  }
  function finishTimer(completed){
    if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
    timerRunning=false;const elapsed=Math.max(0,Math.round((Date.now()-timerStarted)/60000));
    byId("timerStartButton").textContent="Start";byId("timerFootnote").textContent=completed?"Focus block complete — added to your study log.":"Timer stopped.";
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
  window.resetFocusTimer=function(){if(timerRunning){toast("Stop the timer before resetting it.");return;}if(timerInterval)clearInterval(timerInterval);timerInitial=timerChosen*60;paintTimerRing(0);byId("focusTimerDisplay").textContent=formatTimerDuration(timerInitial);byId("timerFootnote").textContent="Timer reset. Ready when you are.";};
  window.openWeeklyReviewModal=function(){
    const start=addDays(todayISO(),-((new Date(todayISO()+"T12:00:00").getDay()+6)%7)),old=state.weeklyReviews.find(x=>x.weekStart===start)||{};
    openModal("Weekly review · week of "+niceDay(start),[{name:"wins",label:"What went well this week?",type:"textarea",value:old.wins||"",full:true},{name:"friction",label:"What wasted time or felt difficult?",type:"textarea",value:old.friction||"",full:true},{name:"learned",label:"What did you learn about your study habits?",type:"textarea",value:old.learned||"",full:true},{name:"next",label:"One adjustment for next week",type:"textarea",value:old.next||"",full:true}],{type:"weeklyReview",weekStart:start});
  };
  window.setPerformanceRange=function(days){
    const node=byId("performanceRange");if(node)node.value=String(days);
    document.querySelectorAll("[data-performance-range]").forEach(button=>button.classList.toggle("active",Number(button.dataset.performanceRange)===Number(days)));
    renderPerformance();
  };
  window.togglePerformanceGoalsEditor=function(){
    const details=byId("performanceGoalsEditor");if(details)details.open=!details.open;
  };
  window.saveStudyGoals=function(){
    const daily=Math.max(15,Math.min(900,Number(byId("performanceGoalDaily").value)||300)),days=Math.max(3,Math.min(7,Number(byId("performanceGoalDays").value)||6));
    const weeklyTopicTests=Math.max(1,Math.min(30,Number(byId("performanceGoalTopics")&&byId("performanceGoalTopics").value)||3));
    const weeklyPyqQuestions=Math.max(10,Math.min(5000,Number(byId("performanceGoalPyqs")&&byId("performanceGoalPyqs").value)||500));
    state.studyGoals={...(state.studyGoals||{}),dailyMinutes:daily,weeklyDays:days,weeklyTopicTests:weeklyTopicTests,weeklyPyqQuestions:weeklyPyqQuestions};
    saveState();renderPerformance();renderDailyLog();toast("Study targets saved.");
  };
  window.renderPerformance=function(){
    ensure();const range=Math.max(7,Math.min(30,Number(byId("performanceRange").value)||7)),today=todayISO(),start=addDays(today,-(range-1)),prevStart=addDays(start,-range),prevEnd=addDays(start,-1),days=[];
    byId("performanceGoalDaily").value=state.studyGoals.dailyMinutes||300;byId("performanceGoalDays").value=String(state.studyGoals.weeklyDays||6);if(byId("performanceGoalTopics"))byId("performanceGoalTopics").value=String(state.studyGoals.weeklyTopicTests||3);if(byId("performanceGoalPyqs"))byId("performanceGoalPyqs").value=String(state.studyGoals.weeklyPyqQuestions||500);
    for(let i=0;i<range;i++)days.push(addDays(start,i));
    const logs=state.studySessions.filter(s=>s.date>=start&&s.date<=today),mins=sum(logs),activeDays=unique(logs.filter(s=>Number(s.minutes)>0).map(s=>s.date)).length,tasksIn=state.dailyTasks.filter(t=>t.date>=start&&t.date<=today),tasksDone=tasksIn.filter(t=>t.done).length,taskPct=tasksIn.length?pct(tasksDone,tasksIn.length):0;
    const previous=state.studySessions.filter(s=>s.date>=prevStart&&s.date<=prevEnd),prevMins=sum(previous),prevDays=unique(previous.filter(s=>Number(s.minutes)>0).map(s=>s.date)).length;
    const streakCursor=new Date(today+"T12:00:00");
    let currentStreak=0;
    if(!isStudyDay(today))streakCursor.setDate(streakCursor.getDate()-1);
    const currentDayKey=streakCursor.toISOString().slice(0,10);
    let streakDate=currentDayKey;
    while(currentStreak<366&&isStudyDay(streakDate)){currentStreak++;streakDate=addDays(streakDate,-1);}
    const kpis=[["Total Study Time",(mins/60).toFixed(1)+"h",range+" day window"],["Average per Day",(mins/range/60).toFixed(1)+"h","Tracked daily average"],["Tasks Completed",tasksDone+" / "+tasksIn.length,tasksIn.length?taskPct+"% completion":"No tasks planned"],["Study Streak",currentStreak+" day"+(currentStreak===1?"":"s"),"Consecutive study days"]];
    byId("performanceKpis").innerHTML=kpis.map((x,i)=>'<div class="performance-kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>').join("");
    document.querySelectorAll("[data-performance-range]").forEach(button=>button.classList.toggle("active",Number(button.dataset.performanceRange)===range));
    const weekDateStart=addDays(today,-6),weekDateEnd=today;
    const topicTarget=Number(state.studyGoals.weeklyTopicTests)||3,pyqTarget=Number(state.studyGoals.weeklyPyqQuestions)||500;
    const recentTopics=(state.topics||[]).filter(t=>t.status==="Attempted"&&String(t.actualDate||"")>=weekDateStart&&String(t.actualDate||"")<=weekDateEnd).length;
    const recentPyqQuestions=(state.pyqs||[]).filter(p=>String(p.date||"")>=weekDateStart&&String(p.date||"")<=weekDateEnd).reduce((n,p)=>n+(Number(p.attempted)||0),0);
    const dailyGoal=Number(state.studyGoals.dailyMinutes)||300,weeklyGoalDays=Number(state.studyGoals.weeklyDays)||6;
    const sevenDays=Array.from({length:7},(_,i)=>addDays(today,i-6));
    const recentStudyDays=sevenDays.filter(d=>isStudyDay(d)).length;
    const goalRows=[
      ["Daily Study Target",Math.round(mins/range)+" / "+dailyGoal+" min",Math.min(100,Math.round((mins/range)/dailyGoal*100)),"Average per day"],
      ["Weekly Study Days",recentStudyDays+" / "+weeklyGoalDays+" days",Math.min(100,Math.round(recentStudyDays/weeklyGoalDays*100)),"Days with completed tasks or logged study"],
      ["Topic Tests",recentTopics+" / "+topicTarget,Math.min(100,Math.round(recentTopics/topicTarget*100)),"Attempted in the last 7 days"],
      ["PYQs Solved",recentPyqQuestions+" / "+pyqTarget,Math.min(100,Math.round(recentPyqQuestions/pyqTarget*100)),"Questions logged in the last 7 days"]
    ];
    if(byId("performanceGoalsSummary"))byId("performanceGoalsSummary").innerHTML=goalRows.map((g,i)=>'<div class="performance-goal-row"><div class="performance-goal-row-head"><strong>'+g[0]+'</strong><span>'+g[1]+'</span></div><div class="progress-track"><div class="progress-fill" style="width:'+g[2]+'%;--subject:'+(i===1?"#2784d8":"#15966a")+'"></div></div><small>'+g[3]+'</small></div>').join("");
    const max=Math.max(30,...days.map(d=>dayMinutes(d)));
    byId("minutesChart").innerHTML=days.map(d=>{const m=dayMinutes(d),height=Math.max(m?5:2,Math.round(m/max*100));return '<div class="chart-column"><div class="chart-value">'+(m?m:"")+'</div><div class="chart-track" title="'+escapeAttr(niceDay(d)+": "+m+" minutes")+'"><div class="chart-bar '+(d===today?"is-today":"")+'" style="height:'+height+'%"></div></div><small>'+new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"}).slice(0,2)+'</small><span>'+new Date(d+"T12:00:00").getDate()+'</span></div>'}).join("");
    byId("minutesChartHint").textContent=mins+" minutes logged across "+activeDays+" active day(s).";
    const bySubject=subjectNames.map(s=>({name:s,minutes:sum(logs.filter(x=>x.subject===s)),color:chapterColor(s)})),subjectTotal=sum(bySubject);
    byId("subjectTimeBreakdown").innerHTML=bySubject.map(s=>'<div class="subject-time-row"><div class="subject-time-top"><span><i style="background:'+s.color+'"></i>'+s.name+'</span><strong>'+s.minutes+' min</strong></div><div class="progress-track"><div class="progress-fill" style="width:'+pct(s.minutes,subjectTotal)+'%;--subject:'+s.color+'"></div></div><small>'+pct(s.minutes,subjectTotal)+'% of logged time</small></div>').join("")+(subjectTotal?'':'<p class="helper-note">Log a study session to begin seeing your subject split.</p>');
    const diff=mins-prevMins,delta=prevMins?pct(Math.abs(diff),prevMins):0,dir=diff>0?"more":diff<0?"less":"the same amount of";
    const studyStreak=currentStreak;
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

  function mistakeDue(m){return m.status!=="Mastered"&&m.reviewDate&&m.reviewDate<=todayISO();}
  function renderMistakeRow(m){
    const due=mistakeDue(m);
    const chapter=m.chapter?chapterDisplayName(m.subject,m.chapter):"";
    const note=String(m.takeaway||m.reason||m.prompt||"No review note yet.");
    const status=m.status||"Needs Review";
    const statusOptions=["Needs Review","Reviewing","Mastered"].map(x=>'<option '+(status===x?'selected':'')+'>'+x+'</option>').join("");
    return '<tr class="mistake-table-row '+(due?'is-due':'')+'">'+
      '<td class="mistake-title-cell"><strong>'+escapeHTML(m.title||"Untitled mistake")+'</strong><small>'+escapeHTML(m.subject||"General")+(chapter?' · '+escapeHTML(chapter):'')+'</small></td>'+
      '<td><span class="mistake-type-pill type-'+escapeHTML(String(m.errorType||"Concept gap").toLowerCase().replace(/[^a-z]+/g,"-"))+'">'+escapeHTML(m.errorType||"Concept gap")+'</span></td>'+
      '<td class="mistake-notes-cell">'+escapeHTML(note.length>110?note.slice(0,107)+"…":note)+'</td>'+
      '<td class="mistake-review-date">'+(status==="Mastered"?"—":escapeHTML(niceDay(m.reviewDate||addDays(todayISO(),1))))+(due?'<small>Due now</small>':'')+'</td>'+
      '<td><select class="mistake-status-chip '+(status==="Mastered"?"mastered":status==="Reviewing"?"reviewing":"to-review")+'" aria-label="Mistake review status" onchange="quickMistakeStatus(\''+escapeAttr(m.id)+'\',this.value)">'+statusOptions+'</select></td>'+
      '<td><div class="mistake-row-actions"><button class="mistake-edit-btn" type="button" onclick="openMistakeModal(\''+escapeAttr(m.id)+'\')">Edit</button><button class="mistake-delete-btn" type="button" onclick="deleteMistake(\''+escapeAttr(m.id)+'\')">×</button></div></td>'+
    '</tr>';
  }
  window.setMistakeTab=function(tab){
    activeMistakeTab=["all","review","mastered","chapter"].includes(tab)?tab:"all";
    document.querySelectorAll("[data-mistake-tab]").forEach(button=>button.classList.toggle("active",button.dataset.mistakeTab===activeMistakeTab));
    const status=byId("mistakeStatusFilter");
    if(status)status.value="all";
    renderMistakes();
  };

  window.openMistakeModal=function(id){
    const old=id?state.studyMistakes.find(m=>m.id===id):null,sub=old&&old.subject||currentChapterSubject,chapterOpts=state.chapters.filter(c=>c.subject===sub);
    openModal(old?"Edit mistake":"Log a mistake for review",[
      {name:"date",label:"Date noticed",type:"date",value:old&&old.date||todayISO(),required:true},
      {name:"subject",label:"Subject",type:"select",value:sub,options:[{value:"General",label:"General"}].concat(subjectNames.map(x=>({value:x,label:x})))},
      {name:"chapter",label:"Chapter",type:"select",value:old&&old.chapter||"",options:[{value:"",label:"No chapter"}].concat(chapterOpts.map(c=>({value:c.chapter,label:chapterDisplayName(c.subject,c.chapter)})))},
      {name:"errorType",label:"Type of mistake",type:"select",value:old&&old.errorType||"Concept gap",options:["Concept gap","Formula recall","Calculation","Careless error","Time pressure","Misread question","Guesswork","Other"].map(x=>({value:x,label:x}))},
      {name:"title",label:"Question / concept name",type:"text",value:old&&old.title||"",required:true,full:true},
      {name:"prompt",label:"Question or source (optional)",type:"textarea",value:old&&old.prompt||"",full:true},
      {name:"reason",label:"Why did I get it wrong?",type:"textarea",value:old&&old.reason||"",full:true},
      {name:"takeaway",label:"Correct idea to remember",type:"textarea",value:old&&old.takeaway||"",full:true},
      {name:"reviewDate",label:"Next review date",type:"date",value:old&&old.reviewDate||addDays(todayISO(),1),required:true},
      {name:"status",label:"Review status",type:"select",value:old&&old.status||"Needs Review",options:["Needs Review","Reviewing","Mastered"].map(x=>({value:x,label:x}))}
    ],{type:"mistake",id:id||null});
    const subInput=document.querySelector('#modalFields [name="subject"]');
    if(subInput)subInput.addEventListener("change",function(){
      const selected=this.value,chapter=byId("modalFields").querySelector('[name="chapter"]'),opts=state.chapters.filter(c=>c.subject===selected);
      if(chapter)chapter.innerHTML='<option value="">No chapter</option>'+opts.map(c=>'<option value="'+escapeAttr(c.chapter)+'">'+escapeHTML(chapterDisplayName(c.subject,c.chapter))+'</option>').join("");
    });
  };
  window.quickMistakeStatus=function(id,status){
    const m=state.studyMistakes.find(x=>x.id===id);if(!m)return;m.status=status;
    if(status==="Mastered")m.reviewDate="";
    else if(status==="Reviewing")m.reviewDate=addDays(todayISO(),3);
    else if(status==="Needs Review"&&(!m.reviewDate||m.reviewDate<todayISO()))m.reviewDate=todayISO();
    saveState();renderMistakes();toast(status==="Mastered"?"Mistake marked mastered.":"Next review updated.");
  };
  window.deleteMistake=function(id){if(!confirm("Delete this mistake entry?"))return;state.studyMistakes=state.studyMistakes.filter(x=>x.id!==id);saveState();renderMistakes();toast("Mistake removed.");};
  window.renderMistakes=function(){
    ensure();
    const all=state.studyMistakes||[];
    const f=byId("mistakeStatusFilter").value;
    const sub=byId("mistakeSubjectFilter").value;
    const type=byId("mistakeTypeFilter")?byId("mistakeTypeFilter").value:"all";
    const q=byId("mistakeSearch").value.toLowerCase().trim();
    const due=all.filter(m=>mistakeDue(m)).sort((a,b)=>String(a.reviewDate).localeCompare(String(b.reviewDate)));
    byId("mistakeStats").innerHTML=[["Mistakes logged",all.length],["Due for review",due.length],["Being reviewed",all.filter(m=>m.status==="Reviewing").length],["Mastered",all.filter(m=>m.status==="Mastered").length]].map((x,i)=>'<div class="daily-stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><div class="daily-stat-foot"><span>'+(i===0?"Every error becomes useful data":i===1?"Date arrived or passed":i===2?"Keep practising recall":"Cleared from the queue")+'</span></div></div>').join("");
    if(byId("mistakeAllCount"))byId("mistakeAllCount").textContent=all.length;
    if(byId("mistakeReviewCount"))byId("mistakeReviewCount").textContent=all.filter(m=>m.status!=="Mastered").length;
    if(byId("mistakeMasteredCount"))byId("mistakeMasteredCount").textContent=all.filter(m=>m.status==="Mastered").length;
    byId("mistakeDueBadge").textContent=due.length+" due";
    byId("mistakeDueList").innerHTML=due.slice(0,5).map(m=>'<div class="due-mistake-row"><div><strong>'+escapeHTML(m.title)+'</strong><small>'+escapeHTML(m.subject||"General")+(m.chapter?' · '+escapeHTML(chapterDisplayName(m.subject,m.chapter)):'')+' · '+niceDay(m.reviewDate)+'</small></div><button class="btn btn-quiet" onclick="quickMistakeStatus(\''+escapeAttr(m.id)+'\',\'Reviewing\')">Review now ↗</button></div>').join("")||'<div class="empty">Nothing is due right now. Log a mistake after your next test, then revisit it on its scheduled date.</div>';
    let items=all.filter(m=>{
      const matchesStatus=f==="all"||m.status===f;
      const matchesTab=activeMistakeTab==="all"||(activeMistakeTab==="review"&&m.status!=="Mastered")||(activeMistakeTab==="mastered"&&m.status==="Mastered")||activeMistakeTab==="chapter";
      const matchesSubject=sub==="all"||m.subject===sub;
      const matchesType=type==="all"||m.errorType===type;
      const haystack=(String(m.title)+" "+String(m.prompt)+" "+String(m.reason)+" "+String(m.takeaway)+" "+String(m.subject)+" "+String(m.chapter)).toLowerCase();
      return matchesStatus&&matchesTab&&matchesSubject&&matchesType&&haystack.includes(q);
    });
    if(activeMistakeTab==="chapter")items.sort((a,b)=>(String(a.subject)+" "+String(a.chapter)).localeCompare(String(b.subject)+" "+String(b.chapter)));
    else items.sort((a,b)=>String(a.reviewDate||"9999").localeCompare(String(b.reviewDate||"9999")));
    byId("mistakeList").innerHTML=items.map(renderMistakeRow).join("")||'<tr><td colspan="6"><div class="empty">No mistakes match these filters. Add a mistake after your next test or PYQ session.</div></td></tr>';
  };

  window.renderRevisionQueue=function(){
    const holder=byId("revisionQueue");if(!holder)return;
    const mistakes=(state.studyMistakes||[]).filter(m=>mistakeDue(m)).slice(0,3).map(m=>({title:m.title,sub:"Mistake review · "+(m.subject||"General"),subject:m.subject,chapter:m.chapter,id:m.id,kind:"mistake"}));
    const weak=(state.chapters||[]).filter(c=>c.prep==="Needs Work"||(!c.topicAttempted&&c.prep==="In Progress")).sort((a,b)=>(a.prep==="Needs Work"?0:1)-(b.prep==="Needs Work"?0:1)).slice(0,4).map(c=>({title:chapterDisplayName(c.subject,c.chapter),sub:c.subject+" · "+(c.prep==="Needs Work"?"Marked needs work":"No topic test yet"),subject:c.subject,chapter:c.chapter,kind:"chapter"}));
    const queue=mistakes.concat(weak).slice(0,6);byId("revisionQueueCount").textContent=queue.length+" items";
    holder.innerHTML=queue.map(x=>'<div class="revision-queue-item"><div><strong>'+escapeHTML(x.title)+'</strong><small>'+escapeHTML(x.sub)+'</small></div><button class="small-btn" onclick="addQueueItemToToday(\''+escapeAttr(x.kind)+'\',\''+escapeAttr(x.id||"")+'\',\''+escapeAttr(x.subject||"")+'\',\''+escapeAttr(x.chapter||"")+'\')">Add to today ＋</button></div>').join("")||'<div class="empty">No urgent revisions found. Keep logging sessions and mistakes to build a helpful queue.</div>';
  };
  window.addQueueItemToToday=function(kind,id,subject,chapter){
    const date=todayISO();let title;
    if(kind==="mistake"){const m=state.studyMistakes.find(x=>x.id===id);if(!m)return;title="Review mistake: "+m.title;}
    else title="Revise chapter: "+chapterDisplayName(subject,chapter);
    if(state.dailyTasks.some(t=>t.date===date&&t.title===title)){toast("That item is already on today's plan.");return;}
    state.dailyTasks.push({id:"task-"+Date.now(),date:date,title:title,subject:subject||"General",chapter:chapter||"",estimate:30,priority:"High",done:false,completedAt:"",createdAt:new Date().toISOString()});
    saveState();go("daily");byId("dailyDate").value=todayISO();renderDailyLog();toast("Added to today's plan.");
  };

  function renderNotes(){
    if(!byId("notesList"))return;
    const notes=Array.isArray(state.notes)?state.notes:[];
    const query=(byId("notesSearch")&&byId("notesSearch").value||"").toLowerCase().trim();
    const subject=byId("notesFilterSubject")?byId("notesFilterSubject").value:"all";
    const items=notes.filter(note=>(subject==="all"||note.subject===subject)&&(String(note.title)+" "+String(note.body)+" "+String(note.subject)).toLowerCase().includes(query)).sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")));
    if(byId("notesCount"))byId("notesCount").textContent=notes.length;
    byId("notesList").innerHTML=items.map(note=>'<article class="study-note-card"><div class="study-note-head"><div><strong>'+escapeHTML(note.title||"Untitled note")+'</strong><small>'+escapeHTML(note.subject||"General")+' · '+escapeHTML(niceDay(String(note.updatedAt||note.createdAt||todayISO()).slice(0,10)))+'</small></div><div class="study-note-actions"><button type="button" class="small-btn" onclick="editStudyNote(\''+escapeAttr(note.id)+'\')">Edit</button><button type="button" class="small-btn" onclick="deleteStudyNote(\''+escapeAttr(note.id)+'\')">Delete</button></div></div><p>'+escapeHTML(note.body||"").replace(/\n/g,"<br>")+'</p></article>').join("")||'<div class="empty notes-empty">No notes saved yet. Add a formula, doubt or concept to start your notebook.</div>';
  }
  window.renderNotes=renderNotes;
  window.saveStudyNote=function(){
    const title=(byId("noteTitle").value||"").trim(),bodyText=(byId("noteBody").value||"").trim(),subject=byId("noteSubject").value||"General",editId=byId("noteEditId").value;
    if(!title||!bodyText){toast("Add a title and the note text first.");return;}
    const now=new Date().toISOString();
    if(editId){
      const old=state.notes.find(note=>note.id===editId);
      if(old)Object.assign(old,{title:title,body:bodyText,subject:subject,updatedAt:now});
    }else state.notes.unshift({id:"note-"+Date.now(),title:title,body:bodyText,subject:subject,createdAt:now,updatedAt:now});
    byId("noteTitle").value="";byId("noteBody").value="";byId("noteEditId").value="";byId("noteEditorTitle").textContent="New note";byId("saveNoteButton").textContent="Save note";
    saveState();renderNotes();toast(editId?"Note updated.":"Note saved.");
  };
  window.editStudyNote=function(id){
    const note=state.notes.find(item=>item.id===id);if(!note)return;
    byId("noteEditId").value=note.id;byId("noteTitle").value=note.title||"";byId("noteBody").value=note.body||"";byId("noteSubject").value=note.subject||"General";byId("noteEditorTitle").textContent="Edit note";byId("saveNoteButton").textContent="Update note";
    byId("noteTitle").focus();window.scrollTo({top:0,behavior:"smooth"});
  };
  window.cancelStudyNoteEdit=function(){
    byId("noteEditId").value="";byId("noteTitle").value="";byId("noteBody").value="";byId("noteSubject").value="General";byId("noteEditorTitle").textContent="New note";byId("saveNoteButton").textContent="Save note";
  };
  window.deleteStudyNote=function(id){
    if(!confirm("Delete this study note?"))return;
    state.notes=state.notes.filter(item=>item.id!==id);saveState();renderNotes();toast("Note deleted.");
  };
  function renderGoals(){
    if(!byId("habitsList"))return;
    const goals=state.studyGoals||{},today=todayISO(),minutes=dayMinutes(today),dailyGoal=Number(goals.dailyMinutes)||300,daysGoal=Number(goals.weeklyDays)||6,topicGoal=Number(goals.weeklyTopicTests)||3,pyqGoal=Number(goals.weeklyPyqQuestions)||500;
    const weekStart=addDays(today,-6),weekDays=Array.from({length:7},(_,i)=>addDays(today,i-6));
    const studyDays=weekDays.filter(day=>isStudyDay(day)).length;
    const topics=(state.topics||[]).filter(t=>t.status==="Attempted"&&String(t.actualDate||"")>=weekStart&&String(t.actualDate||"")<=today).length;
    const pyqs=(state.pyqs||[]).filter(p=>String(p.date||"")>=weekStart&&String(p.date||"")<=today).reduce((n,p)=>n+(Number(p.attempted)||0),0);
    byId("goalTodayStudyTime").textContent=(minutes/60).toFixed(minutes%60===0?0:1)+"h";
    byId("goalTodayStudyTarget").textContent="Target · "+(dailyGoal/60).toFixed(dailyGoal%60===0?0:1)+"h";
    byId("goalTodayProgressBar").style.width=Math.min(100,Math.round(minutes/dailyGoal*100))+"%";
    byId("goalWeeklyStudyDays").textContent=studyDays+" / "+daysGoal;
    byId("goalWeeklyDaysBar").style.width=Math.min(100,Math.round(studyDays/daysGoal*100))+"%";
    byId("goalTopicTestsDone").textContent=topics+" / "+topicGoal;
    byId("goalTopicTestsBar").style.width=Math.min(100,Math.round(topics/topicGoal*100))+"%";
    byId("goalPyqDone").textContent=pyqs+" / "+pyqGoal;
    byId("goalPyqBar").style.width=Math.min(100,Math.round(pyqs/pyqGoal*100))+"%";
    if(byId("goalDailyMinutes"))byId("goalDailyMinutes").value=String(dailyGoal);
    if(byId("goalWeeklyDays"))byId("goalWeeklyDays").value=String(daysGoal);
    if(byId("goalWeeklyTopicTests"))byId("goalWeeklyTopicTests").value=String(topicGoal);
    if(byId("goalWeeklyPyqQuestions"))byId("goalWeeklyPyqQuestions").value=String(pyqGoal);
    const habits=Array.isArray(state.habits)?state.habits:[];
    const logs=state.habitLogs&&state.habitLogs[today]?state.habitLogs[today]:{};
    const done=habits.filter(h=>Boolean(logs[h.id])).length;
    byId("habitsTodayCount").textContent=done+" / "+habits.length+" done";
    byId("habitsList").innerHTML=habits.map(h=>'<div class="habit-row"><label class="habit-label"><input type="checkbox" '+(logs[h.id]?"checked":"")+' onchange="toggleStudyHabit(\''+escapeAttr(h.id)+'\',this.checked)"><span class="habit-checkmark">✓</span><span class="habit-text"><strong>'+escapeHTML(h.title)+'</strong><small>'+escapeHTML(h.category||"Daily habit")+'</small></span></label><button type="button" class="mini-delete" title="Delete habit" onclick="deleteStudyHabit(\''+escapeAttr(h.id)+'\')">×</button></div>').join("")||'<div class="empty">Add one small habit to begin.</div>';
  }
  window.renderGoals=renderGoals;
  window.toggleStudyHabit=function(id,checked){
    const today=todayISO();if(!state.habitLogs)state.habitLogs={};if(!state.habitLogs[today])state.habitLogs[today]={};state.habitLogs[today][id]=Boolean(checked);saveState();renderGoals();
  };
  window.addStudyHabit=function(){
    const node=byId("newHabitTitle"),title=(node.value||"").trim();if(!title){toast("Give the habit a short name first.");return;}
    state.habits.push({id:"habit-"+Date.now(),title:title,category:"Daily habit"});node.value="";saveState();renderGoals();toast("Habit added.");
  };
  window.deleteStudyHabit=function(id){
    if(!confirm("Delete this habit?"))return;state.habits=state.habits.filter(h=>h.id!==id);Object.keys(state.habitLogs||{}).forEach(date=>{if(state.habitLogs[date])delete state.habitLogs[date][id];});saveState();renderGoals();toast("Habit deleted.");
  };
  window.saveGoalSettings=function(){
    const daily=Math.max(15,Math.min(900,Number(byId("goalDailyMinutes").value)||300)),days=Math.max(3,Math.min(7,Number(byId("goalWeeklyDays").value)||6)),topics=Math.max(1,Math.min(30,Number(byId("goalWeeklyTopicTests").value)||3)),pyqs=Math.max(10,Math.min(5000,Number(byId("goalWeeklyPyqQuestions").value)||500));
    state.studyGoals={...(state.studyGoals||{}),dailyMinutes:daily,weeklyDays:days,weeklyTopicTests:topics,weeklyPyqQuestions:pyqs};
    saveState();renderGoals();renderPerformance();renderDailyLog();toast("Goals and targets saved.");
  };
  window.renderAllProductivity=function(){renderDailyLog();renderPerformance();renderMistakes();renderNotes();renderGoals();window.renderDailyPulse();window.renderRevisionQueue();};
  /* Preserve the original app handlers and route extra work through the same save/cloud layer. */
  const originalSaveState=saveState;
  saveState=function(){originalSaveState();if(byId("page-daily"))renderDailyLog();if(byId("page-performance"))renderPerformance();if(byId("page-mistakes"))renderMistakes();if(byId("page-notes"))renderNotes();if(byId("page-goals"))renderGoals();if(typeof renderDashboard==="function")renderDashboard();window.renderDailyPulse();window.renderRevisionQueue();};
  const originalRenderDashboard=renderDashboard;
  renderDashboard=function(){originalRenderDashboard();window.renderDailyPulse();};
  const originalGo=go;
  go=function(page){
    if(page!=="daily"&&page!=="performance"&&page!=="mistakes"&&page!=="notes"&&page!=="goals")return originalGo(page);
    currentPage=page;
    document.querySelectorAll(".page").forEach(n=>n.classList.toggle("active",n.id==="page-"+page));
    document.querySelectorAll("nav [data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const title=page==="daily"?["YOUR DAY","Daily Study Journal","Log what you studied and build consistency."]:page==="performance"?["YOUR PROGRESS","Performance Studio","Analyse progress, goals and study patterns."]:page==="mistakes"?["ERROR REVIEW","Mistake Bank","Learn from mistakes, track and revise."]:page==="notes"?["YOUR NOTES","Notes","Save formulas, doubts and useful reminders."]:["YOUR HABITS","Goals & Habits","Set goals and build small daily habits."];
    byId("pageCrumb").textContent=title[0];byId("pageTitle").textContent=title[1];byId("pageSubtitle").textContent=title[2];
    window.scrollTo({top:0,behavior:"smooth"});
    if(page==="daily")renderDailyLog();else if(page==="performance")renderPerformance();else if(page==="mistakes")renderMistakes();else if(page==="notes")renderNotes();else renderGoals();
  };
  const originalSaveModal=saveModal;
  saveModal=function(e){
    if(!modalContext||!["studySession","dailyTask","weeklyReview","mistake"].includes(modalContext.type))return originalSaveModal(e);
    e.preventDefault();const v=valuesFromForm(),ctx=modalContext;
    if(ctx.type==="studySession"){
      const hours=Math.max(0,Number(v.hours)||0),extraMinutes=Math.max(0,Number(v.minutes)||0),mins=Math.round(hours*60+extraMinutes);
      if(!v.title.trim()||!Number.isFinite(mins)||mins<1||mins>1440){toast("Add a session title and a duration between 1 minute and 24 hours.");return;}
      state.studySessions.unshift({id:"session-"+Date.now(),date:v.date||todayISO(),kind:v.kind||"Study",subject:v.subject||"General",chapter:v.chapter||"",title:v.title.trim(),minutes:mins,focus:Number(v.focus)||3,notes:v.notes||"",createdAt:new Date().toISOString()});
    }else if(ctx.type==="dailyTask"){
      const action=v.taskType||"Study chapter",subject=v.subject||"General",chapter=v.chapter||"",custom=(v.customTitle||"").trim();
      const chapterLabel=chapter?chapterDisplayName(subject,chapter):"";
      if(!chapter&&["Study chapter","Revise chapter","Solve PYQs","Take topic test","Review mistakes"].includes(action)){toast("Choose a subject and chapter first. You can select it from the chapter list.");return;}
      const title=action+(chapterLabel?": "+chapterLabel:(" · "+subject));
      state.dailyTasks.push({id:"task-"+Date.now(),date:v.date||todayISO(),title:title,taskType:action,subject:subject,chapter:chapter,estimate:45,priority:"Normal",done:false,completedAt:"",createdAt:new Date().toISOString()});
    }else if(ctx.type==="mistake"){
      const old=ctx.id?state.studyMistakes.find(x=>x.id===ctx.id):null;
      const record={id:old?old.id:"mistake-"+Date.now(),date:v.date||todayISO(),subject:v.subject||"General",chapter:v.chapter||"",errorType:v.errorType||"Concept gap",title:(v.title||"").trim(),prompt:v.prompt||"",reason:v.reason||"",takeaway:v.takeaway||"",reviewDate:v.status==="Mastered"?"":(v.reviewDate||addDays(todayISO(),1)),status:v.status||"Needs Review",updatedAt:new Date().toISOString()};
      if(!record.title){toast("Give this mistake a short, recognizable name.");return;}
      if(old)Object.assign(old,record);else state.studyMistakes.unshift(record);
    }else{
      const record={weekStart:ctx.weekStart,wins:v.wins||"",friction:v.friction||"",learned:v.learned||"",next:v.next||"",updatedAt:new Date().toISOString()};
      const i=state.weeklyReviews.findIndex(x=>x.weekStart===ctx.weekStart);if(i<0)state.weeklyReviews.unshift(record);else state.weeklyReviews[i]=record;
    }
    closeModal();saveState();toast(ctx.type==="studySession"?"Study session logged.":ctx.type==="dailyTask"?"Task added to your plan.":ctx.type==="mistake"?"Mistake saved to your review queue.":"Weekly review saved.");
  };
  /* Wire cross-subject chapter pickers after the base modal has rendered. */
  document.getElementById("modalForm").addEventListener("change",function(e){
    if(!e.target.matches('#modalFields [name="subject"]'))return;
    const sub=e.target.value,chapter=byId("modalFields").querySelector('[name="chapter"]');if(!chapter)return;
    const picked=chapter.value,opts=state.chapters.filter(c=>c.subject===sub);
    chapter.innerHTML='<option value="">General / multiple chapters</option>'+opts.map(c=>'<option value="'+escapeAttr(c.chapter)+'">'+escapeHTML(chapterDisplayName(c.subject,c.chapter))+'</option>').join("");
    if(opts.some(c=>c.chapter===picked))chapter.value=picked;
  });
  byId("dailyDate").value=todayISO();updateTimerChapters();paintTimerRing(0);
  /* Daily review prompt: gently surface the previous day without blocking the workspace. */
  const reviewDate=sessionStorage.getItem("ps-v6-last-open-date");
  if(reviewDate!==todayISO()){
    const y=addDays(todayISO(),-1),hasYesterday=sessionsFor(y).length||tasksFor(y).length;
    if(hasYesterday){byId("pulseYesterdayTitle").textContent="Yesterday’s recap is ready";byId("pulseYesterdayMeta").textContent="Review your sessions, completed tasks and reflection before planning today.";}
    try{sessionStorage.setItem("ps-v6-last-open-date",todayISO());}catch(e){}
  }
  renderAllProductivity();
  if(typeof renderDashboard==="function")renderDashboard();

  /* If the tab stays open across midnight, move today's view forward and refresh the rollover notice. */
  let observedLocalDate=todayISO();
  window.setInterval(function(){
    const nextDate=todayISO();
    if(nextDate===observedLocalDate)return;
    const previousDate=observedLocalDate;
    observedLocalDate=nextDate;
    const dailyDateInput=byId("dailyDate");
    if(dailyDateInput&&dailyDateInput.value===previousDate)dailyDateInput.value=nextDate;
    renderDailyLog();
    renderPerformance();
    renderMistakes();
    renderGoals();
    window.renderDailyPulse();
    window.renderRevisionQueue();
    if(typeof renderDashboard==="function")renderDashboard();
  },30000);
})();
