Reef Labs PRD | Repflow

Problem Statement
Creators, agencies, and brands struggle to manage sponsorships across fragmented tools, manual outreach, and opaque performance tracking. Existing solutions often take commissions, lack robust analytics, and do not offer AI-assisted email qualification and messaging at scale. Repflow addresses this by centralizing commission-free deal tracking, AI-powered communications, and multi-tenant workflows with white-labeled agency portals—supported by an internal admin panel for platform-wide oversight and a mobile companion app for on-the-go access.
Project Goals
Centralize commission-free sponsorship management with clear deal pipelines and analytics for creators and agencies
Deliver AI-powered email qualification and messaging to speed up outreach, triage, and negotiation
Provide a robust admin panel to monitor system health, platform revenue, referrals, and user/account relationships
Enable secure user impersonation for support/QA while blocking payment-triggering actions
Launch an MVP mobile app for creators with authentication, messaging, deal tracking, notifications, and profile management
Implement tiered subscription management and multi-tenant architecture to support agencies and white-labeled branding
Fully separate production and development environments to ensure reliability and safe iteration

User Personas
Persona 1: Creator
Who They Are: Independent or team-based content creators who manage sponsorship outreach, negotiation, deliverables, and revenue.
Goals: Track sponsorship deals, communicate with brands efficiently, use AI for drafting and triage, manage deliverables and files, and stay on top of notifications from anywhere.
Pain Points: Disorganized threads across inboxes, slow follow-ups, unclear deal stages, manual drafting, and difficulty managing files and deliverables on mobile.
Persona 2: Agency Account Owner/Manager
Who They Are: Agencies representing multiple creators, managing campaigns, pipelines, and revenue distribution under white-labeled portals.
Goals: Oversee creator pipelines and performance, manage plan tiers, and ensure consistent communications and reporting across client accounts.
Pain Points: Fragmented tooling, lack of scalable multi-tenant controls, limited analytics across accounts, and difficulty managing plan tiers and usage.
Persona 3: Repflow Admin/Operator
Who They Are: Internal staff responsible for platform oversight, support, analytics, and environment stability.
Goals: Monitor system health, revenue, and growth trends; analyze deal/referral performance; view billing status; support users via secure impersonation; ensure production stability separate from development.
Pain Points: Limited visibility across tenants and plans, time-consuming cross-system checks (Stripe, database, auth), and risk of production incidents caused by shared dev/prod resources.

