import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordStrength } from "./password-strength";

const meta: Meta<typeof PasswordStrength> = {
  title: "Auth/PasswordStrength",
  component: PasswordStrength,
};
export default meta;

type Story = StoryObj<typeof PasswordStrength>;

export const Empty: Story = { args: { password: "" } };
export const TooShort: Story = { args: { password: "abc" } };
export const Weak: Story = { args: { password: "aaaaaaaa" } };
export const Okay: Story = { args: { password: "aaaaaaaaaaaa" } };
export const Strong: Story = { args: { password: "Mixed-case-pass" } };
export const Excellent: Story = { args: { password: "Mixed-Case-12345!" } };

export const Ladder: Story = {
  render: () => (
    <div className="space-y-3 max-w-sm">
      <PasswordStrength password="abc" />
      <PasswordStrength password="aaaaaaaa" />
      <PasswordStrength password="aaaaaaaaaaaa" />
      <PasswordStrength password="Mixed-case-pass" />
      <PasswordStrength password="Mixed-Case-12345!" />
    </div>
  ),
};
