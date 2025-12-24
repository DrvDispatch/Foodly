import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
        newUser: '/onboarding/goal',
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            allowDangerousEmailAccountLinking: true,
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter your email and password')
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { profile: true },
                })

                if (!user) {
                    throw new Error('No account found with this email')
                }

                // Demo users bypass password check
                if (user.isDemo) {
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    }
                }

                // Regular users need password validation
                if (!user.password) {
                    throw new Error('No password set - use Google sign in')
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                if (!isPasswordValid) {
                    throw new Error('Invalid password')
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id
            }
            if (account?.provider === 'google') {
                token.accessToken = account.access_token
                token.idToken = account.id_token
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                // @ts-ignore - Adding custom property
                session.idToken = token.idToken as string
            }

            // Check if user has completed onboarding
            const profile = await prisma.profile.findUnique({
                where: { userId: token.id as string },
                select: { onboarded: true },
            })

            session.user.onboarded = profile?.onboarded ?? false

            return session
        },
        async signIn({ user, account }) {
            // Allow OAuth sign in
            if (account?.provider === 'google') {
                return true
            }

            // For credentials, check if user exists
            if (account?.provider === 'credentials') {
                return !!user
            }

            return true
        },
    },
    events: {
        async createUser({ user }) {
            // Create or update profile for new users (upsert to avoid duplicate errors)
            await prisma.profile.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    onboarded: false,
                },
                update: {
                    // Don't overwrite existing profile data
                },
            })
        },
    },
}
