import PracticePageComponent from "@/components/practice";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice",
  description: "SAT practice sessions.",
};

export default function PracticePage() {
  return <PracticePageComponent />;
}
