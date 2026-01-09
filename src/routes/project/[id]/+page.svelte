<script lang="ts">
   import { goto } from '$app/navigation';
   import ChatInterface from '$lib/components/chat/ChatInterface.svelte';

   let { data } = $props();
   
   let messages = $state(data.messages);
   let loading = $state(false);
   let generating = $state(false);

    $effect(() => {
        messages = data.messages;
    });

   async function sendMessageToApi(input: string, isRetry = false) {
       loading = true;
       if (!isRetry) {
           const userMsg = { role: 'user', content: input, id: 'temp-' + Date.now() };
           messages = [...messages, userMsg];
       }

       try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: data.project.id,
                    message: input,
                    isRetry
                })
            });

            if (!response.ok) throw new Error('Failed to send');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No stream');

            const decoder = new TextDecoder();
            const aiMsgIndex = messages.length;
            messages = [...messages, { role: 'assistant', content: '', id: 'ai-' + Date.now() }];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const jsonData = JSON.parse(line.slice(6));
                            const delta = jsonData.choices[0]?.delta?.content || '';
                            messages[aiMsgIndex].content += delta;
                        } catch (e) { }
                    }
                }
            }

        } catch (e) {
            console.error(e);
            messages = [...messages, { role: 'system', content: 'Error: Could not get response.', id: 'err' }];
        } finally {
            loading = false;
        }
   }

   async function handleSend(input: string) {
       await sendMessageToApi(input);
   }

   async function handleRetry(input: string) {
       await sendMessageToApi(input, true);
   }

   async function handleGenerate() {
        if (generating) return;
        generating = true;
        try {
            const res = await fetch(`/api/project/${data.project.id}/generate`, { method: 'POST' });
            if (res.ok) {
                await goto(`/project/${data.project.id}/specs`);
            } else {
                alert('Failed to generate specs');
            }
        } catch (e) {
            console.error(e);
            alert('Error generating specs');
        } finally {
            generating = false;
        }
    }
</script>

<ChatInterface 
    messages={messages} 
    loading={loading}
    projectName={data.project.name}
    projectStatus={data.project.status}
    projectId={data.project.id}
    onSend={handleSend}
    onRetry={handleRetry}
    onGenerate={handleGenerate}
    generating={generating}
/>
