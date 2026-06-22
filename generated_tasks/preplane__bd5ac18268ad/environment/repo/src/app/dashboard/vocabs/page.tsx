import VocabsMainPage from "@/components/dashboard/vocabs/vocabs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vocabulary",
  description: "SAT vocabulary wordbank.",
};

export default function VocabsPage() {
  return (
    <section className="space-y-4 max-w-4xl lg:max-w-5xl xl:max-w-7xl w-full mx-auto px-3 py-10 ">
      <VocabsMainPage />
    </section>
  );
}
