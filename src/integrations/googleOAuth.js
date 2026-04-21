import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
export const verifyGoogleIdToken = async (idToken) => (await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })).getPayload();
