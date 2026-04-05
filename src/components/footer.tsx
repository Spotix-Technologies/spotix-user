"use client"

import { Twitter, Instagram, Facebook, Linkedin } from "lucide-react"

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-slate-800 to-slate-700 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/logo.svg" 
                alt="Spotix" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-[#6b2fa5] to-purple-400 bg-clip-text text-transparent">
                Spotix
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Your premier platform for discovering and booking amazing events. Connect with your community through
              unforgettable experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/home" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="/events" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Events
                </a>
              </li>
              {/* <li>
                <a 
                  href="/about" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="/contact" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Contact
                </a>
              </li> */}
            </ul>
          </div>

          {/* Support Links */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white">Support</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://spotix.tawk.help" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a 
                  href="https://spotix.com.ng/privacy-policy" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Privacy Policy
                </a>
              </li>
              {/* <li>
                <a 
                  href="https://spotix-4u.web.app/acceptable-usage.html" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Terms of Service
                </a>
              </li> */}
              <li>
                <a 
                  href="https://spotix.com.ng/pricing" 
                  className="text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white">Connect</h3>
            <div className="flex flex-col space-y-3">
              {/* <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm group"
              >
                <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-purple-600 transition-colors duration-200">
                  <Twitter className="w-4 h-4" />
                </div>
                <span>Twitter</span>
              </a> */}
              <a
                href="https://instagram.com/spotixnigeria"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm group"
              >
                <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-purple-600 transition-colors duration-200">
                  <Instagram className="w-4 h-4" />
                </div>
                <span>Instagram</span>
              </a>
              {/* <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm group"
              >
                <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-purple-600 transition-colors duration-200">
                  <Facebook className="w-4 h-4" />
                </div>
                <span>Facebook</span>
              </a> */}
              {/* <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors duration-200 text-sm group"
              >
                <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-purple-600 transition-colors duration-200">
                  <Linkedin className="w-4 h-4" />
                </div>
                <span>LinkedIn</span>
              </a> */}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-slate-600">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm text-center sm:text-left">
              &copy; {currentYear} Spotix. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm text-center sm:text-right flex items-center gap-1">
              Made with 
              <svg 
                className="w-4 h-4 text-red-500 animate-pulse" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" 
                  clipRule="evenodd" 
                />
              </svg>
              for event enthusiasts
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer