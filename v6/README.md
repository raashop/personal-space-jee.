# Personal Space 6.0

A standalone JEE Main study workspace. The previous application remains on the `main` branch; this version lives on `personal-space-v6`.

## Features

- Chapter tracker for Physics, Chemistry and Mathematics, with Class 11 / Class 12 filters, four prep states, revision checkpoints, notes and PYQ flags.
- Topic-test planning, chapter-aware automatic titles, date planning, attempt status, marks and review notes.
- LITMUS part-test and full-mock schedule with editable dates, syllabus, scores and attempt status.
- PYQ practice log with question counts, correctness, accuracy, year and source.
- Daily plan with task completion, date navigation, study-session records and yesterday recap.
- Focus timer (25 / 50 / 90 minutes) that records elapsed study time.
- Daily shutdown reflections for focus, energy, wins, obstacles and next steps.
- Performance studio with daily activity charts, time by subject, previous-window comparison, goals and weekly review.
- Mistake bank with error categories, correction notes, due dates and a smart revision queue.
- Local autosave and JSON backup / restore. Supabase cloud sync is optional and requires a configured project URL, publishable key, authentication, and a `study_data` table with suitable row-level security.
- Aurora Edge interface with Aurora neon, Ultraviolet and Daylight colour themes; interactive ambient particles; responsive glass panels; reduced-motion support; focus mode; and a searchable command centre.
- Keyboard shortcuts: `Ctrl/⌘ + K` for the command centre, `Shift + F` for focus mode, `Ctrl/⌘ + Shift + E` for backup export, `1–8` for page navigation, and `?` for the shortcut guide.
- A data-driven next-action signal on the home dashboard that prioritises due mistakes, planned tests, unfinished chapters, or a focus block.

## V6 interface files

- `index.html` — core planner, chapter/test/PYQ pages and app state.
- `productivity.js` / `productivity.css` — study journal, focus timer, analytics, mistake bank and their styles.
- `edge.js` / `edge.css` — theme system, interactive background, command centre, keyboard navigation and visual effects.

The stylesheets and scripts are intentionally kept as separate, readable files. The Edge layer uses browser APIs only; it does not need an external JavaScript framework or third-party tracking.

## Publish with GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select branch `personal-space-v6` and folder `/(root)`, then save.
4. Use **Visit site** once GitHub Pages finishes deploying. The branch's root `index.html` redirects to `v6/`.

**Important:** GitHub Pages has one configured publishing source per repository. Switching this repository's Pages source to `personal-space-v6` changes the public Pages version served for this repository; it does not change the contents of `main`. For two separately hosted URLs at the same time, use a separate repository or hosting project.

## Local data and cloud sync

Study sessions, tasks, reflections, goals and mistake entries save in the browser's local storage. Use **Download backup** regularly. Data is not automatically shared between browsers unless cloud sync is configured. Never put a Supabase secret or service-role key in this static site.
