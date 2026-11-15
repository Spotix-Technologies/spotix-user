"use client";

import { useState, useEffect } from "react";
import Preloader from "../Preloader";
import Navbar from "./NavBar";
import Hero from "./Hero";
import Events from "./Events";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import ScrollWords from "./ScrollWords";
import Creators from "./Creators";
import BookerCTA from "./BookerCTA";
import Newsletter from "./News";
import CTA from "./CTA";
import Dialog from "./dialog";
import { Footer } from "./footer";
import { useLenisInit } from "./useLenis"
import { useScrollTriggerRefresh } from "./useScrollTriggerRefresh"

export default function LandingClient() {
  useLenisInit()
  useScrollTriggerRefresh()
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
      <Dialog />
      <div
        className={`min-h-screen overflow-x-clip bg-white transition-opacity duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <Navbar transparentAtTop />
        <Hero />
        <Events />
        <HowItWorks />
        <Features />
        <ScrollWords />
        <Creators />
        <BookerCTA />
        <Newsletter />
        <CTA />
        <Footer />
      </div>
    </>
  );
}
