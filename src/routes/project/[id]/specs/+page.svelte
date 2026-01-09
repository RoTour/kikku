<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import JSZip from 'jszip';
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

    async function downloadSpec(spec: any, event: MouseEvent) {
        event.stopPropagation();

        if (data.user.tier === 'DISCOVER') {
            goto('/pricing');
            return;
        }

        const zip = new JSZip();

        try {
            if (spec.content.trim().startsWith('[')) {
                const files = JSON.parse(spec.content);
                if (Array.isArray(files)) {
                    files.forEach(f => {
                         zip.file(f.name, f.content);
                    });
                } else {
                     zip.file('spec.md', spec.content);
                }
            } else {
                zip.file('spec.md', spec.content);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spec-${spec.createdAt.split('T')[0]}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to download zip', e);
            alert('Failed to generate zip file');
        }
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

<div class="flex h-full bg-zinc-950 text-white overflow-hidden">
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
                {#each data.specs as spec (spec.id)}
                    {@const isSelected = selectedSpecId === spec.id}

                    <li class="border-b border-zinc-800/50">
                        <!-- Version Header -->
                        <div class={`w-full text-left px-4 py-3 hover:bg-zinc-800 transition group flex flex-col gap-1 relative
                            ${isSelected ? 'bg-zinc-800' : ''}`}>

                            <!-- Main Clickable Area -->
                             <button
                                onclick={() => {
                                    selectedSpecId = spec.id;
                                    // Auto-selection logic is handled in the effect in script
                                }}
                                class="absolute inset-0 w-full h-full z-0 cursor-pointer text-left focus:outline-none"
                                aria-label="Select Version"
                            ></button>

                            <div class="flex justify-between items-center w-full z-10 pointer-events-none">
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
                            <div class="flex justify-between items-center z-10 pointer-events-none">
                                <span class="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{spec.status}</span>
                                <div class="flex items-center gap-2">
                                     <span class="text-xs text-zinc-600">{(spec.content.length / 1024).toFixed(1)} KB</span>
                                     {#if spec.status === 'COMPLETED'}
                                        <button
                                            onclick={(e) => downloadSpec(spec, e)}
                                            class="pointer-events-auto p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition"
                                            title="Download ZIP"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                            </svg>
                                        </button>
                                     {/if}
                                </div>
                            </div>
                        </div>

                        <!-- Nested Files List (Visible if spec is selected) -->
                        {#if isSelected && parsedContent}
                            {#if parsedContent.type === 'multi'}
                                <ul class="bg-zinc-950/30 py-1">


                                    {#each parsedContent.files as file, index}
                                        {@const isLocked = data.user.tier === 'DISCOVER' && index > 2}
                                        <li>
                                            <button
                                                disabled={isLocked}
                                                onclick={(e) => {
                                                    e.stopPropagation();
                                                    if (!isLocked) selectedFileName = file.name;
                                                }}
                                                class={`w-full text-left pl-8 pr-4 py-2 text-sm transition flex items-center gap-2
                                                ${selectedFileName === file.name ? 'text-indigo-400 bg-indigo-500/10 border-r-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'}
                                                ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 shrink-0 opacity-70">
                                                    {#if isLocked}
                                                        <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                                                    {:else}
                                                        <path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V6.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clip-rule="evenodd" />
                                                    {/if}
                                                </svg>
                                                <span class="truncate">{file.name} {isLocked ? '(Locked)' : ''}</span>
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
