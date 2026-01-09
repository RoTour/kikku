
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { validateEvent } from '@polar-sh/sdk/webhooks';
import { error, json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
    const rawBody = await request.text();
    const headers = request.headers;
    const webhookSecret = env.POLAR_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw error(500, 'Polar Webhook Secret not configured');
    }

    let event;
    try {
        event = validateEvent(rawBody, headers, webhookSecret);
    } catch (e) {
        throw error(400, 'Invalid Webhook Signature');
    }

    console.log('Polar Webhook received:', event.type);

    // Handle One-Time Purchases (Packs)
    if (event.type === 'order.created') {
        const userId = event.data.customer_metadata?.userId; // Assuming userId is passed in metadata
        const amount = event.data.amount; // Need to map amount to tokens
        
        // Simple mapping: 1 EUR = 100000 Tokens? 
        // Or based on Product ID.
        // Hobbist Pack (5EUR) -> 500k Tokens.
        // Pro Pack (20EUR) -> 2.5M Tokens.
        
        // For now, let's assume metadata passes 'tokens' or we map product ID.
        // Let's rely on metadata: { userId: '...', tokens: '500000' }
        
        if (userId && event.data.metadata?.tokens) {
            const tokensToAdd = parseInt(event.data.metadata.tokens);
            await prisma.user.update({
                where: { id: userId },
                data: { 
                    tokenBalance: { increment: tokensToAdd },
                    tier: { set: 'HOBBIST' } // Upgrade to Hobbist/Pro? Or keep as is?
                    // Maybe we separate Tier from Credits. Tier enables features.
                    // If they buy a pack, they are at least Hobbist?
                    // Let's implicitly upgrade to HOBBIST if they pay > 0.
                } 
            });
        }
    }

    // Handle Subscriptions
    if (event.type === 'subscription.created' || event.type === 'subscription.active') { // Check exact event names
         const userId = event.data.customer_metadata?.userId;
         // Map subscription to tier and monthly credits
    }

    return json({ received: true });
};
