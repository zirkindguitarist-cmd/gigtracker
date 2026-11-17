# Gig Tracker (Netlify or Vercel)

Settings (environment variables): APP_PASSWORD, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
RESEND_API_KEY, REMIND_TO, SITE_URL (and CRON_SECRET on Vercel only).
For photo/video uploads also: CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET.

## Features
- Gigs by date, details, Mark paid, invoice PDF you can share, calendar alerts.
- Email reminders 1 week, 2 days and the morning of each gig; invoice link in the day-of email.
- Follow-up emails every 2 days after a gig until it is marked paid.
- Booking requests: send clients your-site/request.html (the app has a "Copy booking link" button).
  Each request arrives as a "Needs your review" item in the app and as an email with a review link.
  Approve it and it becomes a normal gig. Deny it and it is removed.

## Updating
Upload the files in this folder to GitHub (replace existing ones). Netlify redeploys by itself.

## Pages
- /            public website (services, gallery, reviews, contact, request a gig)
- /request.html  booking request form
- /app         your private gig tracker (log in with APP_PASSWORD)
- /admin.html  your site admin: upload photos/videos, approve reviews, edit services (same password)

## Photo and video uploads (Cloudinary, free)
1. Sign up at cloudinary.com. On the dashboard, copy your Cloud name.
2. Settings > Upload > Upload presets > Add upload preset. Set Signing mode to Unsigned. Save, copy the preset name.
3. In Netlify, add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET, then redeploy.
4. Open /admin.html, log in, and choose files. Free plan limits: about 100 MB per video, 10 MB per photo.
Deleting from the gallery only hides it from the site. The file stays in your Cloudinary account.

## Login (app and admin)
Sign in with APP_PASSWORD, then enter the 6-digit code emailed to REMIND_TO. The device stays signed in for 30 days.
- 8 wrong tries from one address locks that address out for an hour. A code allows 5 guesses and expires in 10 minutes.
- Changing APP_PASSWORD signs out every device.
- If the code email ever stops working (Resend problem), add a Netlify variable SKIP_CODE = 1 and redeploy to log in with the password only. Remove it once email works again.

## Confirming a booking to the client
When you approve a request (in the app, or from the email link) the app shows one-tap buttons to text or email the
client a confirmation from your own phone and email. That works with no setup.
To send it automatically instead, add these Netlify settings and redeploy:
- Email: MAIL_FROM, for example  Yitschok Zirkind <bookings@yourdomain.com> . Resend only emails other people
  after you verify your own domain in Resend (Domains). Replies go to REMIND_TO.
- Text: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (your Twilio number, like +18005550123).
  US texting needs Twilio's number registration or toll-free verification before messages are delivered.
Each booking is only confirmed once, even if you edit it later.
