# Posting generated ads

The [browser-use ad-use example](https://github.com/browser-use/browser-use/tree/main/examples/apps/ad-use) generates Instagram image ads and TikTok video ads from a landing page (Browser Use + Gemini image + Veo3). It **does not post** the ad; it saves PNG/MP4 to disk.

This app **posts** drafts to Instagram, X, or Facebook using a Browser Use agent. To post an ad you generated with ad-use:

## 1. Get a public URL for the ad

The ad-use example saves files locally (e.g. `output/ad_20250302_123456.png`). The posting agent needs a **URL** it can open.

**Option A – Upload to Supabase Storage (or any host)**  
Upload the generated file to a bucket, make it public, and use the object URL as `image_url` (or `video_url`).

**Option B – Use our draft flow with a placeholder**  
Create a draft in the app (Suggest a post), approve it, then before publishing replace the draft’s `image_url` in the DB with a URL that points to your generated ad image (after you’ve uploaded it somewhere public).

**Option C – Integrate ad-use into this app**  
Run the ad-use flow (analyze URL → generate image with Gemini) in the backend, upload the result to Supabase Storage, create a draft with that `image_url`, then the user approves and clicks Publish. That would require adding the ad-use logic (and `GOOGLE_API_KEY` / Gemini) to this codebase.

## 2. Publish the draft

Once the draft has a public `image_url` (and optionally `video_url`):

1. In the app: **Social** tab → find the draft → **Approve** → **Publish now**.
2. The backend runs a Browser Use task that:
   - Opens the platform (Instagram / X / Facebook).
   - Opens the media URL, downloads or captures the image/video.
   - Creates a new post, uploads that media, sets the caption, and publishes.

**Requirements**

- `BROWSER_USE_PROFILE_ID` must be set and the profile must be **logged in** to the target platform (Instagram, X, or Facebook).
- The media URL must be publicly reachable (no auth) so the browser can open it.

## 3. Ad-use flow summary

From the [ad-use README](https://github.com/browser-use/browser-use/blob/main/examples/apps/ad-use/README.md):

1. **Analyze** – Agent visits the landing page, extracts brand/tagline/CTA, takes a screenshot.
2. **Generate** – Instagram: Gemini 2.5 Flash Image; TikTok: Veo3. Outputs PNG or MP4.
3. **Post (this app)** – Upload the PNG/MP4 to a public URL, create or update a draft with that URL, then use **Publish now** so our Browser Use agent posts it to the platform.
