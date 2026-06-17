import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardBody, CardMeta, CardTitle } from "./card";

const meta: Meta = { title: "UI/Card" };
export default meta;

type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <div className="max-w-sm">
      <Card>
        <CardBody className="space-y-2">
          <CardTitle>Course title</CardTitle>
          <CardMeta>12 episodes · 3h 45m</CardMeta>
        </CardBody>
      </Card>
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <div className="max-w-sm">
      <Card>
        <div className="aspect-video bg-gradient-to-br from-[var(--color-ink-700)] to-[var(--color-ink-900)]" />
        <CardBody className="space-y-2">
          <CardTitle>Cover-on-top</CardTitle>
          <CardMeta>Common pattern for catalog tiles.</CardMeta>
        </CardBody>
      </Card>
    </div>
  ),
};

export const Stack: Story = {
  render: () => (
    <div className="grid gap-3 max-w-md">
      <Card>
        <CardBody>
          <CardTitle>Card A</CardTitle>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <CardTitle>Card B</CardTitle>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <CardTitle>Card C</CardTitle>
        </CardBody>
      </Card>
    </div>
  ),
};
