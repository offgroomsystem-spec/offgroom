import { StoreLayout } from "@/components/store/StoreLayout";
import { HeroSection } from "@/components/store/HeroSection";
import { ClientLogos } from "@/components/store/ClientLogos";
import { VideoSection } from "@/components/store/VideoSection";
import { FeaturedFeatures } from "@/components/store/FeaturedFeatures";
import { FeaturesSection } from "@/components/store/FeaturesSection";
import { BenefitsSection } from "@/components/store/BenefitsSection";
import { TestimonialsSection } from "@/components/store/TestimonialsSection";
import { PricingSection } from "@/components/store/PricingSection";
import { CTASection } from "@/components/store/CTASection";
import { StoreFooter } from "@/components/store/StoreFooter";
const Store = () => {
  return <StoreLayout>
      <HeroSection />
      <ClientLogos />
      <VideoSection />
      <FeaturedFeatures />
      <FeaturesSection />
      <BenefitsSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <StoreFooter />
    </StoreLayout>;
};
export default Store;