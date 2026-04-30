import { useLandingTheme } from "./hooks/useLandingTheme";
import { ClosingCtaSection } from "./sections/ClosingCtaSection";
import { HeroSection } from "./sections/HeroSection";
import { LandingFooter } from "./sections/LandingFooter";
import { LandingNavbar } from "./sections/LandingNavbar";
import { PillarsSection } from "./sections/PillarsSection";
import { SmallFeaturesSection } from "./sections/SmallFeaturesSection";

function LandingPageContent() {
  const { theme, setTheme } = useLandingTheme();

  return (
    <div
      style={{
        background: "var(--sm-bg)",
        color: "var(--sm-fg)",
        fontFamily: "var(--sm-font-text)",
        minHeight: "100%",
        overflow: "hidden",
        transition: "background 360ms cubic-bezier(0.32, 0.72, 0, 1), color 360ms",
      }}
    >
      <LandingNavbar theme={theme} setTheme={setTheme} />
      <HeroSection />
      <PillarsSection />
      <SmallFeaturesSection />
      <ClosingCtaSection />
      <LandingFooter />
    </div>
  );
}

export default LandingPageContent;
