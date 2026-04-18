"use client"

import Spline from "@splinetool/react-spline"
import { useEffect, useRef } from 'react'
import { getLenis } from './useLenis'

export default function SplineTicket() {
  const ticketRef = useRef<any>(null)

  function onLoad(app: any) {
    // Replace 'Ticket' with the exact object name in your Spline scene
    ticketRef.current = app.findObjectByName('Ticket')
  }

  useEffect(() => {
    let attempt = 0
    let cleanup: (() => void) | null = null

    function attach() {
      const lenis = getLenis()
      if (!lenis) {
        if (attempt++ < 40) setTimeout(attach, 100)
        return
      }

      function onScroll({ scroll }: { scroll: number }) {
        const ticket = ticketRef.current
        if (!ticket) return
        // Drive Y rotation from scroll position
        ticket.rotation.y = scroll * 0.003
      }

      lenis.on('scroll', onScroll)
      cleanup = () => lenis.off('scroll', onScroll)
    }

    attach()
    return () => { cleanup?.() }
  }, [])

  return (
    <Spline
      scene="https://prod.spline.design/w8Lk-AjbOcPnmyWP/scene.splinecode"
      onLoad={onLoad}
    />
  )
}