# Personal Space — JEE Lecture Tracker

A Brave/Chromium extension that tracks recognizable JEE lecture playback on YouTube and Telegram Web, maps titles/captions to JEE syllabus chapters, and syncs records into the Personal Space planner. Normal use does not require repeated export/import.

## Install or update

1. Download the ZIP for the `personal-space-v6` branch and extract it.
2. Open `brave://extensions` in Brave and enable **Developer mode**.
3. Back up any records you need from the old extension. Remove the old unpacked extension and choose **Load unpacked**, selecting the new `youtube-tracker` folder containing `manifest.json`.
4. Refresh any open YouTube and Telegram Web tabs after loading the extension.

## Connect the planner once

1. Open your Personal Space planner page in Brave.
2. Click the extension icon. Under **Automatic planner sync**, paste the planner page URL and click **Connect planner**.
3. Approve the browser permission prompt.
4. Refresh the planner tab if it was already open.

After that, records from YouTube and Telegram Web sync automatically while the planner is open. Records remain in the extension if the planner is closed and catch up when it is opened again. Export backup is optional.

## YouTube tracking

1. Open a direct YouTube watch page and refresh the tab.
2. Play a clearly titled JEE lecture for 30–60 seconds.
3. Check the popup's **Tracker status** and confirm the matched chapter.
4. Keep the planner open. The lecture should appear under **YouTube Lectures** automatically.

## Telegram Web tracking (new)

1. Open `https://web.telegram.org/` in the same Brave profile where the extension is installed.
2. Open the channel/post that contains a playable video and press Play.
3. Let it play for 30–60 seconds. Open the extension popup and read **Telegram Web status**.
4. When the visible post/caption includes a recognizable JEE chapter phrase, the extension records playback time and syncs the lecture to the planner's Telegram section.
5. If the caption doesn't include the chapter or the Telegram interface doesn't expose readable nearby message text, use the planner's manual import form as a fallback.

### Telegram limitations and privacy

- Telegram Web tracking works only in the browser. It does not track the Telegram Android app, desktop app, or other browser profiles.
- The tracker looks at the video player and nearby visible message/caption text to infer a chapter. It does not read transcripts or use AI.
- Telegram's DOM changes occasionally; some posts/players may not expose a stable message container, title, or caption. The popup status helps diagnose those cases.
- It does not ask for your Telegram password, login code, or session token, and it does not scan your private chats in the background. It runs on the Telegram Web page you open.
- Playback time is recorded only while a recognized video is playing and its media time advances. A post that has no readable chapter information may remain unmatched.

## What it does and does not do

- Automatically records playback time for recognized JEE-related videos on supported YouTube watch pages and Telegram Web pages.
- Matches title/caption text to known chapter names and aliases. Vague titles may still be missed.
- Moves a matched chapter from **Not Ready** to **In Progress** once watch time is recorded; it never marks a chapter mastered.
- Sends records to the planner page you explicitly connected. If the planner's own Supabase cloud sync is configured, lecture records are included in its cloud backup.
- Does not track videos in mobile apps or use transcript-based chapter recognition.
- Manual JSON/CSV import and export remain available as optional fallbacks/backups.

Never put a Supabase secret key or service-role key in the extension or a browser page.
