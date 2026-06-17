import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordInput } from "./password-input";
import { Label } from "./label";

const meta: Meta<typeof PasswordInput> = {
  title: "UI/PasswordInput",
  component: PasswordInput,
  args: { placeholder: "At least 8 characters" },
};
export default meta;

type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "hunter2" } };

export const InAForm: Story = {
  render: () => (
    <div className="space-y-1.5 max-w-sm">
      <Label htmlFor="pw">Password</Label>
      <PasswordInput id="pw" autoComplete="new-password" minLength={8} />
    </div>
  ),
};
