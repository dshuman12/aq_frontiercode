/**
 * Default Cognito user pool + "Repflow Creator Panel" app client when env vars are unset.
 * - `next dev` → Dev pool (us-east-2_s82ysRbW8)
 * - `next build` / `next start` / production → Prod pool (us-east-2_UOedUZggp)
 *
 * Override with AWS_COGNITO_USER_POOL_ID and AWS_COGNITO_CLIENT_ID in .env.local when needed.
 */
export function defaultCognitoPoolAndClient(): { userPoolId: string; clientId: string } {
    if (process.env.NODE_ENV === 'production') {
        return {
            userPoolId: 'us-east-2_UOedUZggp',
            clientId: '1jcl067l8ampqksfh3103mv5s3',
        }
    }
    return {
        userPoolId: 'us-east-2_s82ysRbW8',
        clientId: '7mfnjnh9b4i464qlmt42c24fjk',
    }
}
