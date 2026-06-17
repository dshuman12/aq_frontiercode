import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";

const meta: Meta<typeof ModeToggle> = {
  title: "Auth/ModeToggle",
  component: ModeToggle,
};
export default meta;

type Story = StoryObj<typeof ModeToggle>;

export const TwoOptions: Story = {
  render: () => {
    const [v, setV] = useState<"a" | "b">("a");
    return (
      <div className="max-w-xs">
        <ModeToggle
          value={v}
          onChange={setV}
          options={[
            { value: "a", label: "Password" },
            { value: "b", label: "Magic link" },
          ]}
        />
      </div>
    );
  },
};

export const ThreeOptions: Story = {
  render: () => {
    const [v, setV] = useState<"a" | "b" | "c">("b");
    return (
      <div className="max-w-md">
        <ModeToggle
          value={v}
          onChange={setV}
          options={[
            { value: "a", label: "Daily" },
            { value: "b", label: "Weekly" },
            { value: "c", label: "Monthly" },
          ]}
        />
      </div>
    );
  },
};