User Stories
#
As a...
I want to...
So that...
US-01
Admin
Land on a system overview dashboard
I can quickly assess platform health and KPIs
US-02
Admin
See total active users, new signups, churn
I can track user growth and retention
US-03
Admin
View platform-wide revenue (MRR, total collected)
I understand revenue performance at a glance
US-04
Admin
See deal volume (active/completed/lost)
I can gauge sales pipeline performance
US-05
Admin
View email agent usage (emails sent, AI responses)
I can understand AI utilization and trends
US-06
Admin
Click dashboard cards to open detailed analytics
I can dive deeper into specific metrics
US-07
Admin
Filter deal analytics by date range
I can analyze period-over-period performance
US-08
Admin
See deal stages, sources, and revenue breakdown
I can identify where deals originate and convert
US-09
Admin
See top creators by deal count/value
I can recognize high performers
US-10
Admin
View referral analytics (links, clicks, conversions)
I can assess referral program effectiveness
US-11
Admin
See revenue attributed to referred users
I can quantify referral impact on revenue
US-12
Admin
View referral activity over time with filters
I can analyze referral trends
US-13
Admin
View billing data (plan, cycle, payment status) per user
I can understand platform billing without taking actions
US-14
Admin
See total revenue aggregated by plan
I can evaluate plan mix and performance
US-15
Admin
See failed payment/past-due flags
I can surface at-risk accounts for action in Stripe
US-16
Admin
Click to open Stripe customer record
I can perform billing actions directly in Stripe
US-17
Admin
View user distribution by plan type
I understand how plans are used across the platform
US-18
Admin
List agency accounts with creator counts
I can see how agencies are structured
US-19
Admin
Open an agency profile to view linked creators and activity
I can review agency-level performance
US-20
Admin
See plan upgrade/downgrade history (read-only)
I can understand account lifecycle changes
US-21
Admin
Open a user profile view
I can inspect user details and support them
US-22
Admin
Start a secure impersonation session
I can reproduce user issues in their environment
US-23
Admin
Confirm impersonation via modal
I avoid accidental impersonation
US-24
Admin
Be redirected and logged in as the creator
I can act as the user seamlessly
US-25
Admin
See a persistent impersonation banner
I have clear context when acting as a user
US-26
Admin
Exit impersonation and return to admin
I can safely end the session anytime
US-27
Admin
Have payment-triggering actions blocked during impersonation
I avoid unintended billing or fund flows
US-28
Admin
Ensure impersonation sessions are logged (who/when/whom)
I maintain an audit trail for compliance
US-29
Creator (Mobile)
Log in with email/password or social login
I can access my account on mobile
US-30
Creator (Mobile)
Use biometrics after first login
I can sign in quickly and securely
US-31
Creator (Mobile)
Reset password and verify email
I can recover access securely
US-32
Creator (Mobile)
See a quick tutorial on first launch
I understand key features and navigation
US-33
Creator (Mobile)
View a list of active chats with brand logos
I can jump into the right conversations quickly
US-34
Creator (Mobile)
See AI message previews in the chat list
I can triage threads faster
US-35
Creator (Mobile)
Open a threaded chat with message tagging
I keep context and follow the conversation
US-36
Creator (Mobile)
Expand an email chain within a thread
I can view the full back-and-forth history
US-37
Creator (Mobile)
Get an AI draft message and edit/approve it
I can reply faster with AI assistance
US-38
Creator (Mobile)
Receive push notifications for chat updates
I don’t miss time-sensitive messages
US-39
Creator (Mobile)
View my deal pipeline in a horizontal Kanban
I can see deal status at a glance
US-40
Creator (Mobile)
Drag-and-drop deals to update status
I can quickly maintain an accurate pipeline
US-41
Creator (Mobile)
Open deal details (deliverables, contracts, invoices)
I can manage the specifics of each deal
US-42
Creator (Mobile)
Accept/reject/counter offers with AI help
I can negotiate efficiently
US-43
Creator (Mobile)
Upload files and add internal comments
I can manage deliverables and team notes
US-44
Creator (Mobile)
Have optimistic UI and offline support
I can work even with poor connectivity
US-45
Creator (Mobile)
Edit profile info and change password
I keep my account up to date
US-46
Creator (Mobile)
Manage notification preferences
I control which alerts I receive
US-47
Creator (Mobile)
View referral info and earnings (read-only)
I track referral performance
US-48
Creator (Mobile)
Toggle AI Agent pause
I can temporarily disable AI automation
US-49
Creator (Mobile)
Enable/disable biometric login
I choose my preferred security method
US-50
Creator (Mobile)
View a notifications center
I can review and manage all alerts in one place
US-51
Creator (Mobile)
Tap a notification to deep-link into a chat or deal
I can act on alerts quickly
US-52
Creator (Mobile)
Swipe-to-dismiss or mark all as read
I can clear and organize notifications


Platform Requirements
Supported Platforms:
Web Admin Panel for Repflow internal operators
Mobile App for creators (iOS and Android via React Native/Expo)
Performance Requirements:
Admin dashboard metrics are read-only and auto-refresh on a configurable polling interval
Real-time or near real-time sync for messaging threads
Mobile app supports optimistic UI updates and local caching for offline usage
Security & Compliance:
Admin-only access to system analytics with read-only data views
Secure user impersonation via short-lived, server-generated JWTs flagged as impersonation; payment-triggering actions disabled during impersonation
No payment card data stored in the application; billing actions occur in Stripe
Email verification and password reset flows for secure account access
Integration Requirements:
MongoDB for existing data stores and analytics aggregations
AWS Cognito for authentication (creators, admins, agencies)
Amazon S3 for file storage (e.g., contracts, email attachments)
Amazon SES for sending/receiving partnership emails
Stripe for subscriptions, plan data, and link-outs to customer records
OpenAI for AI-powered email qualification and messaging assistance
Push notifications via Expo and Firebase Cloud Messaging
Client-side charting (e.g., Recharts or Chart.js) in the admin panel

