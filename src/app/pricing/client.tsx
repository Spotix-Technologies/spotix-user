"use client"

import { useEffect, useRef } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import Navbar from "@/components/landing/NavBar"
import { Footer } from "@/components/landing/footer"
import { GRADIENTS, UI } from "@/components/landing/theme"
import {
  Ticket,
  Vote,
  ShoppingBag,
  Palette,
  Globe,
  Mail,
  CreditCard,
  Check,
  MessageCircle,
  ChevronRight,
  ArrowRight,
  Wallet,
  Users,
  Info,
} from "lucide-react"

/* ─── Content ─────────────────────────────────────────────────────────────── */

const trustPoints = ["No hidden fees", "Only pay for what you use", "You choose who pays the fees"]

const primaryPricing = {
  title: "Event Tickets",
  rate: "5% + ₦100",
  subtitle: "per ticket sold",
  description:
    "For every paid event ticket purchased on Spotix Web, Spotix Bot, Spotix App, or via the Spotix API system, we reserve a transparent service fee of 5% plus ₦100.",
  features: [
    "Instant QR code ticket delivery",
    "Real-time sales tracking",
    "Secure payment processing",
    "24/7 customer support",
    "No hidden charges",
  ],
}

/** Worked example used by both the fee breakdown and the two "who pays" options (₦10,000 ticket). */
const EXAMPLE = {
  price: "₦10,000",
  percentage: "₦500",
  flat: "₦100",
  fee: "₦600",
}

const feeOptions = [
  {
    tag: "Option 1 · Default",
    icon: Users,
    title: "Buyers pay the fees",
    description:
      "The service fee is added on top of your ticket price at checkout. Your ticket price stays whole, so you receive every naira you priced.",
    rows: [
      { label: "Ticket price", value: EXAMPLE.price },
      { label: "Service fee, added at checkout", value: `+ ${EXAMPLE.fee}` },
    ],
    buyerPays: "₦10,600",
    youReceive: "₦10,000",
    bestFor: "Best for keeping your full payout intact.",
  },
  {
    tag: "Option 2",
    icon: Wallet,
    title: "You cover the fees",
    description:
      "Buyers pay just the ticket price, nothing extra at checkout. We take the service fee from your proceeds instead.",
    rows: [
      { label: "Ticket price", value: EXAMPLE.price },
      { label: "Service fee, taken from your proceeds", value: `− ${EXAMPLE.fee}` },
    ],
    buyerPays: "₦10,000",
    youReceive: "₦9,400",
    bestFor: "Best for clean pricing: what buyers see is what they pay.",
  },
]

const secondaryPricing = [
  {
    title: "Voting Rates",
    rate: "10%",
    subtitle: "per vote",
    description:
      "We collect 10% of every paid voting fee across Spotix Web and Spotix Bot, ensuring fair and transparent voting systems for your events.",
    icon: Vote,
  },
  {
    title: "Merchandise Rates",
    rate: "10%",
    subtitle: "per sale",
    description:
      "We collect 10% of every merchandise item sold across Spotix Web and Spotix Bot, helping you manage event merch seamlessly.",
    icon: ShoppingBag,
  },
]

const auxiliaryServices = [
  {
    title: "Graphics Design",
    description:
      "Need a stunning design flyer for your event? Our expert designers have you covered! Get professional, eye-catching graphics that make your event stand out.",
    icon: Palette,
    pricing: "Contact for quote",
    features: ["Professional event flyers", "Social media graphics", "Promotional banners", "Fast turnaround time"],
  },
  {
    title: "Custom Event Page",
    description:
      "Build on the Spotix Event API to create fully customized event pages tailored to your brand. Perfect for enterprises and large-scale events.",
    icon: Globe,
    pricing: "Contact for quote",
    features: ["Full API access", "Custom branding", "Advanced analytics", "Priority support"],
  },
  {
    title: "Branded Email",
    description:
      "Why create an entire Gmail account for your event when you can get one on Spotix? Rent or own a professional email address. The choice is yours!",
    icon: Mail,
    pricing: "Contact for quote",
    features: [
      "your-event@booker.spotix.com.ng",
      "Professional appearance",
      "Integrated with platform",
      "Flexible rent or buy options",
    ],
    example: "your-event-name@booker.spotix.com.ng",
  },
  {
    title: "Spotix Smart Card",
    description:
      "One card, any event. Pay for any event on Spotix and have it automatically linked to your card. The ultimate convenience for frequent event-goers.",
    icon: CreditCard,
    pricing: "Contact for quote",
    features: ["Universal event access", "Contactless payments", "Auto-sync with account", "Exclusive cardholder perks"],
  },
]

/* ─── Small shared pieces ─────────────────────────────────────────────────── */

