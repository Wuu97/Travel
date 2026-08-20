# vinext-starter

A travel-planning application built with [vinext](https://github.com/cloudflare/vinext), Supabase Auth, and Supabase Postgres.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Supabase Auth And Cloud Chat History

This application uses Supabase Auth for email-and-password registration and
sign-in, plus phone-number registration and sign-in with an SMS verification
code. Supabase can require email confirmation after registration. Both AI
chat history and trip snapshots are stored in Supabase Postgres; no Cloudflare
D1 database or platform identity headers are required.

1. Create a Supabase project and enable **Email** authentication with the
  password provider. To use phone registration, enable **Phone** authentication
  and configure an SMS provider in Supabase.
2. Add `http://localhost:3000` and your deployed application URL to Auth
  redirect URLs.
3. Add these variables to an ignored `.env.local` file:
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor.
   It creates the shared-trip, membership, and expiring-invite tables in
   addition to the chat tables. Invite links require a signed-in user and add
   that user to the same shared trip.

Never expose a Supabase service-role key to the browser. Row Level Security on
`chat_sessions` and `trip_snapshots` ensures that users can only access their
own records. On first sign-in, local chat history is imported only if cloud
history is empty.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton

## Optional Amap Place Classification

Quick itinerary entry always uses local intent rules first. If a place is still
classified as `其他`, the browser calls the server-side `/api/places` route for a
high-confidence Amap POI category. Amap is optional: missing keys, unavailable
results, and provider errors all retain the local classification.

Set the Web Service key only in an ignored environment file:

```bash
AMAP_WEB_SERVICE_KEY=your_amap_web_service_key
```

The browser never receives this key. Amap-specific code is isolated in
`features/places/amap.ts`; the itinerary flow depends only on the shared
`PlaceProvider` interface, so another provider can replace it without changing
the UI or trip model.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
