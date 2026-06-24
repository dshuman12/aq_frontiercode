import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import AWS from 'aws-sdk';
import process from 'process';
import { AWS_ACCESS_KEY_ID, AWS_COGNITO_CLIENT_ID, AWS_COGNITO_REGION, AWS_SECRET_ACCESS_KEY } from "../constants/constants";

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_COGNITO_REGION,
});

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "Username" },
                password: { label: "Password", type: "password" }
            },

            authorize: async (credentials) => {

                const cognito = new AWS.CognitoIdentityServiceProvider();

                if (!credentials) return null;

                const params = {
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    ClientId: AWS_COGNITO_CLIENT_ID as string,
                    AuthParameters: {
                        USERNAME: credentials.username,
                        PASSWORD: credentials.password,
                    },
                };

                try {
                    const response = await cognito.initiateAuth(params).promise();
                    const user = {
                        id: response.ChallengeParameters?.USER_ID_FOR_SRP as string, // User ID for Secure Remote Password
                        name: credentials.username,
                    };
                    return user;
                } catch (error) {
                    console.error(error);
                    return null;
                }
            }
        })
    ]
})

export { handler as GET, handler as POST }