import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  args: { placeholder: "Type here..." },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Email: Story = {
  args: { type: "email", placeholder: "you@example.com" },
};
export const Disabled: Story = { args: { disabled: true, value: "Read only" } };

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-1.5 max-w-sm">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const Invalid: Story = {
  args: { "aria-invalid": true, value: "not-an-email" },
};
