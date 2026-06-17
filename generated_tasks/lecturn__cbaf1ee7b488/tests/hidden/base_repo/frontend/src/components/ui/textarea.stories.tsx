import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  args: { placeholder: "Type a few sentences…" },
};
export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};
export const WithValue: Story = {
  args: { defaultValue: "Pre-filled body for the editor." },
};
export const Disabled: Story = { args: { disabled: true, value: "read-only" } };