/** Fades + lifts its children in once, the first time they scroll into view (same pattern as the landing sections). */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("pr-visible")
          obs.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={`pr-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  lead,
  center = false,
}: {
  eyebrow: string
  title: string
  lead: string
  center?: boolean
}) {
  return (
    <Reveal className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className={`${UI.eyebrow} mb-3`}>{eyebrow}</p>
      <h2 className={`${UI.h2} mb-4`}>{title}</h2>
      <p className={UI.lead}>{lead}</p>
    </Reveal>
  )
}

function IconTile({ icon: Icon, dark = false }: { icon: typeof Ticket; dark?: boolean }) {
  return (
    <div
      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
        dark ? "bg-white/15 text-white" : "bg-[#f5f0fb] text-[#6b2fa5]"
      }`}
    >
      <Icon className="h-6 w-6" />
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function PricingClient() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <Navbar />

      {/* ── Hero ── */}
      <section className={`relative overflow-hidden pb-16 pt-32 sm:pb-20 sm:pt-40 ${UI.bandWhite}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(ellipse 60% 70% at 50% 0%, rgba(107,47,165,0.10) 0%, transparent 70%)" }}
        />

        <div className={`${UI.container} relative`}>
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center justify-center gap-2 text-sm text-[#7c7389]">
            <Link href="/" className="transition-colors hover:text-[#6b2fa5]">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-[#171123]" aria-current="page">
              Pricing
            </span>
          </nav>

          <div className="mx-auto max-w-3xl text-center">
            <p className={`${UI.eyebrow} mb-4`}>Pricing</p>
            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-[#171123] sm:text-5xl lg:text-6xl">
              Transparent pricing, <span className="text-[#6b2fa5]">no hidden fees</span>
            </h1>
            <p className={`${UI.lead} mx-auto mt-6 max-w-2xl`}>
              Simple, straightforward pricing that grows with your events. Only pay for what you use, with complete
              transparency every step of the way.
            </p>

            <ul className="mt-10 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-[#4b4257] sm:flex-row">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#6b2fa5]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Event tickets (primary) ── */}
      <section className={`py-20 sm:py-24 ${UI.bandGrey}`}>
        <div className={UI.container}>
          <SectionHeading
            eyebrow="Core ticketing"
            title="Our main service, at the best rates in Nigeria"
            lead="One simple fee on every paid ticket, and you decide who pays it."
          />

          {/* Rate card */}
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-12" style={{ background: GRADIENTS.brand }}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(255,255,255,0.16) 0%, transparent 70%)" }}
              />
              <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <IconTile icon={Ticket} dark />
                  <h3 className="mb-3 mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {primaryPricing.title}
                  </h3>
                  <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-5xl font-bold tracking-tight text-white sm:text-6xl">{primaryPricing.rate}</span>
                    <span className="text-lg text-white/85">{primaryPricing.subtitle}</span>
                  </div>
                  <p className="mb-7 text-base leading-relaxed text-white/85 sm:text-lg">{primaryPricing.description}</p>

                  <ul className="space-y-3">
                    {primaryPricing.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-white">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How the fee adds up */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                    How the fee adds up
                  </p>
                  <p className="mt-2 text-sm text-white/70">On a {EXAMPLE.price} ticket:</p>

                  <dl className="mt-5 space-y-3 text-sm sm:text-base">
                    <div className="flex items-center justify-between text-white/80">
                      <dt>5% of ticket price</dt>
                      <dd className="font-semibold text-white">{EXAMPLE.percentage}</dd>
                    </div>
                    <div className="flex items-center justify-between text-white/80">
                      <dt>Flat fee</dt>
                      <dd className="font-semibold text-white">{EXAMPLE.flat}</dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-white">
                      <dt className="font-semibold">Spotix service fee</dt>
                      <dd className="text-xl font-bold text-white">
                        {EXAMPLE.fee}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-6 text-sm leading-relaxed text-white/80">
                    Who pays this fee is up to you. See the two options below.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Who pays the fees */}
          <div className="mt-20">
            <SectionHeading
              eyebrow="You're in control"
              title="Event bookers decide who pays the fees"
              lead="Choose how the fees are handled for each event. Either way, the numbers are clear before a single ticket is sold."
            />

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              {feeOptions.map((option, index) => (
                <Reveal key={option.title} delay={index * 90}>
                  <article className={`flex h-full flex-col p-6 sm:p-8 ${UI.card}`}>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <IconTile icon={option.icon} />
                      <span className="rounded-full bg-[#f5f0fb] px-3 py-1 text-xs font-semibold text-[#6b2fa5]">
                        {option.tag}
                      </span>
                    </div>

                    <h3 className="mb-2 text-xl font-bold tracking-tight text-[#171123] sm:text-2xl">{option.title}</h3>
                    <p className="mb-6 leading-relaxed text-[#6b6478]">{option.description}</p>

                    {/* Receipt-style breakdown */}
                    <div className="mt-auto">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7c7389]">
                        Example · {EXAMPLE.price} ticket
                      </p>
                      <dl className="space-y-2.5 rounded-xl bg-[#f7f6f9] p-4 text-sm sm:text-base">
                        {option.rows.map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-4 text-[#4b4257]">
                            <dt>{row.label}</dt>
                            <dd className="flex-shrink-0 font-semibold text-[#171123]">{row.value}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#ece7f1] p-4">
                          <p className="text-xs font-medium text-[#7c7389]">Buyer pays</p>
                          <p className="mt-1 text-xl font-bold text-[#171123] sm:text-2xl">{option.buyerPays}</p>
                        </div>
                        <div className="rounded-xl bg-[#171123] p-4">
                          <p className="text-xs font-medium text-white/60">You receive</p>
                          <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{option.youReceive}</p>
                        </div>
                      </div>

                      <p className="mt-5 flex items-start gap-2 text-sm text-[#4b4257]">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#6b2fa5]" />
                        {option.bestFor}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={120}>
              <p className="mx-auto mt-8 flex max-w-3xl items-start gap-2.5 text-sm leading-relaxed text-[#6b6478]">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#6b2fa5]" />
                <span>
                  You set this per event, so you can pick a different option for each one. Examples show Spotix&apos;s
                  service fee. Payment processing fees from our payment partner are handled the same way, either paid
                  by buyers or covered by you, and are always itemised at checkout.
                </span>
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Voting & merchandise (secondary) ── */}
      <section className={`py-20 sm:py-24 ${UI.bandWhite}`}>
        <div className={UI.container}>
          <SectionHeading
            eyebrow="More ways to earn"
            title="Voting and merchandise"
            lead="Maximize your event monetization with paid voting and event merchandise."
          />

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {secondaryPricing.map((service, index) => (
              <Reveal key={service.title} delay={index * 90}>
                <article className={`h-full p-6 transition-colors duration-300 hover:border-[#171123]/25 sm:p-8 ${UI.card}`}>
                  <IconTile icon={service.icon} />
                  <h3 className="mb-3 mt-6 text-xl font-bold tracking-tight text-[#171123] sm:text-2xl">{service.title}</h3>
                  <div className="mb-4 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight text-[#171123]">{service.rate}</span>
                    <span className="text-lg text-[#7c7389]">{service.subtitle}</span>
                  </div>
                  <p className="leading-relaxed text-[#6b6478]">{service.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Premium add-ons (auxiliary) ── */}
      <section className={`py-20 sm:py-24 ${UI.bandGrey}`}>
        <div className={UI.container}>
          <SectionHeading
            eyebrow="Premium add-ons"
            title="Take your events to the next level"
            lead="Professional services built around your event, priced to fit it."
          />

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {auxiliaryServices.map((service, index) => (
              <Reveal key={service.title} delay={(index % 2) * 90}>
                <article className={`h-full bg-white p-6 transition-colors duration-300 hover:border-[#171123]/25 sm:p-8 ${UI.card}`}>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <IconTile icon={service.icon} />
                    <span className="rounded-full bg-[#f5f0fb] px-3 py-1 text-sm font-semibold text-[#6b2fa5]">
                      {service.pricing}
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl font-bold tracking-tight text-[#171123] sm:text-2xl">{service.title}</h3>
                  <p className="mb-6 leading-relaxed text-[#6b6478]">{service.description}</p>

                  {service.example && (
                    <div className="mb-6 rounded-xl border border-[#ece7f1] bg-[#f7f6f9] p-3">
                      <div className="mb-1 text-xs text-[#7c7389]">Example:</div>
                      <code className="break-all font-mono text-sm text-[#6b2fa5]">{service.example}</code>
                    </div>
                  )}

                  <ul className="space-y-2">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#6b2fa5]" />
                        <span className="text-sm text-[#4b4257]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={`px-4 py-24 sm:px-6 sm:py-28 lg:px-8 ${UI.bandWhite}`}>
        <Reveal>
          <div
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12 sm:py-20"
            style={{ background: GRADIENTS.brand }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(255,255,255,0.16) 0%, transparent 70%)" }}
            />
            <div className="relative">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <h2 className="mx-auto mb-5 max-w-2xl text-balance text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Have questions about pricing?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-white/85">
                Our team is ready to help you understand our pricing and find the best solution for your events. Chat
                with us now!
              </p>
              <a
                href="https://tawk.to/spotix"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-semibold text-[#171123] transition-colors duration-200 hover:bg-[#f0eaf8]"
              >
                Chat with our team
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <p className="mt-6 text-sm text-white/80">Average response time: Less than 2 minutes</p>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />

      <style jsx global>{`
        .pr-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .pr-reveal.pr-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .pr-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