Applications Breakdown
Application: Admin Panel (Web)
Purpose: Administrative interface for Repflow internal operators to manage users, view platform data, and monitor system health. All views are read-only except for secure user impersonation controls.
Screen 1: System Overview Dashboard
Purpose: Landing page after admin login providing a snapshot of platform health and KPIs.
Key UI Elements: KPI tiles (active users, new signups, churn), revenue tiles (MRR, total collected), deal volume chart (active/completed/lost), email agent usage tiles/graphs, quick-access cards to analytics modules.
User Interactions: Admins review KPIs with trend indicators (WoW/MoM); click tiles/cards to navigate to Deal Analytics, Referral Analytics, Billing, or Agency Management.
Connected Data / APIs: Read-only admin API aggregating MongoDB metrics; polling on a configurable interval; authentication enforced for admin sessions.
Referenced User Stories: US-01, US-02, US-03, US-04, US-05, US-06
Screen 2: Deal Analytics
Purpose: Analyze deal performance across stages, sources, creators, and revenue outcomes.
Key UI Elements: Date range filter, stage breakdown chart, source breakdown (inbound/outbound, direct/referred), revenue rollups, deal type/deliverable breakdown, top creators leaderboard.
User Interactions: Apply date filters; inspect charts/tables; identify trends; no editing.
Connected Data / APIs: MongoDB aggregations on the deals collection for stage breakdowns and revenue by source/type; client-side chart rendering.
Referenced User Stories: US-07, US-08, US-09
Screen 3: Referral Analytics
Purpose: Monitor the performance of the referral program.
Key UI Elements: KPIs (links generated, clicks, conversions), conversion rate chart, revenue attributed to referrals, top referrers table, activity-over-time chart with date filters.
User Interactions: Filter by date; sort tables; view trends; no editing.
Connected Data / APIs: MongoDB referral tracking joined with deal revenue for attribution; read-only queries.
Referenced User Stories: US-10, US-11, US-12
Screen 4: Billing Management (Read-Only)
Purpose: Provide platform-contextual visibility into subscription and billing statuses.
Key UI Elements: User list with plan tier, billing cycle, payment status; plan revenue aggregation; failed/past-due flags; “Open in Stripe” link for each user.
User Interactions: Search/sort; identify at-risk accounts; open Stripe to perform actions; no refunds/changes in-app.
Connected Data / APIs: Server-side calls to Stripe API; cached subscription/plan statuses in MongoDB reconciled on schedule; no payment data stored.
Referenced User Stories: US-13, US-14, US-15, US-16
Screen 5: Agency Management
Purpose: Understand distribution and structure of account types with a focus on agencies and sub-accounts.
Key UI Elements: Plan distribution chart (individual, agency, enterprise), agency account list with counts of linked creators, expandable agency rows, agency profile view with creator list and activity, plan change history (read-only).
User Interactions: Expand agencies to see linked creators; open agency profile views; no editing.
Connected Data / APIs: MongoDB user and subscription models; existing backend logic to resolve agency-to-creator relationships and plan history.
Referenced User Stories: US-17, US-18, US-19, US-20
Screen 6: User Profile (Admin View)
Purpose: Inspect a specific user’s account with support tools.
Key UI Elements: User identity and plan info, recent activity snapshot, “Impersonate” button, link-outs (e.g., to Stripe if applicable).
User Interactions: Click “Impersonate” to open confirmation modal; proceed to impersonation flow; review read-only details.
Connected Data / APIs: MongoDB user profile data; Stripe link-out URL; secure server action to create impersonation token.
Referenced User Stories: US-21, US-22, US-23
Screen 7: Impersonation Modal & Session Banner
Purpose: Confirm and clearly indicate impersonation context.
Key UI Elements: Confirmation modal with warning text; persistent banner visible across the creator-facing app during session; “Exit Impersonation” button.
User Interactions: Confirm impersonation; operate as user in the creator-facing app; exit impersonation to return to admin.
Connected Data / APIs: Server-generated short-lived JWT (impersonation-scoped), audit logging in MongoDB; creator app reads token flag to block payment-triggering actions.
Referenced User Stories: US-24, US-25, US-26, US-27, US-28

