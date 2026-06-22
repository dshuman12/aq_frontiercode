import { HeroSection } from "@/components/home-hero";
import React from "react";
import type { Metadata } from "next";
import FooterSection from "@/components/footer";

export const metadata: Metadata = {
  title: "PrepLane",
  description: "SAT practice and review.",
};

export default function Home() {
  return (
    <React.Fragment>
      <HeroSection />
      <FooterSection />
    </React.Fragment>
  );
}
