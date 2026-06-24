## Application: Repflow Backend Infrastructure

**Purpose:** Supports the production readiness of the Repflow platform by fully separating development and production environments. This ensures stable, uninterrupted access for real users while active development continues in parallel.

**Modules**

#### Module: Environment Separation & Production Migration

**Description:** Fully decouples the production and development environments, which currently share critical resources including the database, Stripe, email service, and AWS Cognito user pool. This separation eliminates the risk of development changes causing downtime or data inconsistencies for live users.

**Key Features:**

- Separate MongoDB instances for production and development with independent data stores
- Separate AWS Cognito user pools so accounts created in development have no access to production and vice versa
- Separate email service configurations (e.g., henry@repflow.me for production, a distinct dev address for development)
- Separate Stripe Payment Link and API key configuration (payment links for production endpoint and payment links for dev endpoints, dev API keys for dev instance)
- Independent deployment pipelines for each environment with no shared resources
- Scheduled maintenance windows with advance notice to minimize user-facing downtime during migration

**Deliverables:**

- Fully isolated production environment stable enough to onboard paying users
- Fully isolated development environment allowing continuous feature development without risk of affecting production
- Migration completed by end of February

**Dependencies:** Access to current AWS, MongoDB, Stripe, and email service configurations. Coordination with client on acceptable maintenance windows during migration.

## Technology Stack

- Mobile App: React Native with Expo App Services
- Web App: Next.js for Creator Web App, Admin Panel, and Agency Portal
- Backend: FastAPI + MongoDB
- Authentication: AWS Cognito (Creators, Admins, Agencies)
- File Storage: Amazon S3 for email and contract storage
- Email: Amazon SES (send/receive for partnership inbox)
- Payments: Stripe for subscriptions
- AI Services: OpenAI GPT-5 powering Email Qualification and Messaging Agents
- Notification Services: Expo Push Notifications and Firebase Cloud Messaging
