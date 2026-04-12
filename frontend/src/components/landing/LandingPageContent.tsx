import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import {
  FeaturesSection,
  FinalCtaSection,
  HeroSection,
  HowItWorksSection,
  LandingFooter,
  LandingNavbar,
  SecuritySection,
  TrustBarSection,
} from "./sections";

function LandingPageContent() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <LandingNavbar scrolled={scrolled} />
      <HeroSection />
      <TrustBarSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SecuritySection />
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
}

export default LandingPageContent;
