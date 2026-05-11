# Netlify Deployment

Prototype is hosted on Netlify as a static site (publish directory: `Prototypes/PROTOTYPE/`).

## URLs

- **Production:** https://impact-internship-portal.netlify.app
- **Admin dashboard:** https://app.netlify.com/projects/impact-internship-portal
- **Build logs:** https://app.netlify.com/projects/impact-internship-portal/deploys
- **Function logs:** https://app.netlify.com/projects/impact-internship-portal/logs/functions
- **Edge function logs:** https://app.netlify.com/projects/impact-internship-portal/logs/edge-functions

## Site details

- **Site name:** `impact-internship-portal`
- **Project ID:** `65497097-8b5c-471e-a0c9-dc7ddea0fb2c`
- **Team / account slug:** `matthew-smith` (display name: Rapideo)
- **Owner:** Matthew Smith (matthew.smith@rapideo.com)
- **Initial deploy:** 2026-04-21
- **Initial deploy ID:** `69e79e54c197fd450e1d0fd4`

## Redeploying

From the repo root, with the Netlify CLI installed and authenticated:

```bash
# Production
netlify deploy --prod --dir=Prototypes/PROTOTYPE

# Draft preview (gets a throwaway URL, doesn't touch prod)
netlify deploy --dir=Prototypes/PROTOTYPE
```

The repo is already linked via `.netlify/state.json` (gitignored), so no re-linking needed on this machine. On a fresh clone, run `netlify link --name impact-internship-portal` first.

## Notes

- No build step — the site is plain static HTML/CSS/JS, uploaded as-is.
- `.netlify/` is in `.gitignore`; don't commit it.
- This is a prototype with mock data only. No secrets, no backend, no auth (the login page accepts any input).