Application: Mobile App (iOS & Android)
Purpose: Creator-focused companion app for quick sponsorship management on the go, including authentication, messaging, deal pipeline, notifications, and profile settings.
Screen 1: Authentication & Onboarding
Purpose: Provide secure access and a brief first-time tutorial.
Key UI Elements: Email/password login, social login buttons, “Forgot Password,” email verification prompts, biometric opt-in screen, 2–3 slide tutorial.
User Interactions: Log in via email/social; reset password; verify email; opt into Face ID/Touch ID; complete tutorial on first launch.
Connected Data / APIs: AWS Cognito for auth; Expo LocalAuthentication for biometrics.
Referenced User Stories: US-29, US-30, US-31, US-32
Screen 2: Chats List
Purpose: Present all active brand conversations with quick AI previews.
Key UI Elements: List of chat threads with brand logos, last message preview (AI-assisted summary), unread badges, search.
User Interactions: Tap a thread to open; pull-to-refresh; receive push notifications that deep-link into a thread.
Connected Data / APIs: Messaging endpoints; OpenAI integration for AI preview; push tokens via Expo; real-time/near real-time updates.
Referenced User Stories: US-33, US-34, US-38, US-51
Screen 3: Chat Thread
Purpose: Deep view of conversation history and AI-assisted replies.
Key UI Elements: Threaded messages with tagging, email chain expansion, composer with AI draft preview/edit, send button.
User Interactions: Expand/collapse email chains; request AI draft; edit and approve AI draft; send message.
Connected Data / APIs: Messaging service; OpenAI for drafting; delivery receipts; in-app updates.
Referenced User Stories: US-35, US-36, US-37
Screen 4: Deal Tracker (Kanban)
Purpose: Visualize and update deal status quickly.
Key UI Elements: Horizontal Kanban lanes; collapsible deal cards (summary: brand, value, stage); drag-and-drop interaction; haptics feedback.
User Interactions: Drag cards to new stages; tap card to open details; offline changes queued with optimistic UI.
Connected Data / APIs: Deals API; local storage for offline; sync engine for reconciling changes.
Referenced User Stories: US-39, US-40, US-44
Screen 5: Deal Detail
Purpose: Manage a single deal’s specifics.
Key UI Elements: Deliverables list, contracts and invoices section, offer actions (accept/reject/counter), AI assistance for counters, file upload, internal comments.
User Interactions: Review artifacts; accept/reject/counter offers (optionally with AI); upload files; add comments.
Connected Data / APIs: Deals and deliverables endpoints; file uploads to S3; AI assistance; audit logging of actions.
Referenced User Stories: US-41, US-42, US-43
Screen 6: Profile & Settings
Purpose: Update account info and preferences.
Key UI Elements: Profile photo, name, email (with re-verification flow), password change, notification toggles, referral info (read-only), AI Agent pause toggle, biometric login toggle.
User Interactions: Edit fields; trigger email re-verification; change password; adjust toggles; view referral earnings.
Connected Data / APIs: User profile endpoints; Cognito for credential updates; referral service (read-only).
Referenced User Stories: US-45, US-46, US-47, US-48, US-49
Screen 7: Notifications Center
Purpose: Centralize all alerts and updates.
Key UI Elements: Chronological list with icon-coded types; swipe-to-dismiss; “Mark all as read” action.
User Interactions: Open related deal/chat via tap; dismiss individual notifications; clear all.
Connected Data / APIs: Notifications service; push and in-app sync; deep links to chats/deals.
Referenced User Stories: US-50, US-51, US-52

