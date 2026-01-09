import ProjectList from '$lib/components/dashboard/ProjectList.svelte';
import type { Meta, StoryObj } from '@storybook/svelte';

const meta = {
  title: 'Dashboard/ProjectList',
  component: ProjectList,
  tags: ['autodocs'],
  argTypes: {
    creating: { control: 'boolean' },
    projects: { control: 'object' }
  }
} satisfies Meta<ProjectList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    projects: [],
    creating: false
  }
};

export const Populated: Story = {
  args: {
    projects: [
      {
        id: '1',
        name: 'Super App',
        status: 'DRAFT',
        description: 'An app to save the world',
        updatedAt: '2023-01-01'
      },
      {
        id: '2',
        name: 'Finished App',
        status: 'COMPLETED',
        description: null,
        updatedAt: '2023-01-02'
      }
    ]
  }
};

export const Creating: Story = {
  args: {
    projects: [],
    creating: true
  }
};
