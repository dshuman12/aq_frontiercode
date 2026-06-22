import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Question",
  description: "Look up an SAT question by ID.",
};

export default function QuestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
