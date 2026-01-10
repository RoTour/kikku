// src/worker/index.ts
import { createOpenAI } from '@ai-sdk/openai';
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { generateObject } from 'ai';
import dotenv from 'dotenv';
import pg from 'pg';
import { z } from 'zod';
import { PrismaChatRepository } from '../chat/infra/ChatRepository/PrismaChatRepository';
import { SpecVersion } from '../specs/domain/SpecVersion';
import { PrismaSpecRepository } from '../specs/infra/SpecRepository/PrismaSpecRepository';
dotenv.config();

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

// Zod schema for spec files
const SpecSchema = z.object({
	files: z
		.array(
			z.object({
				name: z.string().describe('Filename with extension (e.g. spec.md, architecture.md)'),
				content: z.string().describe('Markdown content of the file')
			})
		)
		.describe('Array of specification files. One file per specification')
});

interface GenerateResult {
	content: string;
	usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

async function generateSpec(prompt: string): Promise<GenerateResult> {
	// 1. Check for Mock Mode
	if (process.env.MOCK_LLM === 'true' || process.env.NODE_ENV === 'test') {
		console.log('🤖 using MOCK LLM response');
		await new Promise((r) => setTimeout(r, 1000)); // Simulate delay
		const mockObj = {
			files: [
				{
					name: '0-MainContext.md',
					content: '# Main Context\n\n## Ubiquitous Language\n- **Project**: The core entity.'
				},
				{
					name: '1-Features.md',
					content: '# Features List\n\n1. MVP Feature\n2. Next Feature'
				},
				{
					name: '2-Feature1-MVP.md',
					content: '# Feature 1: MVP\n\n## DDD Analysis\n- **Aggregate**: Project'
				}
			]
		};
		return {
			content: JSON.stringify(mockObj.files),
			usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
		};
	}

	const apiKey = process.env.OPENROUTER_API_KEY;
	const modelId =
		process.env.LLM_SPEC_MODEL_DEV || process.env.LLM_SPEC_MODEL_PROD || 'google/gemini-pro-1.5';

	if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

	console.log(`🚀 Sending request to LLM (${modelId}) via SDK...`);

	const openai = createOpenAI({
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: apiKey
	});

	try {
		const result = await generateObject({
			model: openai(modelId),
			schema: SpecSchema,
			prompt: prompt
		});

		const usage = result.usage;
		return {
			content: JSON.stringify(result.object.files),
			usage: {
				promptTokens: usage.promptTokens || 0,
				completionTokens: usage.completionTokens || 0,
				totalTokens: usage.totalTokens || 0
			}
		};
	} catch (error) {
		console.error('SDK Generation Error:', error);
		throw error;
	}
}

async function processMessage(message: any) {
	console.log('📥 Processing message...', message.MessageId);
	if (!message.Body) return;

	const body = JSON.parse(message.Body);
	const { specId, projectId, conversationId } = body;

	try {
		console.log(`   Project: ${projectId}, Spec: ${specId}`);

		// [NEW] 0. Check User Balance & Project ownership
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: { user: true }
		});

		if (!project || !project.user) {
			console.error('❌ Project or User not found');
			return;
		}

		const user = project.user;

		// Balance Check for Paid Tiers
		if (user.tier !== 'DISCOVER' && user.tokenBalance <= 0) {
			// Mark spec as FAILED with specific reason?
			// Currently SpecStatus doesn't have reasons.
			console.error('❌ Insufficient tokens for user', user.id);
			// We should probably update the spec to FAILED.
			throw new Error('Insufficient tokens');
		}

		// 1. Update Status to Generating
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

