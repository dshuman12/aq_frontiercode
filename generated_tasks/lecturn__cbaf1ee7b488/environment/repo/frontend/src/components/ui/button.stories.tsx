import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  args: { children: "Button" },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["default", "accent", "outline", "ghost", "destructive"],
    },
    size: {
      control: { type: "inline-radio" },
      options: ["sm", "md", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Accent: Story = { args: { variant: "accent", children: "Sign in" } };
export const Outline: Story = { args: { variant: "outline", children: "Cancel" } };
export const Ghost: Story = { args: { variant: "ghost", children: "More" } };
export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete library" },
};

export const WithLeadingIcon: Story = {
  args: {
    variant: "accent",
    children: (
      <>
        <Plus className="size-4" /> Create
      </>
    ),
  },
};

export const WithTrailingIcon: Story = {
  args: {
    variant: "accent",
    children: (
      <>
        Continue <ArrowRight className="size-4" />
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    variant: "accent",
    disabled: true,
    children: (
      <>
        <Loader2 className="size-4 animate-spin" /> Saving…
      </>
    ),
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="i">
        <Plus className="size-4" />
      </Button>
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };
