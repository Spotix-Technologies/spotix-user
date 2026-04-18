"use client";

import { useState, useEffect } from "react";
import Preloader from "../Preloader";
import Navbar from "./NavBar";
import Hero from "./Hero";
import Events from "./Events";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import Creators from "./Creators";
import BookerCTA from "./BookerCTA";
import Newsletter from "./News";
import CTA from "./CTA";
import Footer from "@/components/footer";
import { useLenisInit } from "./useLenis"

export default function LandingClient() {
  useLenisInit() 
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Preloader />
      <div
        className={`min-h-screen transition-opacity duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <Navbar />
        <Hero />
        <Events />
        <HowItWorks />
        <Features />
        <Creators />
        <BookerCTA />
        <Newsletter />
        <CTA />
        <Footer />
      </div>
    </>
  );
}