Backend Modules
Module 1: User Authentication
Purpose: Secure login, password reset, and email verification across web admin and mobile.
Key Responsibilities: Email/password login, social login, password reset, email verification, and biometric token enablement.
Core API Endpoints (high-level): Authenticate user; initiate password reset; confirm email verification; manage biometric token pairing.
Data Stored: User auth identifiers; verification status; biometric preference flags.
Integrations: AWS Cognito; Expo LocalAuthentication (client-side).
Module 2: User Profile Management
Purpose: Manage creator profiles and settings.
Key Responsibilities: Read/update profile info; manage notification preferences; referral info (read-only); AI Agent pause; biometric preference.
Core API Endpoints: Get/update profile; retrieve referral summary; toggle AI Agent pause; update notification settings.
Data Stored: Profile fields (name, email), settings, referral summaries.
Integrations: Cognito (email changes), referral tracking.
Module 3: Messaging/Chat
Purpose: Support threaded conversations with brands including email chain views and AI-assisted drafting.
Key Responsibilities: Threads list; message send/receive; tagging; email chain expansion; AI draft generation and editing support.
Core API Endpoints: List threads; get thread; send message; request AI draft; acknowledge delivery.
Data Stored: Threads, messages, tags, AI-draft metadata.
Integrations: OpenAI for drafts; SES for email send/receive (via backend processing).
Module 4: Deals Management
Purpose: Manage pipeline stages, offer actions, deliverables, contracts, invoices, and comments.
Key Responsibilities: Kanban pipeline; move stage; view/update deal details; accept/reject/counter offers with AI; file uploads; internal comments.
Core API Endpoints: List deals; update stage; get deal details; accept/reject/counter; upload file; add comment.
Data Stored: Deals, stages, deliverables, artifacts (S3 URLs), comments, action audit logs.
Integrations: S3 for storage; OpenAI for counter-offer assistance.
Module 5: Analytics & Reporting (Admin)
Purpose: Provide platform-wide KPIs and analytics views.
Key Responsibilities: System overview metrics; deal analytics (stages, sources, revenue); referral analytics (links, clicks, conversions, revenue).
Core API Endpoints: Fetch system KPIs; fetch deal analytics (with date filters); fetch referral analytics (with date filters).
Data Stored: Aggregations derived from MongoDB collections; cached summaries where appropriate.
Integrations: Client-side charts; joins across deals/referrals/users.
Module 6: Billing & Subscriptions (Read-Only)
Purpose: Surface subscription and billing status with Stripe link-outs.
Key Responsibilities: Retrieve user plan data, billing cycle, payment status; aggregate revenue by plan; flag failed/past-due.
Core API Endpoints: Get billing list; get plan revenue summary; generate Stripe customer link.
Data Stored: Cached subscription statuses, plan tiers, reconciliation timestamps.
Integrations: Stripe API; no sensitive payment data stored.
Module 7: Referral Tracking
Purpose: Track referral links, clicks, conversions, and attributed revenue.
Key Responsibilities: Generate and track referral links; attribute signups; roll up revenue from referred users.
Core API Endpoints: List referral performance; get top referrers; attribution summaries.
Data Stored: Referral links, click events, conversions, attribution mappings.
Integrations: Joins with deals/billing data for revenue attribution.
Module 8: Agency & Multi-Tenant Management
Purpose: Model and report on agencies and their linked creators across plan tiers.
Key Responsibilities: Maintain agency-to-creator relationships; track plan distribution; track plan change history.
Core API Endpoints: List agencies with creator counts; get agency profile; get plan distribution; get plan history (read-only).
Data Stored: Accounts, relationships, plan tier history.
Integrations: Subscription status data from billing cache.
Module 9: Admin & Impersonation
Purpose: Provide secure support tooling to act as a user while maintaining safety controls.
Key Responsibilities: Generate short-lived impersonation tokens; enforce impersonation flag and restrictions; log session start/stop.
Core API Endpoints: Initiate impersonation (issue token); validate impersonation session; end session; retrieve audit logs.
Data Stored: Impersonation audit logs (admin ID, target user, timestamps), token metadata.
Integrations: Creator-facing app session handling; payment-action blocking logic.
Module 10: Notifications
Purpose: Deliver push and in-app notifications for chats and deals.
Key Responsibilities: Register push tokens; send notifications; sync in-app feed; deep-link routing.
Core API Endpoints: Register device; list notifications; mark read/dismiss; send event-triggered notifications.
Data Stored: Device tokens, notification records, read/dismiss states.
Integrations: Expo Push Notifications; Firebase Cloud Messaging.
Module 11: Media/File Storage
Purpose: Handle secure file uploads and retrieval for contracts, invoices, and attachments.
Key Responsibilities: Generate pre-signed URLs; validate file types; store metadata; link files to deals.
Core API Endpoints: Request upload URL; confirm upload; list/retrieve files.
Data Stored: File metadata, S3 keys/URLs, associations to deals.
Integrations: Amazon S3.
Module 12: Email Integration
Purpose: Send/receive partnership emails and sync them to threads.
Key Responsibilities: Inbound email parsing; outbound send; mapping to threads; tagging.
Core API Endpoints: Send email; webhook/ingest endpoints for inbound SES; thread association utilities.
Data Stored: Email messages, headers, thread mappings.
Integrations: Amazon SES.
Module 13: AI Integration
Purpose: Power email qualification, summaries, and message/counter-offer drafting.
Key Responsibilities: Prompt engineering; draft generation; safety/guardrails; usage tracking for analytics.
Core API Endpoints: Generate message draft; summarize thread; assist with counter-offer language.
Data Stored: Prompt/request logs, AI response metadata, usage counters.
Integrations: OpenAI API.
Module 14: Environment & Deployment Management (Custom)
Purpose: Fully separate development and production environments and manage migration.
Key Responsibilities: Provision separate MongoDB instances; separate Cognito pools; separate SES configs; separate Stripe configs (links and API keys); independent deploy pipelines; scheduled maintenance.
Core API Endpoints: N/A (infrastructure and configuration management).
Data Stored: Environment configurations and secrets (managed via secure config stores).
Integrations: AWS Cognito, MongoDB, SES, Stripe, deployment pipelines.

