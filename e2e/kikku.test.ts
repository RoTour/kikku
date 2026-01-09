import { expect, test } from '@playwright/test';

test.describe('Kikku E2E Flow', () => {
    test('User can sign up, create project, chat, and generate spec', async ({ page }) => {
        // 1. Signup
        const email = `test-${Date.now()}@example.com`;
        const name = 'Test User';
        const password = 'password123';

        await page.goto('/signup');
        await page.fill('input[name="name"]', name);
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        // Check for error if navigation failed
        try {
            await expect(page).toHaveURL('/dashboard');
        } catch (e) {
            const errorText = await page.getByRole('alert').textContent().catch(() => null) 
                || await page.locator('.text-red-500').textContent().catch(() => null);
            console.log('Signup failed with UI Error:', errorText);
            throw e;
        }
        
        // 2. Create Project
        await page.click('button:has-text("New Project")');
        await page.fill('input[name="name"]', 'E2E App');
        await page.fill('input[name="description"]', 'An app tested by Playwright');
        await page.click('form button:has-text("Create")');

        // Wait for card and click it
        // Note: ProjectList updates optimistically or via server reload
        await expect(page.getByText('E2E App')).toBeVisible();
        await page.click('a[aria-label="View project E2E App"]');

        // 3. Chat
        // Expect Chat Interface
        await expect(page).toHaveURL(/\/project\/.+/);
        await expect(page.getByText('E2E App')).toBeVisible();

        // Send Message
        await page.fill('input[placeholder="Describe your feature..."]', 'I need a login screen.');
        await page.click('button[type="submit"]');

        // Wait for response (Streaming or complete)
        // We look for any assistant message.
        // Since we are using real backend, it might take a second.
        // If LLM is not configured/fails, this might fail. 
        // We'll proceed assuming it works. If not, we'll see failure.
        // We can verify "Thinking..." appears first.
        
        // Wait for thinking to disappear or new message to appear
        // The assistant message div doesn't have a unique class but we can look for text content logic or CSS.
        // In +page.svelte: msg.role === 'assistant' -> bg-zinc-800
        // We can wait for a second message bubble.
        await expect(page.locator('.bg-zinc-800').nth(1)).toBeVisible({ timeout: 15000 }); 
        // nth(0) is system prompt "Welcome..."? No, data.messages usually empty or has welcome?
        // In +page.server.ts load function, history is fetched. Initially empty or previous?
        // If brand new project, history might be empty unless we seed it.
        // My code: chatRepo.createConversation() happens on first POST.
        // So initially `messages` is empty.
        // "Welcome" message is NOT hardcoded in server load.
        // So first bubble is User. Second is Assistant.

        // 4. Generate Spec
        // Need at least 2 messages for button to enable?
        // UI: disabled={generating || messages.length < 2}
        await expect(page.locator('button:has-text("Generate Specs")')).toBeEnabled();
        await page.click('button:has-text("Generate Specs")');

        // 5. Spec Viewer
        // Should redirect to /project/[id]/specs
        await expect(page).toHaveURL(/\/project\/.*\/specs/);
        await expect(page.getByText('Versions')).toBeVisible();
        // Check for markdown content (rendered HTML)
        await expect(page.locator('.prose')).toBeVisible();
    });
});
