<script lang="ts">
    import { goto } from '$app/navigation';
    import { authClient } from '$lib/auth-client';

    let email = $state('');
    let password = $state('');
    let loading = $state(false);
    let error = $state<string | null>(null);

    async function handleLogin() {
        loading = true;
        error = null;
        try {
            const { data, error: err } = await authClient.signIn.email({
                email,
                password,
            });
            if (err) {
                error = err.message || 'Invalid credentials';
            } else {
                goto('/dashboard');
            }
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
        <div>
            <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                Sign in to your account
            </h2>
            <p class="mt-2 text-center text-sm text-zinc-400">
                Or
                <a href="/signup" class="font-medium text-indigo-500 hover:text-indigo-400">
                    create a new account
                </a>
            </p>
        </div>
        <form class="mt-8 space-y-6" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div class="-space-y-px rounded-md shadow-sm">
                <div>
                    <label for="email-address" class="sr-only">Email address</label>
                    <input id="email-address" name="email" type="email" autocomplete="email" 
                        bind:value={email}
                        required 
                        class="relative block w-full rounded-t-md border-0 bg-zinc-900 py-1.5 text-white ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6" 
                        placeholder="Email address" />
                </div>
                <div>
                    <label for="password" class="sr-only">Password</label>
                    <input id="password" name="password" type="password" autocomplete="current-password" 
                        bind:value={password}
                        required 
                        class="relative block w-full rounded-b-md border-0 bg-zinc-900 py-1.5 text-white ring-1 ring-inset ring-zinc-700 placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6" 
                        placeholder="Password" />
                </div>
            </div>

            {#if error}
                <div class="text-red-500 text-sm text-center">{error}</div>
            {/if}

            <div>
                <button type="submit" disabled={loading}
                    class="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
                    {#if loading}
                        Signing in...
                    {:else}
                        Sign in
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>
