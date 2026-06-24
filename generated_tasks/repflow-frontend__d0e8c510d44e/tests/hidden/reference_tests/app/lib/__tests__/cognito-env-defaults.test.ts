import {
    COGNITO_DEV,
    COGNITO_PROD,
    defaultCognitoPoolAndClient,
} from '../cognito-env-defaults'

const realEnv = process.env

describe('defaultCognitoPoolAndClient', () => {
    afterEach(() => {
        process.env = { ...realEnv }
    })

    it('uses dev pool when NEXT_PUBLIC_API_BASE_URL is dev App Runner', () => {
        process.env = {
            ...realEnv,
            NEXT_PUBLIC_API_BASE_URL:
                'https://i2mk8mby5p.us-east-2.awsapprunner.com',
            NODE_ENV: 'production',
        }
        expect(defaultCognitoPoolAndClient()).toEqual({
            userPoolId: COGNITO_DEV.userPoolId,
            clientId: COGNITO_DEV.clientId,
        })
    })

    it('uses prod pool when NEXT_PUBLIC_API_BASE_URL is prod App Runner', () => {
        process.env = {
            ...realEnv,
            NEXT_PUBLIC_API_BASE_URL:
                'https://qppc8ivf44.us-east-2.awsapprunner.com',
            NODE_ENV: 'production',
        }
        expect(defaultCognitoPoolAndClient()).toEqual({
            userPoolId: COGNITO_PROD.userPoolId,
            clientId: COGNITO_PROD.clientId,
        })
    })

    it('uses dev pool for next dev even if API URL missing', () => {
        process.env = {
            ...realEnv,
            NEXT_PUBLIC_API_BASE_URL: '',
            NODE_ENV: 'development',
        }
        expect(defaultCognitoPoolAndClient()).toEqual({
            userPoolId: COGNITO_DEV.userPoolId,
            clientId: COGNITO_DEV.clientId,
        })
    })
})
