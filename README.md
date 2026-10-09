# Gig Tracker (Netlify or Vercel)

## 1. Free accounts you need
- **Upstash** (upstash.com): create a Redis database. Copy the REST URL and REST token.
- **Resend** (resend.com): create an API key. Sign up with the email you want reminders sent to.
  (Without a verified domain, Resend only delivers to your own signup email. That's all you need.)

## 2. Environment variables (set on whichever host you use)
APP_PASSWORD               pick a password for the app
UPSTASH_REDIS_REST_URL     from Upstash
UPSTASH_REDIS_REST_TOKEN   from Upstash
RESEND_API_KEY             from Resend
REMIND_TO                  your email address
SITE_URL                   your live site address, e.g. https://yourgigs.netlify.app (used in the invoice link)
CRON_SECRET                (Vercel only) any long random string

## 3. Deploy
Push this folder to GitHub, then import the repo in Netlify or Vercel. No build command needed.
Reminders run daily at 13:00 UTC (8am Chicago in summer, 7am in winter).

## 4. Test reminders without waiting
Netlify: Functions tab, "remind", Run.   Vercel: Settings, Cron Jobs, Run.
Or add a gig dated today and run it. You should get an email within a minute.

Reminders send at 7 days, 2 days and the day of each gig. Moving a gig's date resets them.

## Invoice link
The morning-of email includes a link to invoice.html for that gig. It shows the fee, deposit and balance,
plus the Zelle / Cash App / PayPal info, and has a Download PDF button. Forward the link or the PDF to
your client. The link only exposes that one invoice. Changing APP_PASSWORD invalidates old links.
To change the payment details, edit the CASH / ZELLE / QR lines at the top of public/invoice.html and public/index.html.

## Marking paid and follow-ups
- In the app, open a gig and tap **Mark paid**. The day-of and follow-up emails also have a "Mark paid" link.
- Starting the day after a gig, if it has a fee, a balance is still owed and it isn't marked paid, you get a
  follow-up email every 2 days (with the client's contact info and the invoice link) until you mark it paid.
