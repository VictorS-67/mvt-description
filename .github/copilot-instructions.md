# Movement to Onomatopoeia – AI Guide

## Core architecture
- Plain HTML + vanilla JS; each page (`index.html`, `survey.html`, `tutorial.html`) boots its own App subclass from `js/*.js` via `<script>` tags.
- `BaseApp` (`js/baseApp.js`) handles shared init: language load, `sheet-info.json` fetch through `ConfigManager`, loading overlays, and logout/localStorage plumbing.
- Page apps (`IndexApp`, `SurveyApp`, `TutorialApp`) override `initializeElements` + `initializeSubclass`; use DOM lookups via `DOMUtils` and reuse BaseApp helpers like `withLoading`, `submitWithLoading`, and `initializeVideoManager`.
- Services are singletons created globally in HTML: `LanguageManager`, `UIManager`, `LoadingManager`, `VideoManager`, `AudioRecordingService`, `GoogleSheetsService`. They communicate through direct method calls (no bundler/module system).

## Data + integrations
- Configuration lives in `sheet-info.json`; load it with `ConfigManager.getSheetConfig()` (cached). Update sheet IDs/names here only.
- Google Sheets/Drive access goes through Netlify functions (`netlify/functions/*.js`). Client-side code requests tokens with `getAccessToken()` (`js/googleApi.js`) before calling `GoogleSheetsService` methods (which add retry + mappings).
- Participant metadata and survey answers map to the column definitions at the bottom of `js/googleSheetsService.js`; maintain these when touching the Sheets schema.
- Video choices come from the `SelectedVideos` tab; `VideoManager.loadVideos` reads the config and populates buttons in `survey.html`/`tutorial.html`.
- Audio clips are recorded with `AudioRecordingService` (`js/audioRecordingService.js`), then uploaded via the `upload-audio.js` Netlify function; keep the MediaRecorder MIME assumptions in sync when changing formats.

## Local workflows
- `npm install` (or `npm run build`) copies Swiper assets into `lib/` for tutorial carousels; no bundling or transpilation.
- `npm run dev` serves the static site on port 8080 using Python's HTTP server; rely on that path for local fetches to `./sheet-info.json`, `./lang/*.json`, and videos.
- Netlify deploys the `main` branch; remember that serverless functions require environment variables for Google OAuth (not in repo).

## Conventions to follow
- Keep translations in `lang/en.json` and `lang/ja.json`; update the same keys in both files. In HTML, bind text with `data-lang` attributes; in JS call `langManager.getText('path.to.key')`.
- Persist participant context in localStorage (`participantInfo`, `filteredData`). Always call `loadAndValidateParticipantInfo()` before assuming authenticated state.
- Use `BaseApp.startLoading/stopLoading` and `UIManager` helpers for UX feedback. For skeletons, pass `{ type: 'skeleton', container, skeletonType }` as shown in `SurveyApp`.
- When extending audio features, respect `audioRecordingService` state callbacks (`onStateChange`, `onError`) to keep buttons in sync (`surveyApp.js` shows the full pattern).
- For Sheets mutations, convert objects via `googleSheetsService.transformObjectToRow()` with the relevant mapping; avoid manual array construction so column order stays correct.

## File signposts
- `js/surveyApp.js`: End-to-end survey flow (video navigation, time capture, audio UI, save logic).
- `js/indexApp.js`: Registration + participant lookup; demonstrates `ValidationUtils` usage.
- `js/tutorialApp.js` + `js/tutorialStepManager.js`: Swiper tutorial initialization and language-aware slide content.
- `netlify/functions/`: OAuth token exchange, Sheets fetch, Drive upload.
- `css/style.css` + `css/tutorial.css`: Tailwind complements; custom classes for layout/animations.

## When adding features
- Prefer new BaseApp subclasses if you introduce pages; wire them in the HTML just like `survey.html` does.
- Touch `sheet-info.json`, language files, and Netlify functions together whenever you add a new sheet, video category, or server interaction—each page assumes consistency across those layers.
- Keep new DOM IDs descriptive and register them in the relevant `initializeElements()` block so BaseApp utilities can find them.