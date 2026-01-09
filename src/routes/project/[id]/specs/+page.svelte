<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { marked } from 'marked';
    import { onMount } from 'svelte';
    
    let { data } = $props();
    let selectedSpecId = $state(data.specs[0]?.id || null);
    let selectedFileName = $state<string | null>(null);

    let selectedSpec = $derived(data.specs.find((s) => s.id === selectedSpecId));

    type ParsedContent = 
        | { type: 'multi'; files: { name: string; content: string }[] }
        | { type: 'single'; content: string }
        | null;

    // Derived state to parse content
    let parsedContent = $derived.by<ParsedContent>(() => {
        if (!selectedSpec) return null;
        try {
            if (selectedSpec.content.trim().startsWith('[')) {
                const files = JSON.parse(selectedSpec.content);
                if (Array.isArray(files)) return { type: 'multi', files };
            }
        } catch (e) {
            // ignore JSON parse error, treat as raw string
        }
        return { type: 'single', content: selectedSpec.content };
    });

    // Auto-select first file when spec changes
    $effect(() => {
        if (parsedContent?.type === 'multi' && parsedContent.files.length > 0 && !selectedFileName) {
            selectedFileName = parsedContent.files[0].name;
        } else if (parsedContent?.type === 'multi' && selectedFileName) {
            // Validate selected file still exists (e.g. if files changed somehow, unlikely for same spec id)
             if (!parsedContent.files.find((f) => f.name === selectedFileName)) {
                 selectedFileName = parsedContent.files[0].name;
             }
        } else {
            selectedFileName = null; // not used for single mode
        }
    });

    let currentFileContent = $derived.by(() => {
        if (!parsedContent) return '';
        if (parsedContent.type === 'single') return parsedContent.content;
        if (parsedContent.type === 'multi' && selectedFileName) {
            return parsedContent.files.find((f: any) => f.name === selectedFileName)?.content || '';
        }
        return '';
    });

    let htmlContent = $derived(markupContent(currentFileContent));

    function markupContent(content: string) {
        return marked.parse(content);
    }

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

<div class="flex h-screen bg-zinc-950 text-white overflow-hidden">
    <!-- Sidebar -->
    <div class="w-80 border-r border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
        <div class="p-4 border-b border-zinc-800 shrink-0">
            <h2 class="font-bold text-lg mb-1">Specifications</h2>
            <a href={`/project/${data.specs[0]?.projectId || page.params.id}`} class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <span>&larr;</span> Back to Chat
            </a>
        </div>
        
        <!-- Versions List (Accordion Style) -->
        <div class="flex-1 overflow-y-auto">
            <ul class="flex flex-col">
                {#each data.specs as spec}
                    {@const isSelected = selectedSpecId === spec.id}

                    <li class="border-b border-zinc-800/50">
                        <!-- Version Header -->
                        <button 
                            onclick={() => { 
                                selectedSpecId = spec.id;
                                // Auto-selection logic is handled in the effect in script
                            }}
                            class={`w-full text-left px-4 py-3 hover:bg-zinc-800 transition group flex flex-col gap-1
                            ${isSelected ? 'bg-zinc-800' : ''}`}>
                            <div class="flex justify-between items-center w-full">
                                <span class="font-medium text-sm text-zinc-200">
                                    Version {new Date(spec.createdAt).toLocaleDateString()} 
                                    <span class="text-zinc-500 text-xs ml-1">{new Date(spec.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </span>
                                {#if spec.status === 'PENDING' || spec.status === 'GENERATING'}
                                    <span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                {:else if spec.status === 'FAILED'}
                                    <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                                {/if}
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{spec.status}</span>
                                <span class="text-xs text-zinc-600">{(spec.content.length / 1024).toFixed(1)} KB</span>
                            </div>
                        </button>

                        <!-- Nested Files List (Visible if spec is selected) -->
                        {#if isSelected && parsedContent}
                            {#if parsedContent.type === 'multi'}
                                <ul class="bg-zinc-950/30 py-1">
                                    {#each parsedContent.files as file}
                                        <li>
                                            <button
                                                onclick={(e) => { e.stopPropagation(); selectedFileName = file.name; }}
                                                class={`w-full text-left pl-8 pr-4 py-2 text-sm transition flex items-center gap-2
                                                ${selectedFileName === file.name ? 'text-indigo-400 bg-indigo-500/10 border-r-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 shrink-0 opacity-70">
                                                    <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V6.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clip-rule="evenodd" />
                                                </svg>
                                                <span class="truncate">{file.name}</span>
                                            </button>
                                        </li>
                                    {/each}
                                </ul>
                            {:else if spec.status === 'COMPLETED'}
                                <!-- Single File Fallback -->
                                <div class="bg-zinc-950/30 px-8 py-2 text-xs text-zinc-500 italic">
                                    Single file spec
                                </div>
                            {/if}
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 flex flex-col min-w-0 bg-zinc-950">
        <!-- Content Header (Breadcrumb) -->
        <div class="h-14 border-b border-zinc-900 flex items-center px-8 text-sm text-zinc-400 shrink-0">
            {#if selectedSpec}
                 <span class="hover:text-zinc-200">Version {new Date(selectedSpec.createdAt).toLocaleDateString()}</span>
                 {#if selectedFileName}
                    <span class="mx-2 text-zinc-700">/</span>
                    <span class="text-indigo-400 font-medium">{selectedFileName}</span>
                 {/if}
            {/if}
        </div>

        <!-- Markdown Content -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div class="prose prose-invert prose-indigo max-w-3xl mx-auto pb-20">
                {#if selectedSpec}
                    {#if selectedSpec.status === 'PENDING' || selectedSpec.status === 'GENERATING'}
                         <div class="flex flex-col items-center justify-center py-20 text-zinc-400 animate-pulse gap-4 opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 animate-spin">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            <p>Drafting specification...</p>
                        </div>
                    {:else if selectedSpec.status === 'FAILED'}
                        <div class="p-4 border border-red-900/50 bg-red-900/10 rounded text-red-400 text-center">
                            Generation failed.
                        </div>
                    {:else}
                         {@html htmlContent}
                    {/if}
                {:else}
                    <div class="flex items-center justify-center h-full text-zinc-600">
                        Select a version to view specifications
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    /* Custom Scrollbar for a premium feel */
    .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #27272a; /* zinc-800 */
        border-radius: 9999px;
        border: 2px solid #09090b; /* zinc-950 */
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #3f3f46; /* zinc-700 */
    }
</style>
