import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CirclePlay } from "lucide-react";
import React from "react";
import LogoCloud from "./logo-cloud";
import BlurText from "@/components/BlurText";
import { Navbar } from "@/components/navbar";
import Ballpit from '@/components/Ballpit';
import Link from "next/link";

function HeroHeading() {
  return (
    <BlurText
      text="Customized Shadcn UI Blocks & Components"
      delay={100}
      animateBy="words"
      direction="top"
      className="mb-2 t-6 max-w-[20ch] flex justify-center text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold !leading-[1.2] tracking-tight text-center mx-auto"
    />
  )
}

const Hero = () => {
  return (
    <div id="page-top" className="relative min-h-[100vh] flex flex-col items-center justify-center py-20 px-6 overflow-hidden">
      {/* Radial Background */}
      <div className="bg-radial from-background/80 to-transparent absolute inset-0 -z-[8]" />

      {/* Background */}
      <div className="absolute inset-0 -z-10 md:block hidden">
        <Ballpit
          count={50}
          gravity={0.1}
          friction={0.9975}
          wallBounce={0.5}
          followCursor={false}
        />
      </div>

      {/* Content */}
      <div>
        <Navbar />
        <div className="flex items-center justify-center z-10">
          <div className="text-center max-w-2xl">
            <Badge className="bg-primary rounded-full py-1 border-none">
              v1.0.0 is available now! 🚀
            </Badge>

            <div className="flex flex-col justify-center w-full max-w-2xl mt-4">
              <HeroHeading />
            </div>

            <p className="mt-6 max-w-[60ch] xs:text-lg w-full text-center mx-auto">
              Explore a collection of Shadcn UI blocks and components, ready to
              preview and copy. Streamline your development workflow with
              easy-to-implement examples.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center sm:justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-full text-base"
                asChild
              >
                <Link href={"/login"} target="_blank">
                  Get Started <ArrowUpRight className="!h-5 !w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full text-base shadow-none"
              >
                <CirclePlay className="!h-5 !w-5" /> Watch Demo
              </Button>
            </div>
          </div>
        </div>
        <LogoCloud className="mt-24 max-w-3xl mx-auto z-10" />
      </div>
    </div>
  );
};

export default Hero;
