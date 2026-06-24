"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Menu, X, CalendarPlus, User, Globe, CreditCard, ClipboardCheck, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  HeaderContainer,
  LogoSection,
  Logo,
  Title,
  MenuIcon,
  NavOverlay,
  Nav,
  NavList,
  NavItem,
  Footer,
  FooterLink,
  CloseIcon,
  DesktopNav,
  DesktopNavList,
  DesktopNavItem,
} from "./header.styled"

const UserHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/v1/auth", {
        method: "GET",
        credentials: "include",
      })
      
      const data = await response.json()
      setIsAuthenticated(data.authenticated || false)
    } catch (error) {
      console.error("Error checking auth status:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    try {
      const response = await fetch("/api/v1/user/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        // Clear localStorage user data
        if (typeof window !== "undefined") {
          localStorage.removeItem("spotix_user")
        }
        
        // Update auth state
        setIsAuthenticated(false)
        
        // Close menu
        setMenuOpen(false)
        
        // Redirect to login page
        router.push("/auth/login")
      } else {
        console.error("Logout failed")
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev)
  }

  return (
    <>
      <HeaderContainer>
        <LogoSection>
          <Link href="/">
            <Logo src="/logo.svg" alt="Spotix Logo" />
          </Link>
          <Title>
            <Link href="/">Spotix</Link>
          </Title>
        </LogoSection>

        {/* Desktop Navigation */}
        <DesktopNav>
          <DesktopNavList>
            <DesktopNavItem>
              <Link href="/home">Home</Link>
            </DesktopNavItem>
            <DesktopNavItem>
              <Link href="/discover">Discover Events</Link>
            </DesktopNavItem>
            <DesktopNavItem>
              <Link href="/profile">My Profile</Link>
            </DesktopNavItem>
            <DesktopNavItem>
              <Link href="/ticket-history">My Tickets</Link>
            </DesktopNavItem>
            <DesktopNavItem>
              <Link href="/Referrals">Referrals</Link>
            </DesktopNavItem>
            <DesktopNavItem>
              <Link href="https://booker.spotix.com.ng/create-event">Create Event</Link>
            </DesktopNavItem>
          </DesktopNavList>
        </DesktopNav>

        {/* Mobile Menu Icon */}
        <MenuIcon onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={28} /> : <Menu size={28} />}</MenuIcon>
      </HeaderContainer>

      {/* Mobile Navigation */}
      <NavOverlay $menuOpen={menuOpen} onClick={() => setMenuOpen(false)} />
      <Nav $menuOpen={menuOpen}>
        <NavList>
          <CloseIcon onClick={toggleMenu} />
          <NavItem onClick={() => setMenuOpen(false)}>
            <CalendarPlus size={20} />
            <Link href="/home">Home</Link>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <Globe size={20} />
            <Link href="/discover">Discover Events</Link>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <User size={20} />
            <Link href="/profile">My Profile</Link>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <CreditCard size={20} />
            <Link href="/ticket-history">My Tickets</Link>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <ClipboardCheck size={20} />
            <Link href="/Referrals">Referrals</Link>
          </NavItem>
        </NavList>

        {/* Auth-Aware Footer */}
        <Footer>
          {!isLoading && (
            <>
              {isAuthenticated ? (
                // Logged In: Show Booker Dashboard and Logout
                <>
                  <FooterLink
                    as="a"
                    href="https://booker.spotix.com.ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "linear-gradient(135deg, #6b2fa5 0%, #8b5cf6 100%)",
                      color: "white",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      textAlign: "center",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(107, 47, 165, 0.3)",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "block",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)"
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(107, 47, 165, 0.4)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 47, 165, 0.3)"
                    }}
                  >
                    Go to Dashboard
                  </FooterLink>
                  <FooterLink
                    as="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    style={{
                      background: "white",
                      color: "#6b2fa5",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      textAlign: "center",
                      border: "2px solid #6b2fa5",
                      cursor: isLoggingOut ? "not-allowed" : "pointer",
                      opacity: isLoggingOut ? 0.6 : 1,
                      transition: "all 0.2s ease",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoggingOut) {
                        e.currentTarget.style.background = "#f3f4f6"
                        e.currentTarget.style.transform = "translateY(-2px)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoggingOut) {
                        e.currentTarget.style.background = "white"
                        e.currentTarget.style.transform = "translateY(0)"
                      }
                    }}
                  >
                    <LogOut size={18} />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </FooterLink>
                </>
              ) : (
                // Logged Out: Show Login and Signup
                <>
                  <FooterLink
                    as={Link}
                    href="/auth/login"
                    style={{
                      background: "linear-gradient(135deg, #6b2fa5 0%, #8b5cf6 100%)",
                      color: "white",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      textAlign: "center",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(107, 47, 165, 0.3)",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "block",
                    }}
                    onClick={() => setMenuOpen(false)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)"
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(107, 47, 165, 0.4)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 47, 165, 0.3)"
                    }}
                  >
                    Login
                  </FooterLink>
                  <FooterLink
                    as={Link}
                    href="/auth/signup"
                    style={{
                      background: "white",
                      color: "#6b2fa5",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      fontWeight: "600",
                      textAlign: "center",
                      border: "2px solid #6b2fa5",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textDecoration: "none",
                      display: "block",
                    }}
                    onClick={() => setMenuOpen(false)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6"
                      e.currentTarget.style.transform = "translateY(-2px)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "white"
                      e.currentTarget.style.transform = "translateY(0)"
                    }}
                  >
                    Sign Up
                  </FooterLink>
                </>
              )}
            </>
          )}
        </Footer>
      </Nav>
    </>
  )
}

export default UserHeader