Milestones
Milestone 1: Environment Separation & Production Readiness
Focus: Fully decouple production and development to ensure stability for paying users and safe parallel development.
Screens & Modules: Backend Module 14 (Environment & Deployment Management); updates across Modules 1–13 to point to production services/configs as appropriate.
Deliverables: Isolated production environment; isolated development environment; migration completed with scheduled maintenance; confirmation that live users are unaffected by ongoing development.
Dependencies: Access to AWS (Cognito/SES), MongoDB, Stripe, email configurations; coordination on maintenance windows.
Milestone 2: Mobile MVP for Creators
Focus: Deliver core mobile workflows for creators with AI-assisted messaging and foundational deal management.
Screens & Modules: Mobile Screens 1–7; Backend Modules 1–4, 10–13.
Deliverables: iOS/Android app build with login, onboarding, chats list/thread with AI drafts, deal Kanban and details with file uploads and comments, profile/settings, notifications center; push notifications working; offline/optimistic behavior; AI draft generation; app store test builds.
Dependencies: Milestone 1 completed (production-ready services); API endpoints for messaging/deals; OpenAI and notifications configured.
Milestone 3: Admin Panel Analytics & Support Tooling
Focus: Launch operator-facing web admin with analytics, billing read-only views, agency visibility, and secure impersonation.
Screens & Modules: Admin Screens 1–7; Backend Modules 5–9; 6 integrates with Stripe.
Deliverables: Web admin app with System Overview, Deal Analytics, Referral Analytics, Billing Management (read-only with Stripe link-outs), Agency Management, User Profile (admin view), Impersonation modal and banner; audit logs; documented access controls.
Dependencies: Milestones 1–2 (baseline data and events flowing); Stripe and MongoDB aggregation pipelines operational.

Technology Stack
Mobile App: React Native with Expo App Services
Web App: Next.js
Backend: FastAPI + Supabase
Additional Services:
MongoDB (existing data stores and analytics aggregations)
AWS Cognito for authentication (creators, admins, agencies)
Amazon S3 for file storage
Amazon SES for email send/receive for partnership inbox
Stripe for subscriptions and billing link-outs
OpenAI API for AI-powered email qualification and messaging assistance
Expo Push Notifications and Firebase Cloud Messaging for mobile notifications
Client-side charting library (e.g., Recharts or Chart.js) for admin analytics
