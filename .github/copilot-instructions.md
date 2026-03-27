# Copilot Workspace Instructions for PreciseGovCon Admin Portal

## Overview
This workspace is a Next.js 14+ admin portal for PreciseGovCon, using TypeScript, Prisma, Tailwind, and MUI. It includes custom CRM, analytics, outreach, and subscription management features. These instructions guide Copilot agents to follow project conventions and avoid common pitfalls.

## Build & Test Commands
- **Development:** `npm run dev` (Next.js dev server, port 3001)
- **Build:** `npm run build` (Prisma generate, Next.js build)
- **Start:** `npm run start` (Next.js start, port 3001)
- **Lint:** `npm run lint`
- **Prisma:**
  - Migrate: `npm run db:migrate`
  - Generate: `npm run db:generate`
  - Studio: `npm run db:studio`
  - Seed: `npm run db:seed`

## Key Conventions
- **TypeScript only**: All code must be in TypeScript.
- **App directory routing**: Use Next.js app directory for routing and API endpoints.
- **Prisma ORM**: All DB access via `lib/prisma.ts`.
- **Styling**: Use Tailwind CSS and MUI components. Font: Aptos (see `public/fonts/`).
- **Env config**: Use `.env` for secrets; never commit secrets.
- **Component location**: Place shared React components in `components/`.
- **API routes**: Place under `app/api/` using Next.js route handlers.
- **Scripts**: Place one-off scripts in `scripts/`.

## Pitfalls & Gotchas
- **Prisma migration**: Always run `db:generate` after changing the schema.
- **Port conflicts**: Dev and prod both use port 3001.
- **Font loading**: Use `public/fonts/fonts.css` for Aptos font.
- **Email**: Use `lib/email.ts` and `lib/email-sendgrid.ts` for all email logic.
- **Stripe**: Use `lib/stripe-sync.ts` for Stripe sync logic.

## Documentation
- No `README.md` or docs/ found. Add docs to `docs/` or `README.md` as needed.

## Example Prompts
- "Add a new API route for user invites."
- "Refactor a component to use Aptos font."
- "Add a script to backfill NAICS codes."

## Related Customizations
- Suggest creating `/create-instruction font-usage` to enforce Aptos font usage in all UI components.
- Suggest `/create-skill prisma-migration` to automate Prisma migration and generation steps.
