
import { prisma } from '$lib/server/db';

export const load = async ({ locals }) => {
    // If not authenticated, return empty user
    if (!locals.user) {
        return { user: null };
    }

    // Fetch fresh user data (tier, tokenBalance) from DB
    // Session might be stale or incomplete
    const user = await prisma.user.findUnique({
        where: { id: locals.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            tier: true,
            tokenBalance: true
        }
    });

    return {
        user: user
    };
};
