# ProjectHub

ProjectHub is a maker discovery platform built with Next.js, Supabase, and Razorpay.

## Core product
- Publish and discover projects
- Project ownership and GitHub verification
- Project upvotes, comments, follows, and notifications
- Community forums and discussions
- Featured promotion and homepage auctions
- Razorpay payments and winner settlement
- Admin control room with delegated permissions
- ProjectHub Newsletter with public archive

## Stack
- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth, Postgres, Storage
- Razorpay
- Resend
- Tailwind CSS

## Development
npm install
npm run dev
npm run typecheck
npm run lint
npm run build

## Environment
Copy .env.example to .env.local and configure Supabase, Razorpay, and Resend values.

## Database
Supabase migrations live under supabase/migrations. Production schema changes must be added as new migrations and applied without rewriting existing migrations.

## Important rules
- Preserve existing ProjectHub functionality when modifying the application.
- Keep payment and auction state server-authoritative.
- Keep admin permissions separate from public verification tiers.
- Prefer additive, reversible changes over destructive migrations.