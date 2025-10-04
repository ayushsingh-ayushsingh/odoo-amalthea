import CTABanner from "@/components/ui/cta-banner";
import FAQ from "@/components/ui/faq";
import Features from "@/components/ui/features";
import Footer from "@/components/ui/footer";
import Hero from "@/components/ui/hero";
import Pricing from "@/components/ui/pricing";
import Testimonials from "@/components/ui/testimonials";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FAQ />
        <Testimonials />
        <CTABanner />
        <Footer />
      </main>
    </>
  );
}
