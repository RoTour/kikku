<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { marked } from 'marked';
    import { onMount } from 'svelte';
    
    let { data } = $props();
    let selectedSpecId = $state(data.specs[0]?.id || null);

    let selectedSpec = $derived(data.specs.find(s => s.id === selectedSpecId));
    let htmlContent = $derived(selectedSpec ? marked.parse(selectedSpec.content) : '');

    // Poll if latest spec is pending
    onMount(() => {
        const interval = setInterval(() => {
            if (data.specs.length > 0 && (data.specs[0].status === 'PENDING' || data.specs[0].status === 'GENERATING')) {
                invalidateAll();
            }
        }, 3000);

        return () => clearInterval(interval);
    });
</script>

<div class="flex h-screen bg-zinc-950 text-white">
    <!-- Sidebar -->
    <div class="w-64 border-r border-zinc-800 bg-zinc-900 overflow-y-auto">
        <div class="p-4 border-b border-zinc-800">
            <h2 class="font-bold">Versions</h2>
            <a href={`/project/${data.specs[0]?.projectId || page.params.id}`} class="text-xs text-indigo-400 hover:text-indigo-300">
                &larr; Back to Chat
            </a>
        </div>
        <ul>
            {#each data.specs as spec}
                <li>
                    <button 
                        onclick={() => selectedSpecId = spec.id}
                        class={`w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800 transition
                        ${selectedSpecId === spec.id ? 'bg-zinc-800 border-l-2 border-l-indigo-500' : ''}`}>
                        <div class="flex justify-between items-center">
                            <div class="text-sm font-medium">Version {spec.createdAt.split('T')[0]}</div>
                            {#if spec.status === 'PENDING' || spec.status === 'GENERATING'}
                                <span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                            {:else if spec.status === 'FAILED'}
                                <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                            {/if}
                        </div>
                        <div class="text-xs text-zinc-500 flex justify-between">
                             <span>{(spec.content.length / 1024).toFixed(1)} KB</span>
                             <span class="text-[10px] uppercase text-zinc-600">{spec.status}</span>
                        </div>
                    </button>
                </li>
            {/each}
        </ul>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-8 prose prose-invert max-w-none">
        {#if selectedSpec}
            {#if selectedSpec.status === 'PENDING' || selectedSpec.status === 'GENERATING'}
                <div class="flex flex-col items-center justify-center h-full text-zinc-400 animate-pulse gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 animate-spin">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <p class="text-lg font-medium">The Architect is drafting your spec...</p>
                    <p class="text-sm">This may take a minute. Sit tight!</p>
                </div>
            {:else if selectedSpec.status === 'FAILED'}
                <div class="flex flex-col items-center justify-center h-full text-red-400 gap-4">
                     <p class="text-lg font-medium">Generation Failed</p>
                     <p class="text-sm">Please try again later.</p>
                </div>
            {:else}
                {@html htmlContent}
            {/if}
        {:else}
            <div class="flex items-center justify-center h-full text-zinc-500">
                No specifications generated yet.
            </div>
        {/if}
    </div>
</div>
