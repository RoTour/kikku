// src/worker/index.ts
import dotenv from 'dotenv';
dotenv.config();
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { PrismaClient } from '@prisma/client';
import { PrismaChatRepository } from '../chat/infra/ChatRepository/PrismaChatRepository';
import { SpecVersion } from '../specs/domain/SpecVersion';
import { PrismaSpecRepository } from '../specs/infra/SpecRepository/PrismaSpecRepository';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const env = Bun.env;

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const specRepo = new PrismaSpecRepository(prisma);
const chatRepo = new PrismaChatRepository(prisma);

const sqs = new SQSClient({
	region: process.env.AWS_REGION || 'eu-west-3',
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
	}
});

const QUEUE_URL = process.env.SQS_QUEUE_URL;

async function generateSpec(prompt: string): Promise<string> {
	// 1. Check for Mock Mode
	if (process.env.MOCK_LLM === 'true' || process.env.NODE_ENV === 'test') {
		console.log('🤖 using MOCK LLM response');
		await new Promise((r) => setTimeout(r, 1000)); // Simulate slight delay
		return `# Mock Specification (Async Worker)

## Executive Summary
This is a generated mock specification for testing the async worker flow.

## Functional Requirements
- [x] Async Processing
- [x] Status Updates
- [x] Error Handling
`;
	}

	const apiKey = process.env.OPENROUTER_API_KEY;
	const model = process.env.LLM_SPEC_MODEL_PROD || 'google/gemini-pro-1.5';

	if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

	console.log(`🚀 Sending request to LLM (${model})...`);
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			messages: [{ role: 'user', content: prompt }]
		})
	});

	if (!response.ok) {
		const err = await response.text();
		console.error('LLM API Error:', err);
		throw new Error(`LLM Error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.choices[0]?.message?.content || '';
}

async function processMessage(message: any) {
	console.log('📥 Processing message...', message.MessageId);
	if (!message.Body) return;

	const body = JSON.parse(message.Body);
	const { specId, projectId, conversationId } = body;

	try {
		console.log(`   Project: ${projectId}, Spec: ${specId}`);

		// 1. Update Status to Generating
		// We need to fetch the spec first to confirm it exists and get creation date
		const existingSpec = await specRepo.findLatestByProjectId(projectId);

		if (!existingSpec) {
			console.error('❌ Spec not found for project', projectId);
			return;
		}

		// 2. Get History
		console.log('   Fetching chat history...');
		const history = await chatRepo.getHistory(conversationId);
		if (!history || history.length === 0) {
			console.warn('   ⚠️ No history found, using empty transcript.');
		}
		const transcript = history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

		const prompt = `
        You are a Senior Technical Product Manager...
        TRANSCRIPT:
        ${transcript}
        `;

		// 3. Generate Content
		console.log('   Generating content...');
		const content = await generateSpec(prompt);
		console.log('   ✅ Content generated (' + content.length + ' bytes)');

		// 4. Save Completed
		// Note: In a real system, we'd use updateById, but here we re-create/upsert with same ID
		// We MUST preserve the original ID and CreatedAt if we want it to be an "update"
		const completedSpec = SpecVersion.rehydrate(
			specId,
			projectId,
			content,
			'COMPLETED',
			existingSpec.createdAt // Keep original timestamp
		);

		await specRepo.save(completedSpec);
		console.log('   💾 Saved COMPLETED spec to DB.');
	} catch (e) {
		console.error('❌ Job failed', e);
		// Mark failed
		// We blindly try to update status to FAILED if possible
		try {
			// We need original timestamp
			const spec = await specRepo.findLatestByProjectId(projectId);
			if (spec) {
				const failedSpec = SpecVersion.rehydrate(
					specId,
					projectId,
					spec.content,
					'FAILED',
					spec.createdAt
				);
				await specRepo.save(failedSpec);
			}
		} catch (innerError) {
			console.error('   Failed to mark as FAILED', innerError);
		}
	}
}

async function main() {
	console.log('Worker started. Listening on', QUEUE_URL);
	while (true) {
		try {
			const result = await sqs.send(
				new ReceiveMessageCommand({
					QueueUrl: QUEUE_URL,
					MaxNumberOfMessages: 1,
					WaitTimeSeconds: 20
				})
			);

			if (result.Messages && result.Messages.length > 0) {
				for (const msg of result.Messages) {
					await processMessage(msg);
					await sqs.send(
						new DeleteMessageCommand({
							QueueUrl: QUEUE_URL,
							ReceiptHandle: msg.ReceiptHandle
						})
					);
				}
			}
		} catch (e) {
			console.error('Polling error', e);
			await new Promise((r) => setTimeout(r, 5000));
		}
	}
}

main();
