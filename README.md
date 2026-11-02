# Gig Tracker (Netlify or Vercel)

Settings (environment variables): APP_PASSWORD, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
RESEND_API_KEY, REMIND_TO, SITE_URL (and CRON_SECRET on Vercel only).

## Features
- Gigs by date, details, Mark paid, invoice PDF you can share, calendar alerts.
- Email reminders 1 week, 2 days and the morning of each gig; invoice link in the day-of email.
- Follow-up emails every 2 days after a gig until it is marked paid.
- Booking requests: send clients your-site/request.html (the app has a "Copy booking link" button).
  Each request arrives as a "Needs your review" item in the app and as an email with a review link.
  Approve it and it becomes a normal gig. Deny it and it is removed.

## Updating
Upload the files in this folder to GitHub (replace existing ones). Netlify redeploys by itself.
