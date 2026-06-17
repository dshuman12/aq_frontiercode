import type { Preview } from "@storybook/react-vite";
import { Inter, Fraunces } from "next/font/google";
import "../src/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "parchment",
      values: [
        { name: "parchment", value: "var(--background)" },
        { name: "ink", value: "var(--color-ink-950)" },
      ],
    },
    a11y: { test: "todo" },
  },
  globalTypes: {
    theme: {
      description: "Theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme === "dark" ? "dark" : "";
      return (
        <div
          className={`${inter.variable} ${fraunces.variable} ${theme} min-h-[200px] p-8`}
          style={{ background: "var(--background)", color: "var(--foreground)" }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
