import type { Meta, StoryObj } from "@storybook/react-vite";
import { LecturnMark } from "./lecturn-mark";

const meta: Meta<typeof LecturnMark> = {
  title: "Brand/LecturnMark",
  component: LecturnMark,
};
export default meta;

type Story = StoryObj<typeof LecturnMark>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <LecturnMark className="size-4" />
      <LecturnMark className="size-6" />
      <LecturnMark className="size-8" />
      <LecturnMark className="size-12" />
      <LecturnMark className="size-16" />
    </div>
  ),
};

export const OnDarkBackground: Story = {
  render: () => (
    <div className="bg-[var(--color-ink-950)] text-[var(--color-parchment-100)] p-8 rounded-lg">
      <div className="flex items-center gap-3">
        <LecturnMark className="size-8" />
        <span className="font-display text-2xl font-semibold">Lecturn</span>
      </div>
    </div>
  ),
};

export const Wordmark: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <LecturnMark className="size-6" />
      <span className="font-display text-xl font-semibold tracking-tight">
        Lecturn
      </span>
    </div>
  ),
};
