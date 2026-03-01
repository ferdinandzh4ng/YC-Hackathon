---
name: Post drafting and generation pipeline
overview: Pipeline that uses company data and post-quality analyses to draft posts via Browser Use, suggests drafts at optimal times (agent picks when to post), allows user to request drafts manually, and publishes only after approval. Image/Video = Imagen/Veo3; drafting and publishing = Browser Use only.
todos: []
isProject: false
---

# Post drafting and generation pipeline (merged)

## Goal

(1) Use company + post-quality insights to decide **what** to post and **when** (agent picks optimal time and suggests a draft). (2) Generate image (Imagen) or video (Veo3 for Instagram only) plus caption. (3) Store drafts and require user permission. (4) Publish to Instagram, X, or Facebook only after approval.

**Browser Use only** for all agent steps except image and video: drafting and publishing are Browser Use tasks; image = Imagen, video = Veo3.

**Proactive + manual:** The agent determines the best time to post from the rubric and suggests a draft (e.g. when user opens Social tab or via cron). Users can also request a draft anytime ("Suggest a post").

## Data inputs (already available)

- **Company:** [main.py get_company](backend/main.py) — name, market, location, competitors.
- **Post-quality insights:** [GET /companies/{id}/post-quality-insights](backend/main.py) — analyses (hook_strength, signals, post_type, raw_snippet), rubric_summary (score_bands, average_score). Used for "what works" and "when to post" (timing in rubric: peak windows by platform).

## 1. Draft strategy — Browser Use only

- **Where:** [backend/agents/drafting.py](backend/agents/drafting.py); use existing [run_task](backend/agents/base.py) (Browser Use Cloud).
- **Inputs:** Company name, market, location; post-quality analyses; target platform (`instagram` | `x` | `facebook`) or **unspecified** so the agent picks platform and optimal time.
- **Logic:** Run a **Browser Use task** whose prompt includes company context + post-quality insights + current date/time. The agent outputs: recommended **platform**, **recommended_time_window** (e.g. "Tue–Thu 6–9 AM"), post_type, caption, image_prompt, video_prompt (Instagram only). Use Browser Use structured output (Pydantic schema).
- **Output:** Structured schema consumed by Imagen/Veo3 and draft storage.

## 2. Image generation (Imagen)

- **Where:** e.g. `backend/services/image_generation.py`. Google Imagen (Vertex AI or Imagen 3 API). Input: `image_prompt` from draft. Output: image URL stored in draft. Used for X and Facebook, and Instagram when image-only. **MVP:** optional; can use placeholder URL until GCP is configured.

## 3. Video generation (Veo3, Instagram only)

- **Where:** e.g. `backend/services/video_generation.py`. Google Veo 3. Input: `video_prompt` from draft. **MVP:** optional; placeholder until GCP is configured.

## 4. Draft storage and permission flow

- **Table `post_drafts`:** id, company_id, user_id, platform, status (draft | approved | published | rejected), caption, image_url, video_url (nullable), recommended_time_window, post_type, created_at, published_at (nullable).
- **APIs:**
  - **POST /companies/{id}/draft-post:** Optional body `platform`. If omitted, agent picks platform and optimal time. Runs Browser Use draft task → (Imagen/Veo when configured) → saves draft, creates `draft_ready` notification, returns draft.
  - **GET /companies/{id}/drafts:** List drafts for the company.
  - **POST /drafts/{id}/approve:** Set status=approved.
  - **POST /drafts/{id}/reject:** Set status=rejected.
  - **POST /drafts/{id}/publish:** Browser Use publish task → set status=published, published_at.
- **Permission:** Posting happens only after user approves and clicks Publish.

## 5. Publishing — Browser Use only

- **Browser Use only:** Task that, given draft (caption + image/video URL), opens the platform, uses logged-in profile, uploads asset + caption, clicks Post. No platform APIs.
- **Trigger:** UI "Publish now" → POST /drafts/{id}/publish.

## 6. Notifications

- **draft_ready:** When a draft is created, insert notification (title e.g. "Draft ready for {company_name} — approve to post", link to company Social tab). Already implemented in notifications table and backend; wire when saving draft.

## 7. Frontend

- **Social tab:** List drafts (caption, recommended time, platform). "Suggest a post" button → POST draft-post (no platform) → agent picks optimal time and platform, returns draft. Show [Approve] [Reject]; on Approve, show "Publish now" → POST /drafts/{id}/publish. Optional: on Social tab load, auto-fetch drafts and show latest suggestion.

## Implementation order

1. Migration post_drafts; draft agent (Browser Use) with schema; no image/video yet.
2. POST/GET drafts, approve/reject/publish endpoints; draft_ready notification.
3. Frontend: drafts list, "Suggest a post", approve/reject, publish.
4. (Later) Imagen/Veo and asset storage.
