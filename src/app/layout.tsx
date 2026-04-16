import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TawkToChat from "./Tawktochat";
import { AuthProvider } from "@/app/hooks/useAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://spotix.com.ng"),
  
  title: {
    default: "Spotix Nigeria - Find, Book & Create Events | Event Tickets & Management",
    template: "%s | Spotix Nigeria",
  },
  
  description: "Find, book, and attend the best events everywhere in Nigeria. Discover concerts, night parties, workshops, religious events, and more on Spotix. Create events, sell tickets, and manage your events with AI-powered tools, offline tickets, real-time collaboration, and secure payments. Serving Lagos, Abuja, Port Harcourt, Enugu, Anambra, and all of Nigeria.",
  
  keywords: [
    "event tickets Nigeria",
    "book concert tickets",
    "create events",
    "ticket sales Nigeria",
    "event management Nigeria",
    "easy ticket purchase Nigeria",
    "Lagos events",
    "Abuja events",
    "Port Harcourt events",
    "Enugu events",
    "Anambra events",
    "concert tickets Nigeria",
    "night parties Nigeria",
    "workshops Nigeria",
    "religious events Nigeria",
    "event booking platform",
    "sell event tickets",
    "event ticketing system",
    "online ticket sales",
    "event management platform",
    "create event Nigeria",
  ],
  
  authors: [{ name: "Spotix Technologies" }],
  creator: "Spotix Technologies",
  publisher: "Spotix Technologies",
  
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://spotix.com.ng",
    siteName: "Spotix Nigeria",
    title: "Spotix Nigeria - Spot Your Next Adventure | Event Tickets & Management",
    description: "Find, book, and attend the best events everywhere in Nigeria. Discover concerts, night parties, workshops, religious events, and more. AI-powered event management with instant QR tickets, secure payments, and real-time collaboration.",
    images: [
      {
        url: "https://i.postimg.cc/FR5xpcpZ/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Spotix Nigeria - Event Ticketing Platform",
        type: "image/jpeg",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    site: "@SpotixNG",
    creator: "@SpotixNG",
    title: "Spotix Nigeria - Spot Your Next Adventure | Event Tickets & Management",
    description: "Find, book, and attend the best events everywhere in Nigeria. Discover concerts, night parties, workshops, religious events, and more on Spotix.",
    images: ["https://i.postimg.cc/FR5xpcpZ/hero.jpg"],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  manifest: "/manifest.json",
  
  alternates: {
    canonical: "https://spotix.com.ng",
  },
  
  verification: {
 
  },
  
  category: "Events & Entertainment",
  
  other: {
    "mobile-web-app-capable": "no",
    "apple-mobile-web-app-capable": "no",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Spotix",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Theme Color */}
        <meta name="theme-color" content="#6b2fa5" />
        <meta name="msapplication-TileColor" content="#6b2fa5" />
        
        {/* Additional Meta Tags */}
        <meta name="application-name" content="Spotix Nigeria" />
        <meta name="apple-mobile-web-app-title" content="Spotix" />
        
        {/* Geographic Tags */}
        <meta name="geo.region" content="NG" />
        <meta name="geo.placename" content="Nigeria" />
        <meta name="coverage" content="Nigeria" />
        <meta name="distribution" content="global" />
        <meta name="target" content="all" />
        <meta name="audience" content="all" />
        
        {/* Organization Schema (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Spotix Technologies",
              alternateName: "Spotix Nigeria",
              url: "https://spotix.com.ng",
              logo: "https://spotix.com.ng/logo-full.png",
              description: "Find, book, and attend the best events everywhere in Nigeria. AI-powered event management platform.",
              slogan: "Spot Your Next Adventure",
              foundingDate: "2024",
              areaServed: {
                "@type": "Country",
                name: "Nigeria",
              },
              sameAs: [
                "https://twitter.com/SpotixNG",
                "https://www.instagram.com/spotixnigeria",
                "https://www.facebook.com/spotixnigeria",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "Customer Service",
                availableLanguage: ["English"],
                areaServed: "NG",
              },
            }),
          }}
        />
        
        {/* Website Schema (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Spotix Nigeria",
              url: "https://spotix.com.ng",
              description: "Find, book, and attend the best events everywhere in Nigeria.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://spotix.com.ng/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
              publisher: {
                "@type": "Organization",
                name: "Spotix Technologies",
                logo: {
                  "@type": "ImageObject",
                  url: "https://spotix.com.ng/logo-full.png",
                },
              },
            }),
          }}
        />
        
        {/* Service Schema (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              serviceType: "Event Ticketing and Management Platform",
              provider: {
                "@type": "Organization",
                name: "Spotix Technologies",
              },
              areaServed: {
                "@type": "Country",
                name: "Nigeria",
              },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Event Services",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Event Ticket Booking",
                      description: "Book tickets for concerts, parties, workshops, and events across Nigeria",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Event Creation and Management",
                      description: "Create, manage, and sell tickets for your events with AI-powered tools",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Ticket Sales Platform",
                      description: "Sell event tickets online with secure payments and instant QR codes",
                    },
                  },
                ],
              },
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "NGN",
                lowPrice: "0",
                highPrice: "1000000",
                offerCount: "1000+",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <TawkToChat />
        </AuthProvider>
      </body>
    </html>
  );
}
