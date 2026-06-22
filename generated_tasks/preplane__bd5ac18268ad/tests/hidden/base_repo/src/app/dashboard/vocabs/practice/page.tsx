import VocabsPracticePage_Main from "@/components/dashboard/vocabs/practice/practice";
import { PracticeBanner } from "@/components/dashboard/vocabs/practice/practice-banner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vocab Practice",
  description: "Practice SAT vocabulary.",
};

export default function VocabsPracticePage() {
  return (
    <>
      <PracticeBanner />
      <section className="space-y-4 max-w-full lg:max-w-2xl w-full mx-auto px-3 py-10 ">
        <VocabsPracticePage_Main />
      </section>
    </>
  );
}
