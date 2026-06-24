# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Repflow is a Next.js 15 application for content creators and agencies to manage sponsorship deals, partnerships, and brand relationships. The platform connects creators with brands and provides tools for deal tracking, messaging, analytics, and payment processing.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm run test:auth` - Test authentication functionality
- `npm run test:amplify` - Test AWS Amplify authentication

## Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router (React 19)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: NextAuth.js with AWS Cognito
- **Backend API**: External API at `API_BASE_URL`
- **Database**: MongoDB (backend)
- **Payments**: Stripe
- **AI**: OpenAI GPT integration
- **Social APIs**: Instagram, YouTube, TikTok integrations

### Project Structure

```
app/
├── agency/          # Agency-specific features (roster, campaigns)
├── auth/            # Authentication pages (signin, signup, onboarding)
├── creator/         # Creator dashboard (deals, messages, portfolio, profile)
├── portfolio/       # Public creator portfolios
├── proposal/        # Deal proposal pages
├── api/             # API routes
│   ├── auth/        # Auth endpoints (signup, confirm, onboarding)
│   ├── email/       # Email sending
│   ├── instagram/   # Instagram OAuth & analytics
│   ├── youtube/     # YouTube OAuth & analytics
│   ├── stripe/      # Stripe payments
│   ├── ai/          # AI chat endpoints
│   └── upload/      # File uploads (S3)
components/          # React components (shadcn/ui + custom)
lib/                 # Shared utilities
├── api.ts           # Backend API client functions
├── auth-utils.ts    # Auth helpers (tokens, headers)
├── models.ts        # TypeScript type definitions
├── email-*.ts       # Email generation & templates
└── platform-icons.tsx
contexts/            # React contexts (SelectedUsersContext)
hooks/               # Custom React hooks
```

### Authentication & Authorization

**Authentication Flow:**
1. NextAuth.js handles session management
2. AWS Cognito provides identity & JWT tokens
3. Middleware (`middleware.ts`) protects routes:
   - `/creator/*` - Requires authentication
   - `/agency/*` - Requires authentication
   - `/proposal/*` - Requires authentication
   - `/auth/*` - Public
   - `/portfolio/*` - Public (creator discovery)
   - `/` - Public (landing page)

**Key Auth Functions** (`lib/auth-utils.ts`):
- `getAuthHeaders()` - Returns Bearer token headers for API calls
- `getAccessToken()` - Gets Cognito access token
- `getUserId()` - Gets current user ID from session
- `getCognitoTokens()` - Gets all Cognito tokens

**Important:** All backend API calls must include auth headers via `getAuthHeaders()`.

### Backend API Integration

**Base URL:** Set via `API_BASE_URL` constant in `app/constants/constants.ts`

**API Client** (`lib/api.ts`):
All backend communication goes through functions in this file:
- `getUser()` - Fetch current user data
- `getCompleteUserProfileData()` - Fetch profile, billing, referrals, team
- `updateUserProfile()` - Update profile fields
- `updateUserPreferences()` - Update user preferences
- `addDeal()` / `updateDeal()` / `getDealsGroupedByStatus()` - Deal management
- `getConversations()` / `sendMessage()` / `sendEmail()` - Messaging
- `addPlatform()` / `deletePlatform()` / `updatePlatform()` - Social accounts
- `getAllUsers()` / `getPublicUserPortfolio()` - Public data (no auth)

**Pattern:** API functions automatically inject auth headers and handle errors with fallbacks to mock data.

### Data Models

**Core Types** (`lib/models.ts`):
- `User` - Complete user object with profile, platforms, preferences, billing
- `UserProfile` - Public profile data (name, bio, avatar, social links)
- `UserPreferences` - Partnership types, deliverables, pricing tiers
- `Deal` - Sponsorship deal with status, deliverables, contacts, history
- `Platform` - Connected social accounts (YouTube, Instagram, etc.) with analytics
- `Conversation` / `Message` - Messaging between creators and brands
- `Deliverable` - Content deliverable with pricing (CPM, CVV, flat rate)

**Deal Statuses:** New Offer → Negotiating → Contracting → Drafting → Live → Complete (also: Archive, Lost, Abandoned)

**Message Types:** `EMAIL` or `AI_ASSISTANT`

### Social Platform Integrations

**YouTube** (`app/api/youtube/*`):
- OAuth flow: `/oauth/authorize` → `/oauth/callback`
- Analytics endpoint: `/analytics` (requires access token)
- Sync: `/sync` updates stored analytics

**Instagram** (`app/api/instagram/*`):
- OAuth flow: `/connect` → callback handling
- Demographics: `/demographics` fetches audience data
- Token updates: `/update-token` refreshes access tokens
- Sync: `/sync` updates stored analytics

**Platform Analytics:**
- YouTube: subscribers, views, watch time, demographics
- Instagram: followers, reach, engagement, reels views, demographics

### Stripe Payment Integration

**Subscription Tiers** (`app/constants/constants.ts`):
- **Starter:** $39/mo - 5 pre-qualified offers, basic features
- **Growth:** $179/mo - Unlimited offers, analytics, referrals
- **Scale:** $279/mo (disabled) - Team features, custom page

