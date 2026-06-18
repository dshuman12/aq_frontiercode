# OIDC Authentication Service

The OIDC Authentication Service provides user-facing authentication through access tokens with scope-based permissions.

Access tokens contain comma-separated scopes that determine access to specific endpoints via a Lambda authorizer.

The OIDC Lambda Authorizer performs allow/deny decisions by validating the access token scopes against a scope to resource mapping, stored in an SSM parameter.

# Getting Started

## Package Installation

This project uses private packages from the GitHub package registry. To install these packages:

1. Create a personal access token in GitHub:

   - Go to your GitHub account settings → Developer settings → Personal access tokens
   - Generate a new token with the `read:packages` permission
   - Copy the token once it's generated (you won't be able to see it again)

2. Configure your environment:

   ```bash
   # Add this to your ~/.bashrc, ~/.zshrc, or equivalent shell profile
   export ONMO_REGISTRY_PACKAGES=your_personal_access_token
   ```

3. Run yarn to install packages:
   ```bash
   npm install
   ```

## Running Tests Locally

To run tests locally, you need to set up the environment variables:

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Set up AWS credentials:

   - Go to [ONMO AWS Console](https://onmoconsole.awsapps.com/start/#/?tab=accounts)
   - Select access keys for the ONMO AWS account
   - Find your AWS Key ID, Access Key, and Session Token
   - Update the corresponding fields in your `.env` file:
     ```
     AWS_ACCESS_KEY_ID=your_aws_key_id
     AWS_SECRET_ACCESS_KEY=your_aws_access_key
     AWS_SESSION_TOKEN=your_aws_session_token
     ```

3. For remaining environment variables, use the staging values from [staging.deploy.yaml](https://github.com/onmoapp/authentication-oidc/blob/main/.github/workflows/staging.deploy.yaml). Look for variables in the format `TF_VAR_*` and add them to your `.env` file without the `TF_VAR_` prefix.

4. Run the tests:

   ```bash
   # Run all tests
   npm run test

   # Run specific test suites
   npm run test-local-suite --suite=src/test-e2e/other/eligibility.test.ts

   # Run end-to-end tests
   npm run test-e2e

   # Run target tests
   npm run test-targets
   ```

# Scopes & SSM Parameters

## Scope Types

- **OTP Scopes**: Basic web-domain scopes obtainable via SMS OTP verification
- **OTP-Passcode Scopes**: Basic app-domain scopes requiring SMS OTP verification & passcode verification
- **Shared Scopes**: Scopes that exist in both OTP and OTP-Passcode scope lists
- **Extra Scopes**: Restricted scopes requiring additional verification (SMS OTP/Passcode/Biometrics)

## Parameters

1. `AUTH_FLOW_SCOPES_PARAM`: Maps auth flows to their available scopes

   - Defines which scopes are available for OTP, OTP-Passcode, and Extra-Scope flows

2. `SCOPE_TO_RESOURCE_MAP_PARAM`: Maps scopes to API Gateway resources

   - Defines which endpoints each scope can access

   Note: SCOPE_TO_RESOURCE_MAP_PARAM's value has reach the 8000 chars limit and therefore will be replaced by `SCOPE_TO_RESOURCE_MAP_URL_PARAM`. <br />
   `SCOPE_TO_RESOURCE_MAP_URL_PARAM` will contain an S3 object url. the S3 object will contain the values (which endpoints each scope can access)
   `SCOPE_TO_RESOURCE_MAP_URL_PARAM` will take precedence over `SCOPE_TO_RESOURCE_MAP_PARAM`

3. `SCOPE_TO_RESOURCE_MAP_URL_PARAM`: URL of the s3 Object which contains Maps scopes to API Gateway resources

   - Contains URL of the S3 object which endpoints each scope can access

4. `NON_CONFLICTING_SCOPES_PARAM`: Used during initiation of auth flows that will generate a new token on completion

   - Checks if requested scopes conflict with existing token scopes
   - Prevents incompatible scope combinations

5. `EXCLUSIVE_SCOPES_PARAM`: Used during token generation

   - Lists scopes that must exist on only one token per user
   - When generating a token with exclusive scopes, other tokens with those scopes are deleted

6. `TOKEN_LIFETIMES_PARAM`: Defines token expiration times
   - Default lifetimes for access/refresh tokens
   - Special lifetimes for specific scopes (e.g., sensitive operations)

# Auth Flows

The end to end tests in `./src/test-e2e` are a great place to look to understand each of the auth flows.

## Web Login Flow (OTP)

```
User → SMS Verification → Access Token
```

## Mobile App Login Flow (OTP-Passcode)

```
(First Time Login)
User → SMS OTP Verification → Passcode Verification → Access Token
```

```
(Re-Login)
User → Passcode Verification → Access Token
```

```
(Biometric Login)
User → Biometric Verification → Access Token
```

## Extra Scope Authorization Flow

Some endpoints have a higher level of restriction and require scopes that can only be obtained via the extra-scope auth flow.

The verification requirements are based on:

- Requested extra-scope
- User's biometric registration status

Possible verification combinations:

```
User → SMS OTP Verification → Passcode Verification → Access Token with extra scope

User → Passcode Verification → Access Token with extra scope

User → Biometric Verification → Access Token with extra scope
```

## Biometrics Registration Flow

To register a user's biometrics for a device.

```
User → Register Device & Enable Biometrics
```

## Forgotten Passcode Flow

When a user has forgotten their passcode.

```
User → SMS OTP Verification → Email OTP Verification → Access Token with passcode-change scope → Change Passcode
```

# Other API Endpoints

## Eligibility Check

Returns available extra-scope scopes based on user eligibility criteria.

```
Endpoint: /eligibility
Required Scope: auth-services
```

## Logout

Invalidates all user tokens for the current domain (web/app).

```
Endpoint: /logout
Required Scope: auth-services
```

## Change Passcode

Updates user's passcode.

```
Endpoint: /change-passcode
Required Scope: passcode-change
```

## User Information

Returns user credentials based on provided onmouuid & relevant token scopes.

```
Endpoint: /user-info
Required Scopes -> one/many of:

- loan-account-id
- credit-card-account-id
- credit-card-id
```
