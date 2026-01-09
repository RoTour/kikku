<script lang="ts">
    import { enhance } from '$app/forms';
    
    interface Props {
        projects: {
            id: string;
            name: string;
            status: string;
            description: string | null;
            updatedAt: string;
        }[];
        creating?: boolean;
    }

    let { projects, creating = false } = $props();
    let isCreating = $state(creating);

    function toggleCreating() {
        isCreating = !isCreating;
    }
</script>

<div class="max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Your Projects</h1>
        <button onclick={toggleCreating} class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-md font-medium transition">
            {isCreating ? 'Cancel' : 'New Project'}
        </button>
    </div>

    {#if isCreating}
        <div class="bg-zinc-900 p-6 rounded-lg border border-zinc-800 mb-8 max-w-lg">
            <h2 class="text-xl font-semibold mb-4">Create New Project</h2>
            <form method="POST" action="?/create" use:enhance={() => {
                return async ({ update }) => {
                    await update();
                    isCreating = false;
                };
            }}>
                <div class="space-y-4">
                    <div>
                        <label for="name" class="block text-sm font-medium text-zinc-400">Project Name</label>
                        <input type="text" name="name" id="name" required class="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2">
                    </div>
                    <div>
                        <label for="description" class="block text-sm font-medium text-zinc-400">Short Description (Optional)</label>
                        <input type="text" name="description" id="description" class="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2">
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium">
                            Create
                        </button>
                    </div>
                </div>
            </form>
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each projects as project}
            <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-indigo-500/50 transition duration-300 group relative">
                 <a href="/project/{project.id}" class="absolute inset-0 z-0" aria-label="View project {project.name}"></a>
                 <div class="relative z-10 pointer-events-none">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-semibold group-hover:text-indigo-400 transition">{project.name}</h3>
                            <span class="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium 
                                {project.status === 'COMPLETED' ? 'bg-green-900 text-green-300' : 'bg-zinc-800 text-zinc-400'}">
                                {project.status}
                            </span>
                        </div>
                    </div>
                    {#if project.description}
                        <p class="mt-2 text-sm text-zinc-400">{project.description}</p>
                    {/if}
                    <p class="mt-4 text-xs text-zinc-500">Updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
                 </div>
                 
                 <div class="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition">
                     <form method="POST" action="?/delete" use:enhance>
                         <input type="hidden" name="id" value={project.id}>
                         <button class="bg-red-900/50 hover:bg-red-900 text-red-200 px-2 py-1 rounded text-xs">
                             Delete
                         </button>
                     </form>
                 </div>
            </div>
        {/each}

        {#if projects.length === 0 && !isCreating}
            <div class="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <p>No projects yet. Click "New Project" to start dreaming.</p>
            </div>
        {/if}
    </div>
</div>