**Payment Flow:**
1. User selects tier
2. Frontend redirects to Stripe Payment Link
3. Stripe handles checkout
4. Webhook confirms payment (backend)
5. User tier updated in database

**Stripe API Routes:**
- `/api/stripe/prepare-payment-link` - Generate payment URL
- `/api/stripe/payment-success` - Post-payment redirect
- `/api/stripe/confirm-payment` - Verify payment status
- `/api/stripe/upgrade-plan` - Change subscription
- `/api/stripe/update-payment-method` - Update card

### AI Features

**AI Assistants** (`app/api/ai/*`):
- `/chat` - General AI assistant for creator dashboard
- `/proposal-chat` - AI for generating deal proposals

**Integration:** OpenAI GPT models via `openai` npm package

**Usage:** AI messages are stored with type `MessageType.AI_ASSISTANT` in conversations

### Email System

**Email Templates** (`lib/email-templates.ts`):
- Standardized templates for common scenarios
- Subject line consistency via `email-subject-manager.ts`
- Email generation via `email-generator.ts`

**Sending:** `/api/email/send` route handles email delivery

**Important:** Email messages are stored as `MessageType.EMAIL` in conversations

### Component Architecture

**UI Components:** Based on shadcn/ui (Radix UI + Tailwind)
- Located in `components/ui/`
- Full component list in `package.json` dependencies (`@radix-ui/*`)

**Custom Components:**
- `deal-details-modal.tsx` - Deal management
- `new-deal-modal.tsx` - Create deals
- `ai-assistant.tsx` - AI chat interface
- `creator-profile-display.tsx` - Public portfolio view
- `stripe-payment.tsx` - Payment processing
- `connect-account-modal.tsx` - Social OAuth

### State Management

**Approach:** Minimal global state
- React Context for specific needs (e.g., `SelectedUsersContext`)
- Server state via React 19's built-in features
- API data fetched on-demand with error handling

**Pattern:** Components fetch their own data using `lib/api.ts` functions

### File Uploads

**S3 Integration:**
- Route: `/api/upload/profile-image`
- Direct upload to AWS S3
- Returns public URL for storage

### Path Aliases

**Import Pattern:** Use `@/` prefix for absolute imports
- `@/lib/api` → `lib/api.ts`
- `@/components/ui/button` → `components/ui/button.tsx`
- `@/app/constants/constants` → `app/constants/constants.ts`

### Environment Variables

**Required:**
- `API_BASE_URL` - Backend API URL
- `AWS_COGNITO_CLIENT_ID` - Cognito app client ID
- `AWS_COGNITO_CLIENT_SECRET` - Cognito app client secret
- `AWS_COGNITO_REGION` - AWS region
- `AWS_COGNITO_USER_POOL_ID` - Cognito user pool
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `OPENAI_API_KEY` - OpenAI API key
- Stripe price IDs and payment links for each tier

**Pattern:** Never commit `.env` file. Use `env.example` as template.

### Important Naming Convention

**Company Rebranding:** The company has been renamed from "Creator Consult" to "Repflow". All references should use "Repflow" (see `.cursor/rules/company-rename.mdc`).

## Common Development Patterns

### Adding a New API Route
1. Create route file in `app/api/[category]/[endpoint]/route.ts`
2. Import `getAuthHeaders()` for protected endpoints
3. Call backend API with proper headers
4. Handle errors gracefully with fallbacks
5. Return NextResponse with appropriate status

### Adding a New Feature to User Profile
1. Add type to `UserProfile` in `lib/models.ts`
2. Update backend API call in `lib/api.ts`
3. Update UI components (e.g., `app/creator/profile/page.tsx`)
4. Test with both API success and fallback scenarios

### Integrating a New Social Platform
1. Add OAuth routes in `app/api/[platform]/`
2. Create analytics type in `lib/models.ts`
3. Add platform icon to `lib/platform-icons.tsx`
4. Update `Platform` type to include analytics field
5. Create connect modal in components

### Working with Deals
- Deal pipeline is drag-and-drop (using `@hello-pangea/dnd`)
- Each status change updates `stageHistory`
- Deal cards show key info: company, value, deliverables, contacts
- Detail modal shows full history, communications, brief

### Testing Social OAuth Locally
- Use tunneling service (ngrok) for OAuth callbacks
- Update redirect URIs in platform developer consoles
- Test token refresh flows

## Key Constraints & Considerations

1. **Authentication Required:** Most features require authenticated user context
2. **Backend Dependency:** Frontend assumes backend API is available
3. **Mock Data Fallbacks:** API functions return mock data if backend fails
4. **Token Management:** Cognito tokens expire; handle refresh gracefully
5. **Public vs Private:** Portfolio pages are public; creator dashboard is private
6. **Stripe Live Mode:** Currently using live Stripe keys (be cautious)
7. **Social Analytics:** Require platform-specific access tokens
8. **Error Handling:** Always catch and log errors; provide user-friendly messages
