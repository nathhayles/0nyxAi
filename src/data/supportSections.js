// Extracted from Support.jsx so this can be imported by scripts/prerender-seo.js (plain Node, cannot parse JSX) as well as Support.jsx itself -- single source of truth for the real, user-facing FAQ content, same pattern as learnPagesSeo.js / staticPagesSeo.js.

export const SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { q: "How do I create my first reel?", a: "Go to Studio → Text to Video. Enter your script, choose a duration per scene, select Stock or AI video, then click Generate. Your reel will appear in the editor automatically." },
      { q: "What video formats are supported for upload?", a: "MP4, MOV, WebM, and common image formats (PNG, JPG). Files are stored securely on Cloudflare R2." },
      { q: "How long does export take?", a: "Typically 1–3 minutes depending on reel length, number of scenes, and whether captions are enabled. AI-generated scenes take longer to produce before export begins." },
      { q: "Can I dictate my script instead of typing it?", a: "Yes. On the Create, Viral Hooks, and Campaign pages you'll see a Dictate button (microphone icon). Click it to speak your script and it will be transcribed automatically. Dictation requires Chrome or Edge — the button is hidden on Safari and Firefox, which don't support the Web Speech API." },
      { q: "My reel doesn't have a title — is that a bug?", a: "Reels are automatically titled based on your first scene's script or narration shortly after you start creating. If a reel is still showing \"Untitled Reel\" after a minute or so, try refreshing the page. If it's still untitled, you can always set a custom title yourself by clicking on the title text in the editor toolbar." },
    ]
  },
  {
    title: "Brand Kit",
    items: [
      { q: "How do I set up my brand?", a: "Go to /branding, click + New Brand, enter your brand name and tagline, then upload your logo. Once uploaded, click 'Extract palette from logo' to automatically generate a 5-colour brand palette from your logo." },
      { q: "What does 'Apply all' do in the palette section?", a: "It applies all 5 extracted colours to your brand's colour fields (Primary, Secondary, Caption Background, Caption Text, Highlight) in one click and saves them to your brand record automatically." },
      { q: "How do brand colours affect my reels?", a: "Brand colours set your caption background, text colour, and karaoke highlight colour by default. When you create a reel with a brand selected, these colours are applied automatically. You can override per-scene in the editor." },
      { q: "Can I have multiple brands?", a: "The free plan supports 1 brand. Add the Unlimited Brands add-on ($15/month) to create and switch between as many brands as you need, in the editor's Brand Kit tab." },
      { q: "How do I connect social accounts to a brand?", a: "Social accounts (Instagram, TikTok, LinkedIn, YouTube) are connected under Account → Social Connections. Per-brand OAuth is coming — currently connections are account-wide and apply across all your brands." },
    ]
  },
  {
    title: "Captions",
    items: [
      { q: "How do I enable captions?", a: "In the editor, click the CC button in the toolbar. Captions will appear in the preview. Make sure your scenes have narration/voiceover text set." },
      { q: "How do I change caption style?", a: "Click the Layers icon in the left sidebar → Captions tab. Choose from 14 styles including Karaoke, TikTok, Bubble, Neon, Gradient, Typewriter and more. Click 'Apply to this scene' or 'Apply to all'." },
      // INTERNAL (not user-facing): bubble, typewriter, underline, and soft are now real
      // implementations in export rather than approximations — still confirming all four are
      // correctly reachable/selectable end-to-end from the Styles panel UI before we say so to users.
      { q: "Are caption styles fully rendered in export, or just approximated?", a: "Caption styles including Bubble, Typewriter, Underline, and Soft are rendered using their real, dedicated implementation at export time — not a simplified approximation of the preview." },
      { q: "How do I change caption colours?", a: "Go to the Custom tab in the left sidebar. Change Text colour, Background colour, and Karaoke Highlight colour. Click 'Apply to this scene' or 'Apply to all' to commit." },
      { q: "What is Karaoke mode?", a: "Karaoke mode highlights each word as it's spoken in your voiceover. It requires word-level timestamps from the voiceover generation. The highlight colour is customisable in the Custom caption tab." },
      { q: "Captions aren't showing even though I turned them on / are showing even though I turned them off", a: "Two toggles both need to agree for captions to appear: the CC button in the timeline/sequencer toolbar (global, applies to the whole reel) and the 'Show captions on canvas' checkbox in the scene panel (per-scene). If either one is off, that scene's captions won't appear on export even if the other is on. Also make sure the scene has narration text set. If you've checked both and your exported video still doesn't match what you expect in the editor preview, try re-exporting — the setting is read fresh at export time." },
      { q: "What fonts are available for captions?", a: "Noto Sans, Arial (Liberation), Roboto, DejaVu Sans, Georgia, Courier New, Impact, Sans Serif, Serif, Monospace. These are the fonts installed on the render server." },
    ]
  },
  {
    title: "Text Overlays",
    items: [
      { q: "How do I add text overlays?", a: "Click the T icon in the left sidebar to open Text Overlays. Click '+ Add Text' to place a text clip on the FX track at the current playhead position." },
      { q: "What text animations are available?", a: "None, Fade In, Fade Out, Fade In+Out, Scroll Down, Scroll Up, Scroll Left, Scroll Right, Zoom In, Zoom Out, Typewriter. Animations are visible in the preview during playback and rendered on export." },
      { q: "Can I change the font of a text overlay?", a: "Yes. Select a text clip, then choose from Noto Sans, Arial, Roboto, DejaVu Sans, Georgia, Courier New, or Impact in the Font selector." },
      { q: "How do I position text overlays?", a: "Use the Position X and Position Y sliders in the Text panel. 50% = centre. You can also set left/center/right alignment." },
    ]
  },
  {
    title: "Avatar",
    items: [
      { q: "How do I add an AI avatar to a scene?", a: "In the editor, open the Avatar panel, choose an avatar and a position, then click 'Apply to this scene' or 'Apply to all scenes'. Both scopes now work correctly and the avatar appears reliably on the timeline." },
      { q: "Why does my avatar have a green background?", a: "It shouldn't — the green-screen background behind the avatar is automatically removed, both in the live preview and in the final exported video." },
      { q: "Does the avatar speak my scene's voiceover?", a: "No. Avatar lip-sync uses HeyGen's own generated audio for that scene rather than your separate voiceover/narration track." },
    ]
  },
  {
    title: "AI Lip-Sync",
    items: [
      { q: "How do I make my AI-generated character speak the narration?", a: "Attach narration/voiceover to a scene, then click Regenerate on that scene in the editor. Lip-sync runs automatically as part of generation — the character's mouth movement is synced to the voiceover audio. There's no separate toggle; it happens whenever the scene being regenerated has a voiceover track attached." },
      { q: "Does lip-sync cost extra credits?", a: "Yes. When a scene has narration attached at the time you regenerate it, a lip-sync surcharge is added on top of the base video-generation cost, reflecting the real processing cost of the lip-sync pass." },
      { q: "What happens if lip-sync fails?", a: "The scene still generates successfully as a silent clip, with your narration playing as its own audio track exactly as before. Lip-sync failing never blocks or fails the scene generation as a whole." },
      { q: "Does lip-sync work when generating a full storyboard from a script on the Create page?", a: "Not yet — lip-sync is currently only available when regenerating a single scene in the editor. If you generate a full reel from a script, add narration to a scene afterwards and click Regenerate on that scene in the editor to lip-sync it." },
    ]
  },
  {
    title: "AI Studio",
    items: [
      { q: "What is AI Studio?", a: "AI Studio is your library of AI-generated video clips. When you generate a scene using an AI video model, you can save it to AI Studio for reuse across different reels." },
      { q: "How do I save a clip to AI Studio?", a: "In the editor, click the AI button in the transport controls, or use the 'Save to AI Studio' option on a generated scene. Clips are saved to your account and persist across sessions." },
      { q: "Are AI Studio clips private?", a: "Yes. AI Studio clips are stored per-user with row-level security. Only you can see your clips." },
      { q: "How much does AI video generation cost?", a: "Cost depends on the model you choose. Wan 2.5 is 34-67 credits/scene (based on the scene's actual length), Wan 2.7 is 27-300 credits/scene (based on scene length and whether you upgrade to 1080p), Vidu Q3 Pro is 17-266 credits/scene (based on the scene's actual length), Vidu Q3 Turbo is 8-128 credits/scene (based on the scene's actual length), Seedance 1 Pro is 8-48 credits/scene (based on the scene's actual length), Kling 3 Pro is 45-224 credits/scene (based on the scene's actual length), Veo 3 is 107-213 credits/scene (based on the scene's actual length), and Seedance 2.0 is 107-399 credits/scene (based on the scene's actual length). If a scene has narration/voiceover attached when you regenerate it in the editor, a lip-sync surcharge is added on top of the base cost — see the AI Lip-Sync section. Credits can be purchased (100 credits = $1) or earned through the referral program." },
      { q: "Which AI video model should I choose?", a: "Wan 2.5 (34-67 cr, based on scene length) is the cheapest option and great for quick, low-cost clips. Wan 2.7 (27-300 cr, based on scene length and 1080p upgrade) offers native audio and first/last-frame control at 720p by default, with an optional 1080p upgrade. Vidu Q3 Pro (17-266 cr, based on scene length) and Vidu Q3 Turbo (8-128 cr, based on scene length) are also budget-friendly and good for quick clips. Seedance 1 Pro (8-48 cr, based on scene length) offers a balance of quality and cost. Kling 3 Pro (45-224 cr, based on scene length) is our most popular model for high-quality cinematic output. Veo 3 (107-213 cr, based on scene length) is the premium option for the highest fidelity, especially for realism and motion. Seedance 2.0 (107-399 cr, based on scene length) is our premium option with native audio generation. All are selectable in the Generate Model dropdown on the scene panel." },
    ]
  },
  {
    title: "AI Video Generation",
    items: [
      { q: "How do I keep a character looking consistent across multiple scenes?", a: "Use the Character Library (available from the main navigation). Create a character with a name, optional structured details (build, age, hair, eyes, wardrobe, accessories, and more), and 2-4 reference images (ideally clear, well-lit photos from the same time period/angle range — mixing very different-looking reference images, like paintings from different eras, will reduce consistency). Then, in any scene's Action/Background field, type @ followed by the character's name to tag them — autocomplete will show your saved characters. The tagged character's reference images and details will be used to help keep their appearance consistent in that generated scene." },
      { q: "How do I keep a specific product or object looking accurate across scenes?", a: "Use the Prop Library, the same way as Character Library. Create a prop with a name and one or more reference images of the real item — clothing, packaging, a branded product, anything that needs to look accurate rather than AI-invented. Tag it with @PropName in a scene's Action/Background field, the same @-tag mechanism as characters. Characters and props can be tagged together in the same scene (for example \"@Sarah wearing @BlueDenimJacket\") and both will resolve correctly in that generation." },
      { q: "How long can a single AI video scene be?", a: "Each AI-generated scene has a 10-second maximum for a single generation — this is a hard limit set by our video generation model, not something we control. If you need a longer continuous sequence, turn on Character Lock when generating a full storyboard: it keeps the same character's reference photo anchoring every scene as they're chained together, so the result feels like one continuous shot even though it's built from several 10-second generations." },
      { q: "Why does my character-locked video have a brief flash or fade at the start?", a: "When a scene's tagged character is set to Character Consistency, we anchor the generation to your character's reference photo to keep their face and appearance accurate. To do this well, the very start of the scene shows a brief (under one second) fade before settling into the actual scene. This is expected — it smooths over a technical step in how the video model uses your reference image and doesn't affect the rest of the clip, which shows your character clearly and consistently." },
      { q: "Character Consistency vs. Scene Accuracy — what's the difference?", a: "When tagging a character with @name in a scene, you can set that scene's reference mode. Character Consistency anchors the generation to the character's reference photo, keeping their face and appearance accurate — best for a recognisable recurring character across multiple scenes. Scene Accuracy generates from the prompt/descriptor text instead, prioritising your scene's described action, setting, and camera direction — the character's general look still applies, but their face may vary more between generations. Each character has a default reference mode, and you can override it per scene." },
      { q: "Why does my exported video have a disclosure message on it?", a: "If your video uses a Character Library entry flagged as based on a real person, we automatically insert a short disclosure clip at the start of the export to comply with EU AI Act transparency requirements. The exact wording depends on whether the person is a recognised public figure or a private individual: public-figure disclosures read \"This video contains AI-generated content and is not an actual recording of real events or statements,\" while private-individual disclosures read \"This video contains AI-generated content depicting a real individual, used with their consent.\" Either way, this disclosure is separate from your regular captions and always displays in plain white text with no background, so it doesn't interfere with your brand's caption styling." },
    ]
  },
  {
    title: "Library & Assets",
    items: [
      { q: "Where do my uploaded files live?", a: "All uploaded files — videos, images, audio, and generated assets — are accessible in the Library panel (folder icon in the left sidebar of the editor). Assets are grouped into collapsible sections by media type." },
      { q: "How do I upload files to the Library?", a: "Use the Upload button at the top of the Library panel, or drag files from your computer directly onto the panel. Supported formats: MP4, MOV, WebM (video); PNG, JPG (images); MP3, WAV (audio)." },
      { q: "How do folders work in the Library?", a: "Right-click any asset to get a context menu with options to create a new folder, move the asset to an existing folder, or rename/delete a folder. Use the folder filter at the top of the panel to browse by folder." },
      { q: "How do I add a Library asset to my timeline?", a: "Drag any asset from the Library panel onto the VIDEO, B-Roll, or AUDIO track in the sequencer. The drop target highlights when you hover over it." },
      { q: "Can I preview assets before adding them?", a: "Yes. Hover over any video or image asset in the Library for a moment and a preview tooltip will appear at your cursor position. Audio files play on click using the built-in preview player." },
      { q: "My music files in the Library show a broken image.", a: "This was a known bug — now fixed. Music and audio files show a play-button icon, not a thumbnail. If you see a broken image on a music file, hard-refresh the page." },
      { q: "Some of my PPT-to-Video scenes are blank.", a: "When a slide's content doesn't match any stock footage, the scene may be left blank. Simply click the blank scene in the editor, open the Visuals panel, and search for or select any stock video or uploaded clip to replace it. You can also use the 'Search Pexels videos' field directly in the Storyboard panel." },
    ]
  },
  {
    title: "Music & Audio",
    items: [
      { q: "How do I add background music?", a: "Open the Library panel (folder icon in the left sidebar) and expand the Music section. Browse your saved or generated tracks and click Apply on the one you want, or generate original music from a text prompt using Lyria. Music selection now lives entirely in the Library panel — the older picker previously in the Audio tab has been removed." },
      { q: "How do I see what music is currently applied, or remove it?", a: "Open the Audio tab in the editor sidebar. Once music is applied, you'll see \"Now playing: [track name]\" along with a Change button (jumps back to the Library's Music section to pick something else) and a Clear button (removes the music track entirely). The Music volume slider is also here and works the same as always." },
      { q: "Can I separate stems from a music track?", a: "Yes. Use the Fadr stem separation feature (8 credits per minute of audio) to split any track into Vocals, Drums, Bass, and Instrumental." },
      { q: "How do I add voiceover?", a: "Click VO in the transport bar to open the Voice Over panel. Choose a tier (Standard or Premium), filter by gender/accent/language, preview a voice, then generate. Voiceover is automatically synced to your scene duration." },
      { q: "What is BPM detection?", a: "Fadr automatically detects the BPM and key of your music track, helping you sync cuts and transitions to the beat." },
      { q: "Why does my music track show the wrong title on the timeline?", a: "Track titles for stock and generated music now display correctly once applied via the Music panel's Apply button. Note: titles for manually uploaded tracks are not yet fixed — this is a known issue we're still working on." },
      { q: "Why did my long music track show as a short clip on the timeline?", a: "This was a bug — now fixed. Music tracks now correctly display and can be dragged at their real, full duration on the timeline. Previously, longer tracks could appear as a short, fixed-length clip regardless of their actual length." },
    ]
  },
  {
    title: "Voice Over",
    items: [
      { q: "What is the difference between Standard and Premium voices?", a: "Standard voices are fast and cost-effective — ideal for most reels. Premium voices offer richer, more expressive audio with broader multilingual coverage. Switch between tiers using the Standard / Premium toggle at the top of the Voice Over panel." },
      { q: "How do I find the right voice?", a: "Use the filter controls (gender, accent, language) to narrow the catalog, or type in the search box. Click any voice card to hear a short preview before committing." },
      { q: "Can I apply a voice to just one scene or all scenes?", a: "Both. After selecting a voice and entering your narration, click 'Apply to this scene' for the current scene only, or 'Apply to all scenes' to regenerate voiceover for every scene in the reel with the same voice." },
      { q: "How do I control voiceover speed?", a: "Use the Speed slider in the Voice Over panel (range 0.5×–2.0×). Adjust before generating — the speed is baked into the audio at generation time." },
      { q: "Are multilingual voices available?", a: "Yes. Standard tier includes multilingual voices that speak any language, plus regional voices for a chosen language (select from the Language dropdown). Premium tier voices automatically handle 29+ languages; you can also select a language to get additional regional Premium voices." },
      { q: "Where are my favourite voices?", a: "Star any voice in the Voice Over panel (mic icon in the editor rail) — Standard or Premium tab. Click the Favourites toggle to filter to starred voices only. Favourites persist across sessions." },
      { q: "I see \"Popular\" badges on some voices — what does that mean?", a: "Voices marked Popular are community-cited favourites. Currently Natasha and Aaron in the Premium tab carry this badge." },
      { q: "What do \"Standard+\", \"Premium HD\" mean on voice badges?", a: "These are tier labels indicating voice quality level. Standard+ (formerly WaveNet) is high quality; Premium HD (formerly Chirp3-HD) is the highest quality tier." },
    ]
  },
  {
    title: "Sequencer & Timeline",
    items: [
      { q: "How do I reorder scenes?", a: "Drag scene clips in the VIDEO track of the sequencer to reorder them. The preview updates in real time." },
      { q: "How do I trim a scene?", a: "Drag the left or right edge of a clip in the sequencer to trim its in/out points." },
      { q: "What is the B-Roll track for?", a: "The B-Roll track lets you overlay additional footage on top of your main A-Roll video. Drag stock or uploaded clips onto the B-Roll track." },
      { q: "Can I resize and reposition B-Roll clips?", a: "Yes. Click a B-Roll clip's icon in the timeline, or click it directly in the canvas during its active time window, to open the B-Roll panel. From there, drag the clip directly on the canvas or use the Position X, Position Y, and Size sliders. Leaving all sliders untouched keeps the clip full-frame, exactly as before." },
      { q: "Can B-Roll clips animate in and out?", a: "Yes. In the B-Roll panel, set an Enter animation and an Exit animation independently — Slide or Fade for each — so a clip can, for example, slide in and fade out." },
      { q: "How do I add transitions?", a: "Click the Transitions icon in the left sidebar. Choose Cut, Fade, Slide, or Zoom. Apply per-scene or to all scenes." },
      { q: "What speed options are available?", a: "0.25x, 0.5x, 1x, 1.5x, 2x playback speed in the sequencer toolbar. Slow motion regions can be set per clip." },
      { q: "How do I mute or change the volume of a clip?", a: "Use the mute button and volume slider on a track or clip in the sequencer — both now work correctly and the result is reflected in preview and export." },
      { q: "What is the Safe Zone overlay?", a: "A visual guide showing where each platform (TikTok, Instagram Reels, YouTube Shorts) typically places its own UI — captions, buttons, profile info — so you can avoid putting important text or action there. Toggle it on next to the captions button in the sequencer and pick a platform. It's a passive reference only — nothing is automatically enforced or blocked." },
    ]
  },
  {
    title: "Content Plan",
    items: [
      { q: "What is Content Plan?", a: "Content Plan (/content-plan) is a scheduling and ideation workspace that helps you plan, generate, and track reels across an entire month. You can see your content calendar at a glance and manage each piece from idea through to published." },
      { q: "How does 'Plan a Month' work?", a: "Click '+ Plan a Month' and choose your brand, content pillars (Authority, Trend, Community), platforms, and posting frequency. Onyx generates a month-long schedule of content ideas with hook text, pillars, and target platforms pre-assigned. You can edit or delete individual items before saving." },
      { q: "What are the Calendar and Kanban views?", a: "Calendar view shows your content mapped to specific dates — you can drag items between days to reschedule. Kanban view shows all items grouped by status (Idea → Hook Generated → Reel Generated → Marked as Scheduled → Published) so you can track production progress." },
      { q: "How do I turn a plan item into a reel?", a: "Open any plan item and click 'Generate Reel'. This creates a draft reel in the editor pre-loaded with the item's hook text and platform. AI video generation inside the editor is a separate step." },
      { q: "Does Content Plan cost extra credits?", a: "No. Planning a month and generating hooks uses the same credits as the standalone Hook Generator and Campaign Generator tools. Generating a reel from a plan item creates a stock-footage draft — no credits are charged at that step. AI video scenes inside the editor are charged separately per model." },
      { q: "Can I add extra context to a Content Plan item before generating a reel?", a: "Yes — open any Content Plan item and look for the 'Additional Context (optional)' field below the Hook Text. Add talking points, specific stats, or details you want included. This context flows into the reel generation step and produces more specific, substantive scenes." },
      { q: "Can I change the hook on a Content Plan item?", a: "Yes — click any of the 'Hook Variations' shown in the item detail. The selected variation becomes the active Hook Text, gets an 'ACTIVE' badge, and persists to the database." },
      { q: "What's the difference between Additional Context and Shot Sequence on a Content Plan item?", a: "Additional Context feeds narration content and talking points into script generation — what the scene should say. Shot Sequence is a separate field that governs framing and shot structure instead — how the scene should be shot (e.g. wide establishing shot, then a close-up push-in). Both are optional and flow into the same reel generation step." },
      { q: "Can I navigate the Content Plan calendar to a different month?", a: "Yes — use the ‹ › arrows next to the calendar to move to the previous or next month. The plan dropdown automatically syncs to whichever plan covers the month you're viewing, or shows no selection if none does. Months with no plan yet still render as a normal empty calendar with a 'Plan a Month' prompt." },
      { q: "Can I delete a Content Plan?", a: "Yes — select the plan from the dropdown, then click the trash icon next to it and confirm. This permanently deletes the plan and its items. Any reels you've already generated from that plan are not deleted — they stay in your Projects independently." },
    ]
  },
  {
    title: "Planner",
    items: [
      { q: "What is the Weekly Publishing Planner?", a: "Planner (/planner) is a 7-day calendar view of posts you've already scheduled through Publish, grouped by platform. You can see everything queued to go out this week at a glance, reschedule the date/time, or cancel a post — all in one place." },
      { q: "How is Planner different from Content Plan?", a: "Content Plan is where you come up with ideas, generate hooks, and turn them into reels — it's a production workspace for content that doesn't exist as a finished video yet. Planner only shows posts that already have a real scheduled send time set via Publish. It doesn't generate anything; it's a view-and-rearrange layer over posts that are already done and queued." },
      { q: "How do I reschedule a post from Planner?", a: "Find the post on its current day and use the date/time field shown on the post card to pick a new time. It updates immediately — no need to cancel and re-schedule." },
      { q: "Can I cancel a scheduled post from Planner?", a: "Yes — click Cancel on the post card and confirm. This is the same cancel action available from the Publish page; it stops the post from going out." },
      { q: "Why don't I see a post I scheduled in Content Plan showing up in Planner?", a: "Content Plan's 'Marked as Scheduled' status is a note you set yourself on a content idea — it doesn't create a real scheduled post. Planner only shows posts that have actually been scheduled through Publish, with a real send date and platform attached. Today these are two separate systems: marking something 'Marked as Scheduled' in Content Plan is just a status label, and won't make it appear in Planner until you actually schedule that reel through Publish." },
    ]
  },
  {
    title: "PPT to Video",
    items: [
      { q: "Does PPT to Video extract my slide images and colours?", a: "Yes — when you upload a PPTX, any embedded images are extracted and added to your Library panel in a folder named after the presentation. Your slide's colour scheme is also extracted and can be applied to a brand via the 'Apply to Brand' button shown after extraction." },
      { q: "My PPT-generated reel has the wrong brand colours/logo.", a: "Ensure you select your brand from the dropdown on the PPT to Video page before clicking 'Open in Editor'. The brand selection now correctly flows through to the generated reel." },
    ]
  },
  {
    title: "Screen Recorder",
    items: [
      { q: "How do I record my screen with audio?", a: "Open Screen Recorder, select your audio mode before clicking Record: 'No audio' for video only; 'Tab audio' to capture a browser tab's audio (must share a Chrome Tab — not Window or Screen — and the tab must be actively playing audio before you click Record); 'Microphone' to record your voice alongside the screen. Note: some platforms (e.g. Skool) block tab audio capture — use video-only with captions enabled for those." },
    ]
  },
  {
    title: "Publishing",
    items: [
      { q: "Which platforms can I publish to?", a: "Instagram, TikTok, YouTube, and LinkedIn. Connect your accounts under Account → Social Connections." },
      { q: "Why can't I publish to Instagram?", a: "Instagram requires Meta App Review for Advanced Access permissions. This is currently in progress. Once approved, Instagram publishing will work for all users." },
      { q: "How do I connect my TikTok account?", a: "Go to your Account page and select the brand you want to connect TikTok to under Social Media Connections. Click Connect next to TikTok, log in with your TikTok account, and approve the requested permissions. Once connected, you'll see your TikTok account linked and ready for publishing." },
      { q: "Why can't I publish to TikTok yet?", a: "Onyx Reelz's TikTok integration is currently pending TikTok's review. While your account can be connected, direct publishing to TikTok will activate automatically once TikTok approves the integration — no action is needed from you. We'll keep this page updated as that progresses." },
      { q: "What permissions does Onyx Reelz need from TikTok?", a: "When you connect TikTok, Onyx Reelz requests access to your basic profile info (avatar and display name) and permission to post content directly to your TikTok profile on your behalf. We never post without you explicitly choosing to publish a reel." },
      { q: "How do I disconnect TikTok?", a: "Go to your Account page, find TikTok under Social Media Connections for the relevant brand, and click Disconnect. This immediately revokes Onyx Reelz's access to your TikTok account." },
      { q: "Can I schedule posts?", a: "Yes. When publishing, select a future date and time. The scheduler will automatically post at your chosen time." },
      { q: "What video specs does each platform need?", a: "Onyx Reelz automatically exports in the correct format for each platform. 9:16 for Stories/Reels/Shorts, 16:9 for YouTube, 1:1 for feed posts." },
      { q: "Does Onyx Reelz limit or check my hashtags?", a: "Yes. Each platform has its own real hashtag limit, and Onyx Reelz shows a live count as you type and automatically trims hashtags down to that platform's limit when you schedule or publish, so a post never gets rejected for having too many." },
    ]
  },
  {
    title: "Account & Billing",
    items: [
      { q: "How does the credit system work?", a: "Credits are used for AI features. 100 credits = $1. Credits never expire. AI video generation cost varies by model and scene length (8–606 credits per scene). Standard voiceover is free with no minute limit; Premium voiceover costs 3 credits per scene." },
      { q: "How do I earn free credits?", a: "Go to /earn for your referral link and the current, accurate reward details." },
      { q: "What's included in the free plan vs. paid add-ons?", a: "The free plan includes the full editor, unlimited standard voiceover, and 1 brand, no card required. Credits (bought separately, never expire) pay for AI video generation, premium voiceover, avatars, music, and clean/watermark-free downloads. Two optional $15/month add-ons: Unlimited Brands (create more than 1) and Auto-posting (one-click publish to Instagram, YouTube, and LinkedIn). See /pricing for exact numbers." },
      { q: "How do I reset my password?", a: "Click 'Forgot password' on the login page. A reset link will be sent to your email from noreply@onyx-reelz.com." },
      { q: "Is yearly billing available?", a: "Not at the moment — the yearly billing toggle has been removed for now. Only monthly pricing is currently available on the Pricing page." },
    ]
  },
  {
    title: "Sharing",
    items: [
      { q: "My share link shows \"Sign in to watch this reel.\"", a: "This was a bug — now fixed. Share links are fully public and require no login. If you copied a share link before July 2026, try generating a new one from the Share button in the editor." },
    ]
  },
  {
    title: "Export",
    items: [
      { q: "When I click Export, the video opens in my browser instead of downloading.", a: "This was a bug — now fixed. Clicking Export triggers a direct file download. If it still opens in the browser, hard-refresh and try again." },
    ]
  },
  {
    title: "Troubleshooting",
    items: [
      { q: "My scene shows \"Still generating…\" — is something wrong?", a: "No — this means the video is still being created and hasn't been lost. AI video generation typically takes 2–4 minutes per scene, sometimes longer if lip-sync is also being applied. You can safely close the tab or step away — your generation keeps running on our servers regardless of whether your browser is open. When you come back and reload the editor (or just switch back to the tab), we'll automatically check for your finished video and load it in — no need to regenerate. If a scene still shows \"Still generating…\" after 10+ minutes, check your credits balance and contact support if the problem continues." },
      { q: "Export failed with an error", a: "Check that all scenes have valid media (not broken URLs). Try removing and re-adding problematic scenes. If using AI-generated clips, ensure they completed successfully in AI Studio." },
      { q: "My captions aren't appearing on export", a: "Ensure captions are enabled (CC button active), the scene has narration text, and 'Show captions on canvas' is checked in the scene panel." },
      { q: "The editor is running slowly", a: "Close other browser tabs. The editor is desktop-only and works best in Chrome. Reduce the number of FX clips if performance is an issue." },
      { q: "I can't connect my social account", a: "Make sure you're using a Business/Creator account for Instagram. Personal accounts don't support API publishing. Try disconnecting and reconnecting under Account settings." },
    ]
  },
];
