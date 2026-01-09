import ChatInterface from '$lib/components/chat/ChatInterface.svelte';
import type { Meta, StoryObj } from '@storybook/svelte';

const meta = {
  title: 'Chat/ChatInterface',
  component: ChatInterface,
  tags: ['autodocs'],
  argTypes: {
    loading: { control: 'boolean' },
    generating: { control: 'boolean' },
    onSend: { action: 'onSend' },
    onRetry: { action: 'onRetry' },
    onGenerate: { action: 'onGenerate' }
  }
} satisfies Meta<ChatInterface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  args: {
    messages: [
       { id: '1', role: 'system', content: 'Welcome to the Architect.' },
       { id: '2', role: 'assistant', content: 'I am ready to help you define your app. What is your idea?' } 
    ],
    loading: false,
    projectName: 'My Dream App',
    projectStatus: 'DRAFT',
    projectId: '123'
  }
};

export const UserSent: Story = {
  args: {
    messages: [
       { id: '1', role: 'assistant', content: 'What is your idea?' },
       { id: '2', role: 'user', content: 'I want a pizza delivery drone app.' }
    ],
    loading: true, // User sent, waiting for reply
    projectName: 'Pizza Drone',
    projectStatus: 'DRAFT',
    projectId: '123'
  }
};

export const UserRetry: Story = {
  args: {
    messages: [
       { id: '1', role: 'assistant', content: 'What is your idea?' },
       { id: '2', role: 'user', content: 'I want a pizza delivery drone app.' } 
    ],
    loading: false, 
    projectName: 'Pizza Drone',
    projectStatus: 'DRAFT',
    projectId: '123'
  }
};

export const WithMath: Story = {
  args: {
    messages: [
       { id: '1', role: 'user', content: 'What is the formula for linear growth?' },
       { id: '2', role: 'assistant', content: 'The formula is $Reward = Base \\times (1 + \\frac{1.2 \\times Streak}{100})$.' }
    ],
    loading: false,
    projectName: 'Math Whiz',
    projectStatus: 'ACTIVE',
    projectId: '123'
  }
};
