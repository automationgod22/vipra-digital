# Vipra Digital website

A static site: 5 HTML pages plus `assets/`. No build step needed to host it.

## Go live
1. Upload everything in this folder to your hosting (Hostinger, Netlify, Vercel, Cloudflare Pages, or your own server).
2. Point `vipradigital.com` at it. `index.html` is the home page.

## Things to edit
- **WhatsApp number, email, n8n webhook:** top of `assets/vipra.js` (`VIPRA_CONFIG`).
- **Proof wall:** search the HTML for `PLACEHOLDER` and drop in your WhatsApp / Instagram screenshots and client reviews.
- **Social links:** footer, search `PLACEHOLDER` (Instagram, YouTube, LinkedIn, X).

## Contact form → n8n → Baserow
Set `webhookUrl` in `assets/vipra.js` to your n8n Webhook node URL (method POST, JSON).
If it's empty, the form hands the enquiry over to WhatsApp instead.

The form POSTs this JSON (make these Baserow columns):

| field | example |
|---|---|
| name | Rahul Sharma |
| phone | +919876543210 |
| business | Sharma Sweets |
| city | Jaipur |
| business_type | Shop / store |
| need | New website |
| budget_inr | 395000 |
| budget_label | ₹3,95,000 |
| timeline | Within a month |
| message | We sell sweets... |
| page, referrer, utm_source, utm_campaign | tracking |
| submitted_at | 2026-10-27T12:00:00.000Z |
| source | vipradigital.com contact form |

In n8n, enable CORS for your domain on the Webhook node (Allowed Origins: `https://vipradigital.com`) and return a 200.
