# FeyiFoods waitlist site

Static site (`index.html`) plus one serverless function (`api/waitlist.js`). No build step.

## Deploy to Vercel
1. Put this folder in a GitHub repo, then in Vercel choose **Add New > Project**, import the repo and click **Deploy** (framework preset: Other). Or run `npx vercel` in this folder.
2. **Store signups:** in your Vercel project open **Storage** and add **Upstash Redis** (Marketplace). It adds the environment variables the function reads. Redeploy once.
3. View signups in the Upstash console with `HGETALL feyifoods:waitlist` (one record per email, duplicates are ignored). Until storage is connected, signups only appear in Vercel > Logs.

## Edit
- Photos: add `images/hero.jpg`, `images/farm.jpg`, `images/cubes.jpg` (the page shows warm gradients until they exist).
- Contact details: replace the bracketed placeholders in the footer of `index.html`.
- Testimonials and the company story are placeholders to replace.
