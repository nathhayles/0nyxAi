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

Example: `https://<your-domain>/?utm_source=instagram&utm_medium=social&utm_campaign=onyx_reel_demo`

Rules of thumb
- Lowercase, `snake_case`, no spaces. `Instagram` and `instagram` are different rows in the report.
- One campaign name per post or push; reuse `utm_source`/`utm_medium` values so they group.
- The link can point at any page (`/pricing?utm_...`); the landing path is recorded too.
- Attribution is **first-touch**: the first UTM link a browser ever lands on wins, and later visits never overwrite it.
- A visitor with Global Privacy Control / Do Not Track on, or `localStorage.onyx_analytics_consent = "denied"`, is not tracked.

Reading the results: `GET /api/admin/analytics/marketing-funnel` (admin only) or
`select * from marketing_funnel_summary order by window_label, signups desc;`
(visits, signups, first reel created, first reel published, first credit purchase, by `utm_source` x `utm_campaign` for `7d` and `30d`).
