/* Personal Space V6 — Edge interactions.
 * No framework, no external service, no tracking. Preferences stay in this browser.
 */
(function () {
  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const STORAGE = {
    theme: "ps-v6-edge-theme-v3",
    motion: "ps-v6-edge-motion",
    focus: "ps-v6-edge-focus-mode"
  };
  const THEMES = ["aurora", "ultraviolet", "daylight"];
  const THEME_LABELS = {
    aurora: "Aurora neon",
    ultraviolet: "Ultraviolet",
    daylight: "Daylight"
  };
  const ICONS = {
    dashboard: "⌂",
    chapters: "▤",
    topic: "◷",
    litmus: "▦",
    pyq: "✎",
    daily: "◉",
    performance: "↗",
    mistakes: "⌁",
    notes: "▤",
    goals: "◎",
    theme: "◐",
    focus: "⏱",
    settings: "⚙",
    cloud: "☁",
    backup: "⇩",
    review: "↻",
    shortcuts: "⌘"
  };
  const PAGE_COMMANDS = [
    { id: "dashboard", label: "Overview dashboard", detail: "Progress, daily plan and quick actions", group: "Navigate", key: "1" },
    { id: "chapters", label: "Chapter planner", detail: "Subjects, chapters and completion status", group: "Navigate", key: "2" },
    { id: "topic", label: "Topic tests", detail: "Plan a chapter-based test or log a score", group: "Navigate", key: "3" },
    { id: "litmus", label: "LITMUS schedule", detail: "Part tests and full mocks", group: "Navigate", key: "4" },
    { id: "pyq", label: "PYQ practice", detail: "Record previous-year question practice", group: "Navigate", key: "5" },
    { id: "daily", label: "Daily study journal", detail: "Tasks, study sessions and focus timer", group: "Navigate", key: "6" },
    { id: "performance", label: "Performance studio", detail: "Study-time charts and weekly comparisons", group: "Navigate", key: "7" },
    { id: "mistakes", label: "Mistake bank", detail: "Errors, takeaways and revision queue", group: "Navigate", key: "8" },
    { id: "notes", label: "Study notes", detail: "Formulas, doubts and useful reminders", group: "Navigate" },
    { id: "goals", label: "Goals and habits", detail: "Targets and small daily habit checklist", group: "Navigate" }
  ];
  let activeTheme = "daylight";
  let selectedIndex = 0;
  let commandRows = [];
  let savedFocus = doc.activeElement;
  let toastTimeout = 0;
  let animationFrame = 0;
  let ambientCanvas = null;
  let ambientContext = null;
  let ambientWidth = 0;
  let ambientHeight = 0;
  let ambientDpr = 1;
  let ambientParticles = [];
  let ambientPointer = { x: -1000, y: -1000, active: false };
  let lastFrame = 0;
  let motionOn = readStorage(STORAGE.motion, "on") !== "off";
  const reduceMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Private browsing and restrictive browser settings may disable storage.
    }
  }

  function hasReducedMotion() {
    return !motionOn || Boolean(reduceMotionQuery && reduceMotionQuery.matches);
  }

  function safeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setTheme(theme, announce) {
    activeTheme = "daylight";
    root.setAttribute("data-edge-theme", activeTheme);
    writeStorage(STORAGE.theme, activeTheme);
    const button = doc.getElementById("psThemeToggle");
    if (button) {
      button.setAttribute("aria-label", "Change colour theme. Current theme: " + THEME_LABELS[activeTheme]);
      button.setAttribute("title", "Theme: " + THEME_LABELS[activeTheme] + " · click to change");
      button.innerHTML = activeTheme === "aurora" ? "◈" : activeTheme === "ultraviolet" ? "✧" : "☼";
    }
    if (ambientCanvas) drawAmbientStatic();
    if (announce) showToast("Theme · " + THEME_LABELS[activeTheme]);
  }

  function nextTheme() {
    const next = (THEMES.indexOf(activeTheme) + 1) % THEMES.length;
    setTheme(THEMES[next], true);
    burstAtCenter();
  }

  function setMotion(on, announce) {
    motionOn = Boolean(on);
    body.classList.toggle("ps-edge-motion-off", !motionOn);
    writeStorage(STORAGE.motion, motionOn ? "on" : "off");
    const button = doc.getElementById("psMotionToggle");
    if (button) {
      button.innerHTML = motionOn ? "✦" : "⏸";
      button.title = motionOn ? "Motion effects on · click to reduce" : "Motion effects reduced · click to enable";
      button.setAttribute("aria-label", button.title);
    }
    if (!motionOn) drawAmbientStatic();
    else startAmbient();
    if (announce) showToast(motionOn ? "Motion effects enabled" : "Reduced motion enabled");
  }

  function toggleFocusMode() {
    const on = !body.classList.contains("ps-edge-focus-mode");
    body.classList.toggle("ps-edge-focus-mode", on);
    writeStorage(STORAGE.focus, on ? "on" : "off");
    showToast(on ? "Focus mode enabled · press Shift + F to leave" : "Focus mode disabled");
    if (on) burstAtCenter();
  }

  function buildHeaderControls() {
    const actions = doc.querySelector(".top-actions");
    if (!actions) return;
    ["psThemeToggle", "psMotionToggle", "psEdgeOrb"].forEach(function (id) {
      const old = doc.getElementById(id);
      if (old) old.remove();
    });
    if (!doc.getElementById("psCommandButton")) {
      const command = doc.createElement("button");
      command.type = "button";
      command.id = "psCommandButton";
      command.className = "icon-button";
      command.textContent = "⌘";
      command.title = "Open command centre";
      command.setAttribute("aria-label", "Open command centre");
      command.addEventListener("click", openCommandPalette);
      actions.appendChild(command);
    }
  }

  function buildCommandPalette() {
    if (doc.getElementById("psCommandBackdrop")) return;
    const backdrop = doc.createElement("div");
    backdrop.id = "psCommandBackdrop";
    backdrop.className = "ps-edge-backdrop";
    backdrop.innerHTML =
      '<section class="ps-edge-command" role="dialog" aria-modal="true" aria-labelledby="psCommandTitle">' +
        '<div class="ps-edge-command-head">' +
          '<div class="ps-edge-command-icon" aria-hidden="true">⌘</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div id="psCommandTitle" style="font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--green);margin-bottom:3px">Command centre</div>' +
            '<input id="psCommandInput" class="ps-edge-command-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search a page or action…" aria-label="Search commands">' +
          '</div>' +
          '<button type="button" class="ps-edge-command-close" id="psCommandClose" aria-label="Close command centre" title="Close command centre">×</button>' +
        '</div>' +
        '<div id="psCommandList" class="ps-edge-command-list"></div>' +
        '<div id="psCommandShortcutPanel" class="ps-edge-shortcuts" hidden>' +
          '<div class="ps-edge-shortcut-card"><span>Open command centre</span><kbd>Ctrl K</kbd></div>' +
          '<div class="ps-edge-shortcut-card"><span>Toggle focus mode</span><kbd>Shift F</kbd></div>' +
          '<div class="ps-edge-shortcut-card"><span>Download backup</span><kbd>Ctrl Shift E</kbd></div>' +
          '<div class="ps-edge-shortcut-card"><span>Jump to pages</span><kbd>1 – 8</kbd></div>' +
        '</div>' +
        '<div class="ps-edge-command-foot">' +
          '<div><kbd>↑</kbd><kbd>↓</kbd><span>Navigate</span></div>' +
          '<div><kbd>↵</kbd><span>Open</span><kbd>ESC</kbd><span>Close</span></div>' +
        '</div>' +
      '</section>';
    backdrop.addEventListener("mousedown", function (event) {
      if (event.target === backdrop) closeCommandPalette();
    });
    doc.body.appendChild(backdrop);
    const input = doc.getElementById("psCommandInput");
    const closeButton = doc.getElementById("psCommandClose");
    if (closeButton) closeButton.addEventListener("click", closeCommandPalette);
    input.addEventListener("input", function () {
      selectedIndex = 0;
      renderCommandRows(input.value);
    });
    input.addEventListener("keydown", handlePaletteKeys);
  }

  function getCommands() {
    return PAGE_COMMANDS.map(function (page) {
      return {
        id: "page:" + page.id,
        label: page.label,
        detail: page.detail,
        group: page.group,
        glyph: ICONS[page.id],
        key: page.key,
        run: function () { goToPage(page.id); }
      };
    }).concat([
      {
        id: "focus:start",
        label: "Start a focus session",
        detail: "Open Daily Journal and start the focus timer",
        group: "Quick actions",
        glyph: ICONS.focus,
        key: "25 min",
        run: function () {
          goToPage("daily");
          window.setTimeout(function () {
            const start = doc.getElementById("timerStartButton");
            if (start && !/pause/i.test(start.textContent)) start.click();
          }, 120);
        }
      },
      {
        id: "study:log",
        label: "Log a study session",
        detail: "Record what you studied and how long it took",
        group: "Quick actions",
        glyph: "＋",
        key: "",
        run: function () {
          goToPage("daily");
          window.setTimeout(function () {
            const button = doc.querySelector("#page-daily .page-hero button");
            if (button) button.click();
          }, 100);
        }
      },
      {
        id: "mistake:add",
        label: "Log a mistake",
        detail: "Capture the error and schedule a review",
        group: "Quick actions",
        glyph: "↻",
        key: "",
        run: function () {
          goToPage("mistakes");
          window.setTimeout(function () {
            const button = doc.querySelector("#page-mistakes .page-hero button");
            if (button) button.click();
          }, 100);
        }
      },
      {
        id: "test:plan",
        label: "Plan a topic test",
        detail: "Create a chapter-aware topic test",
        group: "Quick actions",
        glyph: "◷",
        key: "",
        run: function () {
          goToPage("topic");
          window.setTimeout(function () {
            const button = doc.querySelector("#page-topic .page-hero button, #page-topic .page-hero .btn-primary, #page-topic button.btn-primary");
            if (button) button.click();
          }, 100);
        }
      },
      {
        id: "backup:export",
        label: "Download a backup",
        detail: "Save your planner data as a JSON file",
        group: "Workspace",
        glyph: ICONS.backup,
        key: "Ctrl ⇧ E",
        run: function () {
          closeCommandPalette();
          if (typeof window.exportData === "function") window.exportData();
          else showToast("Backup action is not available on this page.");
        }
      },
      {
        id: "settings:open",
        label: "Open workspace settings",
        detail: "Backup, restore and workspace preferences",
        group: "Workspace",
        glyph: ICONS.settings,
        key: "",
        run: function () {
          closeCommandPalette();
          if (typeof window.openSettings === "function") window.openSettings();
          else showToast("Settings are not available on this page.");
        }
      },
      {
        id: "cloud:open",
        label: "Cloud sync settings",
        detail: "Configure your own Supabase project or continue offline",
        group: "Workspace",
        glyph: ICONS.cloud,
        key: "",
        run: function () {
          closeCommandPalette();
          if (typeof window.openCloudSettings === "function") window.openCloudSettings();
          else showToast("Cloud settings are not available on this page.");
        }
      },
      {
        id: "focus:toggle",
        label: "Toggle focus mode",
        detail: "Reduce visual distractions while studying",
        group: "Personalise",
        glyph: "◎",
        key: "Shift F",
        run: function () { closeCommandPalette(); toggleFocusMode(); }
      },
      {
        id: "shortcuts:show",
        label: "Show keyboard shortcuts",
        detail: "See navigation and workspace shortcuts",
        group: "Help",
        glyph: ICONS.shortcuts,
        key: "?",
        run: function () { openShortcuts(); }
      }
    ]);
  }

  function renderCommandRows(query) {
    const list = doc.getElementById("psCommandList");
    if (!list) return;
    const term = String(query || "").trim().toLowerCase();
    commandRows = getCommands().filter(function (command) {
      return !term || (command.label + " " + command.detail + " " + command.group).toLowerCase().includes(term);
    });
    selectedIndex = Math.max(0, Math.min(selectedIndex, commandRows.length - 1));
    if (!commandRows.length) {
      list.innerHTML = '<div class="ps-edge-command-empty">No matches. Try “chapter”, “focus”, “test” or “theme”.</div>';
      return;
    }
    let previousGroup = "";
    let output = "";
    commandRows.forEach(function (command, index) {
      if (command.group !== previousGroup) {
        output += '<div class="ps-edge-command-group">' + safeText(command.group) + "</div>";
        previousGroup = command.group;
      }
      output +=
        '<button type="button" class="ps-edge-command-item' + (index === selectedIndex ? " is-active" : "") + '" data-command-index="' + index + '">' +
          '<span class="ps-edge-command-glyph" aria-hidden="true">' + safeText(command.glyph || "·") + "</span>" +
          '<span class="ps-edge-command-copy"><strong>' + safeText(command.label) + "</strong><small>" + safeText(command.detail) + "</small></span>" +
          '<span class="ps-edge-command-key">' + safeText(command.key || "") + "</span>" +
        "</button>";
    });
    list.innerHTML = output;
    list.querySelectorAll("[data-command-index]").forEach(function (button) {
      button.addEventListener("click", function () {
        const command = commandRows[Number(button.getAttribute("data-command-index"))];
        if (command) command.run();
      });
    });
  }

  function syncSelectedCommand() {
    const list = doc.getElementById("psCommandList");
    if (!list) return;
    list.querySelectorAll("[data-command-index]").forEach(function (button, index) {
      button.classList.toggle("is-active", index === selectedIndex);
      if (index === selectedIndex) button.scrollIntoView({ block: "nearest" });
    });
  }

  function handlePaletteKeys(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex += event.key === "ArrowDown" ? 1 : -1;
      if (selectedIndex < 0) selectedIndex = commandRows.length - 1;
      if (selectedIndex >= commandRows.length) selectedIndex = 0;
      syncSelectedCommand();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = commandRows[selectedIndex];
      if (command) command.run();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandPalette();
    }
  }

  function openCommandPalette() {
    buildCommandPalette();
    savedFocus = doc.activeElement;
    const backdrop = doc.getElementById("psCommandBackdrop");
    const input = doc.getElementById("psCommandInput");
    const shortcutPanel = doc.getElementById("psCommandShortcutPanel");
    if (shortcutPanel) shortcutPanel.hidden = true;
    backdrop.classList.add("is-open");
    body.style.overflow = "hidden";
    input.value = "";
    selectedIndex = 0;
    renderCommandRows("");
    window.setTimeout(function () { input.focus(); }, 20);
  }

  function closeCommandPalette() {
    const backdrop = doc.getElementById("psCommandBackdrop");
    if (!backdrop || !backdrop.classList.contains("is-open")) return;
    backdrop.classList.remove("is-open");
    body.style.overflow = "";
    if (savedFocus && typeof savedFocus.focus === "function") savedFocus.focus();
  }

  function openShortcuts() {
    buildCommandPalette();
    savedFocus = doc.activeElement;
    const backdrop = doc.getElementById("psCommandBackdrop");
    const input = doc.getElementById("psCommandInput");
    const panel = doc.getElementById("psCommandShortcutPanel");
    backdrop.classList.add("is-open");
    body.style.overflow = "hidden";
    input.value = "";
    renderCommandRows("");
    if (panel) panel.hidden = false;
    input.focus();
  }

  function goToPage(page) {
    closeCommandPalette();
    if (typeof window.go === "function") window.go(page);
    else {
      const target = doc.querySelector('[data-page="' + page + '"]');
      if (target) target.click();
    }
    window.setTimeout(function () {
      const active = doc.getElementById("page-" + page);
      if (active) active.classList.add("ps-edge-seen");
    }, 30);
  }

  function showToast(message) {
    let toast = doc.getElementById("psEdgeToast");
    if (!toast) {
      toast = doc.createElement("div");
      toast.id = "psEdgeToast";
      toast.className = "ps-edge-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      doc.body.appendChild(toast);
    }
    toast.textContent = String(message || "");
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function buildFloatingButton() {
    if (doc.getElementById("psEdgeOrb")) return;
    const button = doc.createElement("button");
    button.type = "button";
    button.id = "psEdgeOrb";
    button.className = "ps-edge-orb";
    button.innerHTML = "<span>⌘</span>";
    button.setAttribute("aria-label", "Open command centre");
    button.title = "Command centre · Ctrl/⌘ + K";
    button.addEventListener("click", openCommandPalette);
    doc.body.appendChild(button);
  }

  function buildAmbientCanvas() {
    if (ambientCanvas || !doc.body) return;
    ambientCanvas = doc.createElement("canvas");
    ambientCanvas.id = "ps-ambient";
    ambientCanvas.setAttribute("aria-hidden", "true");
    doc.body.prepend(ambientCanvas);
    ambientContext = ambientCanvas.getContext("2d", { alpha: true });
    if (!ambientContext) return;
    resizeAmbient();
    startAmbient();
    window.addEventListener("resize", debounce(resizeAmbient, 150), { passive: true });
    window.addEventListener("pointermove", handleAmbientPointer, { passive: true });
    window.addEventListener("pointerout", function (event) {
      if (!event.relatedTarget) ambientPointer.active = false;
    }, { passive: true });
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        startAmbient();
      }
    });
  }

  function resizeAmbient() {
    if (!ambientCanvas || !ambientContext) return;
    ambientDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    ambientWidth = Math.max(1, window.innerWidth);
    ambientHeight = Math.max(1, window.innerHeight);
    ambientCanvas.width = Math.round(ambientWidth * ambientDpr);
    ambientCanvas.height = Math.round(ambientHeight * ambientDpr);
    ambientCanvas.style.width = ambientWidth + "px";
    ambientCanvas.style.height = ambientHeight + "px";
    ambientContext.setTransform(ambientDpr, 0, 0, ambientDpr, 0, 0);
    const count = ambientWidth < 620 ? 22 : ambientWidth < 1100 ? 36 : 54;
    ambientParticles = Array.from({ length: count }, function () {
      return {
        x: Math.random() * ambientWidth,
        y: Math.random() * ambientHeight,
        vx: (Math.random() - .5) * .22,
        vy: (Math.random() - .5) * .22,
        radius: .8 + Math.random() * 1.7,
        phase: Math.random() * Math.PI * 2
      };
    });
    drawAmbientStatic();
  }

  function handleAmbientPointer(event) {
    if (!ambientPointer) return;
    ambientPointer.x = event.clientX;
    ambientPointer.y = event.clientY;
    ambientPointer.active = event.pointerType !== "touch";
  }

  function getParticlePalette() {
    if (activeTheme === "ultraviolet") return ["193, 146, 255", "91, 219, 255", "118, 246, 185"];
    if (activeTheme === "daylight") return ["21, 127, 168", "5, 134, 94", "112, 88, 189"];
    return ["91, 220, 255", "101, 243, 178", "177, 156, 255"];
  }

  function drawAmbientStatic() {
    if (!ambientContext || !ambientCanvas) return;
    ambientContext.clearRect(0, 0, ambientWidth, ambientHeight);
    const palette = getParticlePalette();
    ambientParticles.forEach(function (particle, index) {
      const color = palette[index % palette.length];
      ambientContext.beginPath();
      ambientContext.fillStyle = "rgba(" + color + ", " + (activeTheme === "daylight" ? ".28" : ".42") + ")";
      ambientContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ambientContext.fill();
    });
  }

  function renderAmbientFrame(timestamp) {
    animationFrame = 0;
    if (!ambientContext || !ambientCanvas || doc.hidden || hasReducedMotion()) {
      drawAmbientStatic();
      return;
    }
    if (timestamp - lastFrame < 30) {
      animationFrame = requestAnimationFrame(renderAmbientFrame);
      return;
    }
    lastFrame = timestamp;
    ambientContext.clearRect(0, 0, ambientWidth, ambientHeight);
    const palette = getParticlePalette();
    const maxDistance = ambientWidth < 620 ? 86 : 122;
    for (let i = 0; i < ambientParticles.length; i++) {
      const a = ambientParticles[i];
      a.phase += .004;
      a.x += a.vx + Math.sin(a.phase) * .035;
      a.y += a.vy + Math.cos(a.phase * .7) * .035;
      if (a.x < -10) a.x = ambientWidth + 10;
      if (a.x > ambientWidth + 10) a.x = -10;
      if (a.y < -10) a.y = ambientHeight + 10;
      if (a.y > ambientHeight + 10) a.y = -10;
      if (ambientPointer.active) {
        const dx = a.x - ambientPointer.x;
        const dy = a.y - ambientPointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        if (distance < 145) {
          const push = (145 - distance) / 145 * .42;
          a.x += dx / distance * push;
          a.y += dy / distance * push;
        }
      }
      const color = palette[i % palette.length];
      ambientContext.beginPath();
      ambientContext.fillStyle = "rgba(" + color + ", " + (activeTheme === "daylight" ? ".24" : ".42") + ")";
      ambientContext.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ambientContext.fill();
      for (let j = i + 1; j < ambientParticles.length; j++) {
        const b = ambientParticles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > maxDistance * maxDistance) continue;
        const opacity = (1 - Math.sqrt(distanceSquared) / maxDistance) * (activeTheme === "daylight" ? .10 : .15);
        ambientContext.strokeStyle = "rgba(" + color + ", " + opacity + ")";
        ambientContext.lineWidth = .7;
        ambientContext.beginPath();
        ambientContext.moveTo(a.x, a.y);
        ambientContext.lineTo(b.x, b.y);
        ambientContext.stroke();
      }
    }
    animationFrame = requestAnimationFrame(renderAmbientFrame);
  }

  function startAmbient() {
    if (!ambientCanvas || !ambientContext || animationFrame || doc.hidden || hasReducedMotion()) {
      if (hasReducedMotion()) drawAmbientStatic();
      return;
    }
    animationFrame = requestAnimationFrame(renderAmbientFrame);
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function () {
      const args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function burstAtCenter() {
    if (hasReducedMotion()) return;
    const hero = doc.querySelector(".hero");
    if (!hero) return;
    const bounds = hero.getBoundingClientRect();
    for (let i = 0; i < 9; i++) {
      const spark = doc.createElement("i");
      spark.className = "ps-edge-spark";
      spark.style.left = (Math.max(12, bounds.width * (.35 + Math.random() * .3))) + "px";
      spark.style.top = (Math.max(12, bounds.height * (.25 + Math.random() * .45))) + "px";
      spark.style.setProperty("--spark-x", ((Math.random() - .5) * 34) + "px");
      hero.appendChild(spark);
      window.setTimeout(function () { spark.remove(); }, 1200);
    }
  }

  function renderEdgeSignal() {
    // Kept as a safe no-op for existing render hooks; the dashboard has no recommendation card.
    const signal = doc.getElementById("psEdgeSignal");
    if (signal) signal.remove();
  }

  function wrapRenderFunctions() {
    if (typeof window.renderAll === "function" && !window.renderAll.__edgeWrapped) {
      const originalRenderAll = window.renderAll;
      const wrapped = function () {
        const result = originalRenderAll.apply(this, arguments);
        window.setTimeout(renderEdgeSignal, 0);
        return result;
      };
      wrapped.__edgeWrapped = true;
      window.renderAll = wrapped;
    }
    if (typeof window.renderAllProductivity === "function" && !window.renderAllProductivity.__edgeWrapped) {
      const originalProductivity = window.renderAllProductivity;
      const wrappedProductivity = function () {
        const result = originalProductivity.apply(this, arguments);
        window.setTimeout(renderEdgeSignal, 0);
        return result;
      };
      wrappedProductivity.__edgeWrapped = true;
      window.renderAllProductivity = wrappedProductivity;
    }
  }

  function buildKeyboardShortcuts() {
    doc.addEventListener("keydown", function (event) {
      const active = doc.activeElement;
      const typing = active && (active.matches("input, textarea, select") || active.isContentEditable);
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      if (command && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (typeof window.exportData === "function") window.exportData();
        else showToast("Backup action is not available.");
        return;
      }
      if (event.key === "Escape") {
        closeCommandPalette();
        return;
      }
      if (typing || event.altKey || command) return;
      if (event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFocusMode();
        return;
      }
      if (event.key === "?" ) {
        event.preventDefault();
        openShortcuts();
        return;
      }
      const number = Number(event.key);
      if (number >= 1 && number <= 8) {
        const page = PAGE_COMMANDS[number - 1];
        if (page) goToPage(page.id);
      }
    });
  }

  function addEnhancementLabels() {
    const theme = doc.getElementById("psThemeToggle");
    if (theme) theme.setAttribute("data-tooltip", "Change colour theme");
    const command = doc.getElementById("psCommandButton");
    if (command) command.setAttribute("data-tooltip", "Command centre");
    const motion = doc.getElementById("psMotionToggle");
    if (motion) motion.setAttribute("data-tooltip", "Reduce motion");
  }

  function observeCards() {
    if (!("IntersectionObserver" in window) || hasReducedMotion()) return;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("ps-edge-seen");
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    doc.querySelectorAll(".metric, .panel, .subject-card, .chapter-card, .daily-stat").forEach(function (item) {
      if (!item.classList.contains("ps-edge-seen")) observer.observe(item);
    });
  }

  function registerNavigationFeedback() {
    const nav = doc.getElementById("nav");
    if (!nav) return;
    nav.addEventListener("click", function (event) {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      const page = button.getAttribute("data-page");
      if (page) writeStorage("ps-v6-edge-last-page", page);
    });
  }

  function initialise() {
    buildHeaderControls();
    setTheme("daylight", false);
    body.classList.toggle("ps-edge-focus-mode", readStorage(STORAGE.focus, "off") === "on");
    setMotion(motionOn, false);
    buildCommandPalette();
    buildKeyboardShortcuts();
    registerNavigationFeedback();
    addEnhancementLabels();
    wrapRenderFunctions();
    renderEdgeSignal();
    window.setTimeout(renderEdgeSignal, 180);
  }

  window.psEdge = {
    setTheme: setTheme,
    nextTheme: nextTheme,
    toggleFocusMode: toggleFocusMode,
    openCommandPalette: openCommandPalette,
    openShortcuts: openShortcuts,
    renderSignal: renderEdgeSignal
  };
  window.psEdgeRunRecommendation = function () {
    const recommendation = chooseRecommendation();
    goToPage(recommendation.page);
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();