import { hashNonce } from '@/auth/wallet/client-helpers';
import {
  MiniAppWalletAuthSuccessPayload,
  MiniKit,
  verifySiweMessage,
} from '@worldcoin/minikit-js';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface User {
    walletAddress: string;
    username: string;
    profilePictureUrl: string;
  }

  interface Session {
    user: {
      walletAddress: string;
      username: string;
      profilePictureUrl: string;
    } & DefaultSession['user'];
  }
}

// Auth configuration for Wallet Auth based sessions
// For more information on each option (and a full list of options) go to
// https://authjs.dev/getting-started/authentication/credentials
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      id: 'world-app',
      name: 'World App Wallet',
      credentials: {
        nonce: { label: 'Nonce', type: 'text' },
        signedNonce: { label: 'Signed Nonce', type: 'text' },
        finalPayloadJson: { label: 'Final Payload', type: 'text' },
      },
      // @ts-expect-error TODO
      authorize: async ({
        nonce,
        signedNonce,
        finalPayloadJson,
      }: {
        nonce: string;
        signedNonce: string;
        finalPayloadJson: string;
      }) => {
        const expectedSignedNonce = hashNonce({ nonce });

        if (signedNonce !== expectedSignedNonce) {
          console.log('Invalid signed nonce');
          return null;
        }

        const finalPayload: MiniAppWalletAuthSuccessPayload =
          JSON.parse(finalPayloadJson);
        const result = await verifySiweMessage(finalPayload, nonce);

        if (!result.isValid || !result.siweMessageData.address) {
          console.log('Invalid final payload');
          return null;
        }
        // Optionally, fetch the user info from your own database
        const userInfo = await MiniKit.getUserInfo(finalPayload.address);

        return {
          id: finalPayload.address,
          ...userInfo,
        };
      },
    }),
    Credentials({
      id: 'coinbase',
      name: 'Coinbase Wallet',
      credentials: { 
        address: { label: 'Wallet Address', type: 'text' },
        ensName: { label: 'ENS Name', type: 'text' },
        ensAvatar: { label: 'ENS Avatar', type: 'text' },
      },
      authorize: async (credentials) => {
        console.log('Coinbase Wallet credentials:', credentials);
        
        const { address, ensName, ensAvatar } = credentials as Partial<Record<"address" | "ensName" | "ensAvatar", string>>;

        if (!address) {
          console.error('No address found in Coinbase Wallet');
          return null;
        }

        return {
          id: address,
          walletAddress: address,
          username: ensName || address,
          profilePictureUrl: ensAvatar || `https://api.adorable.io/avatars/285/${address}.png`,
        };
      }
    })
    /* Credentials({
      id: "farcaster",
      name: "Farcaster Quick Auth",
      credentials: {
        token: { label: "Farcaster Quick-Auth Token", type: "text" },
      },
      authorize: async () => {
        try {
          const { token } = await sdk.quickAuth.getToken();

          if (!token) {
            console.error("No token returned from getToken()");
            return null;
          }

          const fid = typeof token.sub === "number" ? token.sub : Number(token.sub);
          
          const primaryAddress = await sdk.quickAuth.fetch("https://api.farcaster.xyz/fc/primary-address?fid=" + fid)
            .then((r) => r.json())
            .then((d) => d.result.address.address);

          return {
            id: primaryAddress,
            profilePictureUrl: `https://api.farcaster.xyz/fc/profile-picture?fid=${fid}`,
            username: String(fid),
            walletAddress: primaryAddress,
          };
        } catch (err) {
          console.error("⚠️ Farcaster login failed", err);
          return null;
        }
      },
    }), */
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
        token.profilePictureUrl = user.profilePictureUrl;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.walletAddress = token.address as string;
        session.user.username = token.username as string;
        session.user.profilePictureUrl = token.profilePictureUrl as string;
      }

      return session;
    },
  },
});
