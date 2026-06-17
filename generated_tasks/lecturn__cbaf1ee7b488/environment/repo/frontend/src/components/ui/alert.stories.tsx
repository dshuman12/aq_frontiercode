import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./alert";

const meta: Meta<typeof Alert> = {
  title: "UI/Alert",
  component: Alert,
  args: { children: "Something happened — here are the details." },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["info", "success", "error"],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Alert>;

export const Info: Story = { args: { variant: "info", title: "Heads up" } };
export const Success: Story = {
  args: {
    variant: "success",
    title: "Saved",
    children: "Your changes are persisted.",
  },
};
export const Error_: Story = {
  args: {
    variant: "error",
    title: "Something went wrong",
    children: "Try again, or check the API console.",
  },
};
export const NoTitle: Story = {
  args: { variant: "info", title: undefined },
};
export const LongBody: Story = {
  args: {
    variant: "info",
    title: "Long-form alert",
    children:
      "When the body is long the layout should still align icon + heading + body cleanly. Resize your viewport to confirm there's no awkward wrap on small widths.",
  },
};
