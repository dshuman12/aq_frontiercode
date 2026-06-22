import QuestionBankPageComponent from "@/components/questionbank/qb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Question Bank",
  description: "Browse and filter SAT questions.",
};

export default function QuestionbankPage() {
  return <QuestionBankPageComponent />;
}
