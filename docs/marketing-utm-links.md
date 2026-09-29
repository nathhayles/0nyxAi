# UTM link format for posts

Every link to Onyx Reelz that you post should carry UTM parameters so signups
and later funnel steps can be attributed to the post.

```
https://<your-domain>/?utm_source=<where>&utm_medium=<type>&utm_campaign=<what>
```

| Param | Required | Meaning | Example |
|---|---|---|---|
| `utm_source` | yes | The platform / place the link lives | `instagram`, `tiktok`, `youtube`, `x`, `newsletter` |
| `utm_medium` | yes | The kind of placement | `social`, `bio_link`, `email`, `paid_social`, `referral` |
| `utm_campaign` | yes | The specific post / campaign | `onyx_reel_demo` |
| `utm_content` | no | Variant within a campaign (A/B) | `hook_a`, `story` |
| `utm_term` | no | Keyword (paid search) | `ai_reel_maker` |

Example (point it at the signup page, see below): `https://<your-domain>/signup?utm_source=instagram&utm_medium=social&utm_campaign=onyx_reel_demo`

How it is read (nothing is stored on the visitor's device)
- UTMs and the referrer are only read **in memory, when someone signs up in the same page visit**. They are never written to localStorage, sessionStorage, IndexedDB or cookies, so a reload, a full page navigation or closing the tab forgets them.
- The site's "Sign up" buttons are normal links (full page load), so a visitor who lands on `/pricing?utm_...` and then clicks "Sign up" **loses the UTMs**. To get attribution reliably, point campaign links **straight at the signup page**:
  `https://<your-domain>/signup?utm_source=instagram&utm_medium=social&utm_campaign=onyx_reel_demo`
- Everything else is covered by the optional **"How did you hear about us?"** dropdown on the signup form (Instagram, TikTok, YouTube, LinkedIn, Facebook/Meta, Google search, ChatGPT or another AI assistant, a friend or colleague, a blog or Learn guide, Other). The answer is stored as `self_reported_source` (and up to 100 characters of free text for "Other") and is reported next to `utm_source`, not merged with it.
- A visitor with Global Privacy Control / Do Not Track on, or `localStorage.onyx_analytics_consent = "denied"`, has their UTMs/referrer skipped. The dropdown answer is still sent, because they typed it.

Rules of thumb
- Lowercase, `snake_case`, no spaces. `Instagram` and `instagram` are different rows in the report.
- One campaign name per post or push; reuse `utm_source`/`utm_medium` values so they group.

Reading the results: `GET /api/admin/analytics/marketing-funnel` (admin only) or
`select * from marketing_funnel_summary order by window_label, signups desc;`
(signups, first reel created, first reel published, first credit purchase, by `utm_source` x `utm_campaign` x `self_reported_source` for `7d` and `30d`).
There is no visit count: without storing anything on the device we cannot count anonymous visitors.
