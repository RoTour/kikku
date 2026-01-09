<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	
	let { children } = $props();

    // Simple active link helper
    function isActive(path: string) {
        return page.url.pathname.startsWith(path);
    }
</script>

<div class="flex flex-col h-screen bg-black text-white selection:bg-indigo-500/30">
    <!-- Top Navigation -->
    <nav class="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-50">
        <div class="flex items-center gap-8">
            <a href="/dashboard" class="font-bold text-xl tracking-tighter flex items-center gap-2">
                <span class="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs">K</span>
                Kikku
            </a>

            <div class="hidden md:flex items-center gap-1">
                <a href="/dashboard" class={`px-3 py-1.5 rounded text-sm transition ${isActive('/dashboard') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Dashboard
                </a>
                <a href="/pricing" class={`px-3 py-1.5 rounded text-sm transition ${isActive('/pricing') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Pricing
                </a>
            </div>
        </div>

        <div class="flex items-center gap-4">
             <!-- User Profile / Logout Could go here -->
             <a href="/logout" class="text-sm text-zinc-500 hover:text-zinc-300">Sign out</a>
        </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
        <div class="flex-1 overflow-y-auto w-full">
            {@render children()}
        </div>
    </main>
</div>