		// Context from standard DDD guides
		const dddGuidelines = `
        AGGREGATES RULES:
        1. Model True Invariants: Aggregate = distinct transactional consistency boundary.
        2. Design Small Aggregates: Root Entity + minimal attributes.
        3. Reference by Identity: Aggregates reference others by ID, not object reference.
        4. Eventual Consistency: Rules spanning multiple aggregates use Domain Events.

        ENTITIES VS VALUE OBJECTS:
        - Entity: Unique identity, mutable, life cycle tracking.
        - Value Object: No identity, immutable, defined by attributes, replaceability.
        - Rule: Favor Value Objects wherever possible. Aggregates should be composed of Value Objects.

        ENTITY PATTERNS (Reference: CreateEntity.md):
        - Factory Creation: Use static \`create()\` for new instances (generates ID) and \`rehydrate()\` for persistence.
        - Private Constructor: Enforce factory usage.
        - No Direct Refs: Store \`studentIds: StudentId[]\`, not \`students: Student[]\`.
        `;

		const prompt = `
        You are a Senior Technical Product Manager and System Architect.
        Your goal is to generate a comprehensive technical specification based on the following user transcript.

        IMPORTANT: You must output your response as multiple files using XML-like tags (which will be parsed into JSON).

        Spec Structure & Philosophy:
        - We follow Domain Driven Design (DDD) principles (Strategic & Tactical).
        - We use Hexagonal Architecture (Ports/Adapters).
        - We aim for the "Most Robust App Possible".
        - We use an ITERATIVE approach. Structure your files to guide the development from an MVP Main Context to incremental features.

        Required Files Structure:

        [
            "0-MainContext.md", // Defines the Role of the app, Ubiquitous Language, Main Business Rules, Monetization Strategy, High Level Architecture (Hexagonal). Define the Bounded Contexts.
            "1-[Feature1].md", // List of all features to build, ranked by priority.
            "2-[Feature2].md", // The minimal MVP feature (e.g., "Product Page with Order Button").
            "3-[Feature3].md", // The next increment (e.g., "Payment Gateway Integration").
            "4-[Feature4].md", // and so on...
            ...
        ]

        Content Requirements for Feature Files:
        - EACH feature file must be a standalone guide to implementing that specific increment.
        - EXPLICTLY mention DDD concepts: Aggregates, Entities, Value Objects, Domain Events, Repositories, Services.
        - Define the Strategic and Tactical patterns to use.
        - TESTING: Explicitly include testing strategies using Vitest (Unit/Integration) and Playwright (E2E).
        - ARCHITECTURE: Mention how this feature fits into the Hexagonal Architecture (Domain vs Infra vs App layers).
        - GUIDELINES: Strictly adhere to the following DDD guidelines:
        ${dddGuidelines}

        The goal is that an AI Agent reading "2-Feature1.md" has EVERYTHING it needs to build that feature perfectly in a DDD/Hexagonal codebase.

        TRANSCRIPT:
        ${transcript}
        `;

		// 3. Generate Content
		console.log('   Generating content...');
		const { content: jsonContent, usage } = await generateSpec(prompt); // [MODIFIED] Destructure result
		console.log('   ✅ Content generated (' + jsonContent.length + ' bytes). Usage:', usage);

		// [NEW] Deduct Tokens
		if (usage.totalTokens > 0) {
			await prisma.user.update({
				where: { id: user.id },
				data: { tokenBalance: { decrement: usage.totalTokens } }
			});
			console.log(`   💸 Deducted ${usage.totalTokens} tokens from User ${user.id}`);
		}

		// 4. Save Completed
		const completedSpec = SpecVersion.rehydrate(
			specId,
			projectId,
			jsonContent,
			'COMPLETED',
			existingSpec.createdAt
		);

		await specRepo.save(completedSpec);
		console.log('   💾 Saved COMPLETED spec to DB.');
	} catch (e) {
		console.error('❌ Job failed', e);
		try {
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
	console.log('------------------------------------------------');
	console.log('Worker Starting...');
	console.log('AWS_REGION:', process.env.AWS_REGION);
	console.log('SQS_QUEUE_URL:', QUEUE_URL);
	console.log('AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);
	console.log('------------------------------------------------');

	console.log('Worker started. Listening on', QUEUE_URL);
	while (true) {
		// console.log('Polling SQS...');
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
