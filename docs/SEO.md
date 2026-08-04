# SEO Platform

## Public APIs

- `GET /api/public/seo/site` — sitewide SEO + tracking IDs
- `GET /api/public/seo/resolve?path=` — merged meta for a path
- `GET /api/public/seo/robots.txt` — robots body from admin
- `GET /api/public/cities` / `GET /api/public/cities/:slug` — city SEO hubs
- `GET /api/public/seo-pages/:slug` — programmatic intent×city pages
- `GET /api/public/internal-links` / `GET /api/public/nav-links`
- `GET /api/public/sitemap-urls` — expanded sitemap feed (cities + programmatic + CMS)

## Admin

- `/api/admin/seo/*` — site settings, page meta, redirects, locations, intents, programmatic generate, templates, content pages, orphans
- Frontend: `/admin/seo`

## Seeds

```bash
npm run seed:seo
```

Seeds 500+ cities (priority Tier-1 + extras), airports, 22 intents, Tier-1 programmatic pages, robots/host defaults, blog author, content templates.
