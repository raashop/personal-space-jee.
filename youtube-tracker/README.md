# Personal Space — YouTube JEE Lecture Tracker (prototype)

This is a local-first Chromium extension prototype for Brave. It does not sign into YouTube or read your watch history. It only observes the active YouTube watch page, matches a known JEE chapter phrase in the title/channel, and accumulates time while that video is actually playing. Records stay in the extension's local storage until exported.

## Install in Brave

1. Download the repository ZIP from GitHub, or clone the repository.
2. In the extracted folder, open `youtube-tracker/`.
3. In Brave, open `brave://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked** and select the `youtube-tracker` folder.
6. Open a JEE lecture in YouTube. Let it play for at least 10 seconds.
7. Click the extension icon to see matched lectures.
8. Click **Export for Personal Space** to download a JSON file.
9. Open Personal Space V6, choose **YouTube Lectures** in the sidebar, and import that JSON file.

## Important limitations

- This is a prototype, not a transcript-reading AI. It only recognises topics from title/channel text using a built-in chapter keyword list; some lectures will be missed or misclassified.
- YouTube is a single-page app. If navigating between videos doesn't refresh the content script correctly, reload the YouTube tab.
- This extension tracks this Brave browser only. Android YouTube app activity is not visible to it.
- The first version uses export/import, not automatic cloud sync. That avoids exposing database credentials and works before Supabase is configured.
- The planner only moves a matched chapter from **Not Ready** to **In Progress**. It never marks a chapter mastered or exam-ready merely because a video played.
- The extension does not record unrelated videos unless their title/channel matches one of the known JEE chapter phrases and an academic-format hint.
- Review the keyword list in `content.js` to customise chapter recognition.
