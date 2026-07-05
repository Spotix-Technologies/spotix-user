"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Calendar,
  Eye,
  CheckCircle2,
  Lock,
  FileText,
  BookOpen,
  ShieldCheck,
  LifeBuoy,
  Mail,
  Share2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Copyright,
  Heart,
} from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#faf9fb] text-[#4b4257] border-t border-[#ece7f1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Image src="/logo.png" alt="Spotix Logo" width={140} height={38} className="mb-4" />
            <h3 className="text-lg font-bold text-[#6b2fa5] mb-2">Spotix</h3>
            <p className="text-sm text-[#7c7389] leading-relaxed mb-4">
              The premier event management platform empowering bookers to create, monitor, and manage events with
              ease. Streamline your ticketing, track sales in real-time, and deliver exceptional experiences to your
              attendees.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#7c7389]">
              {/* <span className="w-2 h-2 bg-[#16a34a] rounded-full animate-pulse" /> */}
              <iframe
                title="Spotix status badge"
                src="https://status.spotix.com.ng/badge?theme=light"
                width={250}
                height={30}
                frameBorder={0}
                scrolling="no"
                style={{ colorScheme: "normal" }}
              />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#171123] font-bold text-sm uppercase tracking-wide mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/create-event" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <Calendar className="w-4 h-4 text-[#6b2fa5]" />
                  Create Event
                </Link>
              </li>
              <li>
                <Link href="/events" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <Eye className="w-4 h-4 text-[#6b2fa5]" />
                  All Events
                </Link>
              </li>
              <li>
                <Link href="/verify-ticket" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-[#6b2fa5]" />
                  Verify Tickets
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[#171123] font-bold text-sm uppercase tracking-wide mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <Lock className="w-4 h-4 text-[#6b2fa5]" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <FileText className="w-4 h-4 text-[#6b2fa5]" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/knowledge-base" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <BookOpen className="w-4 h-4 text-[#6b2fa5]" />
                  Knowledge Base
                </Link>
              </li>
              <li>
                <Link href="/data-protection" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                  <ShieldCheck className="w-4 h-4 text-[#6b2fa5]" />
                  Data Protection Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-[#171123] font-bold text-sm uppercase tracking-wide mb-4">Get in Touch</h4>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2.5 text-[#4b4257]">
                <LifeBuoy className="w-4 h-4 text-[#6b2fa5]" />
                Have questions or need support?
              </p>
              <a href="mailto:support@spotix.com" className="flex items-center gap-2.5 text-[#4b4257] hover:text-[#6b2fa5] transition-colors">
                <Mail className="w-4 h-4 text-[#6b2fa5]" />
                support@spotix.com
              </a>
              <div className="pt-3">
                <p className="text-xs mb-3 flex items-center gap-2 text-[#7c7389]">
                  <Share2 className="w-3.5 h-3.5 text-[#6b2fa5]" />
                  Follow us
                </p>
                <div className="flex gap-2.5">
                  {[
                    { href: "https://twitter.com/spotix", Icon: Twitter, label: "Twitter" },
                    { href: "https://linkedin.com/company/spotix", Icon: Linkedin, label: "LinkedIn" },
                    { href: "https://instagram.com/spotix", Icon: Instagram, label: "Instagram" },
                    { href: "https://facebook.com/spotix", Icon: Facebook, label: "Facebook" },
                  ].map(({ href, Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-9 h-9 rounded-full bg-white border border-[#ece7f1] hover:bg-[#6b2fa5] hover:border-[#6b2fa5] flex items-center justify-center transition-colors group"
                    >
                      <Icon className="w-4 h-4 text-[#6b2fa5] group-hover:text-white transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-4 border-t border-[#ece7f1]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#7c7389] flex items-center gap-2">
              <Copyright className="w-4 h-4 text-[#6b2fa5]" />
              {currentYear} <span className="text-[#6b2fa5] font-semibold">Spotix Technologies</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#7c7389]">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-[#6b2fa5] fill-[#6b2fa5]" />
              <span>for event creators worldwide</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
