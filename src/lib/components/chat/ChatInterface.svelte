<script lang="ts">
    import katex from 'katex';
    import 'katex/dist/katex.min.css';
    import { marked } from 'marked';

    const katexExtension = {
        name: 'math',
        level: 'inline',
        start(src: string) { return src.indexOf('$'); },
        tokenizer(src: string, tokens: any) {
            const match = /^\$([^$\n]+?)\$/.exec(src);
            if (match) {
                return {
                    type: 'math',
                    raw: match[0],
                    text: match[1].trim()
                };
            }
        },
        renderer(token: any) {
            try {
                return katex.renderToString(token.text, {
                    displayMode: false,
                    throwOnError: false
                });
            } catch (e) {
                return token.text;
            }
        }
    };
    
    marked.use({ extensions: [katexExtension] });
        interface Props {
        messages: {
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
        }[];
        loading: boolean;
        projectName: string;
        projectStatus: string;
        projectId: string; // for links
        onSend: (message: string) => void;
        onRetry?: (message: string) => void;
        onGenerate?: () => void;
        generating?: boolean;
    }

    let { 
        messages, 
        loading, 
        projectName, 
        projectStatus, 
        projectId,
        onSend,
        onRetry,
        onGenerate,
        generating = false
    } = $props();

    let input = $state('');
    let messagesContainer: HTMLDivElement;

    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    $effect(() => {
        // Auto scroll when messages change
        // We just access messages.length to trigger dependency
        if (messages.length) scrollToBottom();
    });

    function handleSubmit(e: Event) {
        e.preventDefault();
        if (!input.trim() || loading) return;
        onSend(input);
        input = '';
    }
</script>

<div class="fixed inset-0 flex flex-col bg-zinc-950 text-white">
    <!-- Header -->
    <header class="h-16 border-b border-zinc-800 flex items-center px-6 bg-zinc-900 justify-between">
        <div>
            <h1 class="font-bold text-lg">{projectName}</h1>
            <span class="text-xs text-zinc-500 uppercase tracking-widest">{projectStatus}</span>
        </div>
        <div class="flex items-center gap-4">
            {#if onGenerate}
             <button 
                onclick={onGenerate} 
                disabled={generating || messages.length < 2}
                class="bg-zinc-800 hover:bg-zinc-700 text-sm px-3 py-1.5 rounded transition disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate Specs'}
            </button>
            {/if}
            <a href="/project/{projectId}/specs" class="text-sm text-zinc-400 hover:text-white">View Specs</a>
            <a href="/dashboard" class="text-sm text-zinc-400 hover:text-white">Back</a>
        </div>
    </header>

    <!-- Chat Area -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6" bind:this={messagesContainer}>
        {#each messages as msg}
            <div class={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div class={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed 
                    prose prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:bg-black/30
                    ${msg.role === 'user' 
                        ? 'bg-indigo-600 text-white prose-headings:text-white prose-a:text-white' 
                        : msg.role === 'system'
                            ? 'bg-red-900/50 text-red-200 border border-red-900'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}>
                    {@html marked.parse(msg.content)}
                </div>
                {#if msg.role === 'user' && !loading && onRetry && (messages.indexOf(msg) === messages.length - 1)}
                    <button 
                        onclick={() => onRetry(msg.content)}
                        class="mt-1 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 opacity-70 hover:opacity-100 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                            <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.312-.312a7 7 0 00-11.712 3.139.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.312h-2.433a.75.75 0 000 1.5h4.242a.75.75 0 00.53-.219z" clip-rule="evenodd" />
                        </svg>
                        Retry
                    </button>
                {/if}
            </div>
        {/each}
        
        {#if loading && messages.length > 0 && messages[messages.length-1].role === 'user'}
           <div class="flex justify-start">
               <div class="bg-zinc-800 text-zinc-500 px-4 py-2 rounded-lg text-sm animate-pulse">
                   Thinking...
               </div>
           </div>
        {/if}
    </div>

    <!-- Input Area -->
    <div class="p-4 border-t border-zinc-800 bg-zinc-900">
        <form class="max-w-4xl mx-auto relative" onsubmit={handleSubmit}>
            <textarea 
                bind:value={input}
                disabled={loading}
                placeholder="Describe your feature..." 
                onkeydown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !loading) {
                            onSend(input);
                            input = '';
                        }
                    }
                }}
                class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-3 px-5 pr-12 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 resize-none min-h-[50px] max-h-[200px]"
                rows="1"
            ></textarea>
            <button 
                type="submit" 
                disabled={!input.trim() || loading}
                class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:text-indigo-400 disabled:opacity-30 transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
            </button>
        </form>
    </div>
</div>
