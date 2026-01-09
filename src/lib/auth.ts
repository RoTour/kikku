import { prisma } from '$lib/server/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { env } from '$env/dynamic/private';

import { checkout, polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN || ""
});

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
    secret: env.AUTH_SECRET,
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID || "",
            clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        }
    },
    plugins: [
        polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            use: [
                checkout({
                    products: [
                        {
                            productId: "9086c7c8-8873-43b0-adc6-60881e23e73c",
                            slug: "Pro-Subscription"
                        },
                        {
                            productId: "03292aea-0cdd-4434-a8ab-4f506bade573",
                            slug: "Hobbyist-Subscription"
                        },
                        {
                            productId: "6c9d6482-2fc5-4e23-ba99-83ff0fd5b8e0",
                            slug: "Pro"
                        },
                        {
                            productId: "0cf2750d-c3c9-45aa-9b8d-d96aa4856b88",
                            slug: "Hobbyist"
                        }
                    ],
                    successUrl: env.POLAR_SUCCESS_URL || "/dashboard",
                    authenticatedUsersOnly: true
                })
            ],
        })
    ]
});
