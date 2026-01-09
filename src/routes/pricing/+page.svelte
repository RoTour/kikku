<script lang="ts">
    import { authClient } from '$lib/auth-client';

    // Pricing Data
    const tiers = [
        {
            name: 'Discover',
            price: 'Free',
            description: 'For curious minds properly exploring usage.',
            features: [
                '20 turns (40 messages) per chat',
                'Max 3 files per spec',
                'No Specification Downloads'
            ],
            cta: 'Current Plan',
            action: () => {},
            highlight: false
        },
        {
            name: 'Hobbist',
            price: '€5',
            period: 'one-time',
            description: 'Perfect for small side projects.',
            features: [
                '500,000 Tokens (~10 complex specs)',
                'Full Spec Downloads',
                'Priority Processing',
                'Access to all files'
            ],
            cta: 'Buy One-Time',
            action: async () => {
                await authClient.polar.checkout({
                    productSlug: 'Hobbyist'
                });
            },
            ctaSub: 'Subscribe (€4/mo)',
            actionSub: async () => {
                 await authClient.polar.checkout({
                    productSlug: 'Hobbyist-Subscription'
                });
            },
            highlight: true
        },
        {
            name: 'Pro',
            price: '€20',
            period: 'one-time',
            description: 'For serious builders and teams.',
            features: [
                '2,500,000 Tokens (~50 complex specs)',
                'Everything in Hobbist',
                'Highest Priority',
                'Email Support'
            ],
            cta: 'Buy One-Time',
             action: async () => {
                 await authClient.polar.checkout({
                    productSlug: 'Pro'
                });
            },
            ctaSub: 'Subscribe (€16/mo)',
             actionSub: async () => {
                 await authClient.polar.checkout({
                    productSlug: 'Pro-Subscription'
                });
            },
            highlight: false
        }
    ];
</script>

<div class="min-h-screen bg-black text-white py-20 px-8 w-full">
    <div class="w-full">
        <div class="text-center mb-16">
            <h1 class="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Simple, Usage-Based Pricing
            </h1>
            <p class="text-xl text-zinc-400">
                Start for free, upgrade when you're ready to build.
            </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            {#each tiers as tier}
                <div class={`rounded-2xl p-8 border flex flex-col ${tier.highlight ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
                    <div class="mb-8">
                        <h3 class="text-xl font-semibold mb-2">{tier.name}</h3>
                        <div class="flex items-baseline gap-1">
                            <span class="text-4xl font-bold">{tier.price}</span>
                            {#if tier.period}
                                <span class="text-zinc-500 text-sm">/{tier.period}</span>
                            {/if}
                        </div>
                        <p class="text-zinc-400 mt-2 text-sm">{tier.description}</p>
                    </div>

                    <ul class="space-y-4 mb-8 flex-1">
                        {#each tier.features as feature}
                            <li class="flex items-start gap-3 text-sm text-zinc-300">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-indigo-400 shrink-0">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                {feature}
                            </li>
                        {/each}
                    </ul>

                    <div class="space-y-3">
                        <button
                            onclick={tier.action}
                            disabled={tier.price === 'Free'}
                            class={`w-full py-3 rounded-lg font-medium transition
                            ${tier.price === 'Free' 
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                : tier.highlight 
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                    : 'bg-white text-black hover:bg-zinc-200'}`}
                        >
                            {tier.cta}
                        </button>
                        
                        {#if tier.ctaSub}
                            <button
                                onclick={tier.actionSub}
                                class="w-full py-2 rounded-lg font-medium text-sm text-zinc-400 hover:text-white transition border border-zinc-800 hover:border-zinc-600"
                            >
                                {tier.ctaSub}
                            </button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
        
        <div class="mt-16 text-center text-zinc-500 text-sm">
            <p>Payments processed securely by Polar.sh.</p>
        </div>
    </div>
</div>
