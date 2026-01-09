<script lang="ts">
    import ProjectList from '$lib/components/dashboard/ProjectList.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-zinc-950 text-white p-6">
    <ProjectList projects={data.projects} />
</div>
