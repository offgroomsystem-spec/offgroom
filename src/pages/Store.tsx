import { StoreLayout } from "@/components/store/StoreLayout";
import { HeroSection } from "@/components/store/HeroSection";
import { VideoSection } from "@/components/store/VideoSection";
import { FeaturesSection } from "@/components/store/FeaturesSection";
import { WhyChooseSection } from "@/components/store/WhyChooseSection";
import { ScreenshotsSection } from "@/components/store/ScreenshotsSection";
import { PricingSection } from "@/components/store/PricingSection";
import { TestimonialsSection } from "@/components/store/TestimonialsSection";
import { StoreFooter } from "@/components/store/StoreFooter";

const Store = () => {
  return (
    <StoreLayout>
      <HeroSection />
      <VideoSection />
      <FeaturesSection />
      <WhyChooseSection />
      <ScreenshotsSection />
      <PricingSection />
      <TestimonialsSection />
      <StoreFooter />
    </StoreLayout>
  );
};

export default Store;
