"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Heart, Share2, Calendar, Clock, Users, Palette, Info, Check, X, TrendingUp, Award, MapPin, CalendarDays, Timer } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import ShareBtn from "@/components/ShareBtn"

interface EventCountdownProps {
  eventDate: string
  eventStart: string
}

const EventCountdown: React.FC<EventCountdownProps> = ({ eventDate, eventStart }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    hasOccurred: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasOccurred: false,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Parse event date and time
      const eventDateTime = new Date(eventDate)
      
      // If eventStart is provided, parse the time
      if (eventStart && eventStart !== "Not specified") {
        // Try to parse time in various formats (HH:MM AM/PM, HH:MM)
        const timeMatch = eventStart.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          const meridiem = timeMatch[3]?.toUpperCase()

          // Convert to 24-hour format if AM/PM is present
          if (meridiem) {
            if (meridiem === 'PM' && hours !== 12) {
              hours += 12
            } else if (meridiem === 'AM' && hours === 12) {
              hours = 0
            }
          }

          eventDateTime.setHours(hours, minutes, 0, 0)
        }
      }

      const now = new Date()
      const difference = eventDateTime.getTime() - now.getTime()

      if (difference <= 0) {
        // Event has occurred
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          hasOccurred: true,
        }
      }

      // Calculate time components
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      return {
        days,
        hours,
        minutes,
        seconds,
        hasOccurred: false,
      }
    }

    // Initial calculation
    setTimeLeft(calculateTimeLeft())

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    // Cleanup
    return () => clearInterval(timer)
  }, [eventDate, eventStart])

  if (timeLeft.hasOccurred) {
    return (
      <div className="mt-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-5 border-2 border-gray-300">
        <div className="flex items-center justify-center gap-3">
          <CalendarDays size={20} className="text-gray-600" />
          <p className="text-base font-bold text-gray-700">Event Occurred</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Timer size={18} className="text-[#6b2fa5] animate-pulse" />
        <p className="text-sm font-bold text-[#6b2fa5] uppercase tracking-wider">
          Event Starts In
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {/* Days */}
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border border-purple-200">
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#6b2fa5] text-center mb-1">
            {timeLeft.days.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold text-gray-600 text-center uppercase">
            DD
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border border-purple-200">
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#6b2fa5] text-center mb-1">
            {timeLeft.hours.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold text-gray-600 text-center uppercase">
            HH
          </div>
        </div>

        {/* Minutes */}
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border border-purple-200">
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#6b2fa5] text-center mb-1">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold text-gray-600 text-center uppercase">
            MM
          </div>
        </div>

        {/* Seconds */}
        <div className="bg-white rounded-xl p-3 md:p-4 shadow-md border border-purple-200">
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#6b2fa5] text-center mb-1">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold text-gray-600 text-center uppercase">
            SS
          </div>
        </div>
      </div>
    </div>
  )
}

interface EventDetailsTabProps {
  eventData: {
    eventName: string
    eventType: string
    eventDate: string
    eventEndDate: string
    eventStart: string
    eventEnd: string
    enableMaxSize?: boolean
    maxSize?: string
    ticketsSold?: number
    enableColorCode?: boolean
    colorCode?: string
    eventDescription?: string
    allowAgents?: boolean
  }
  eventUrl: string
  isLiked: boolean
  likeCount: number
  isLiking: boolean
  isSoldOut: boolean
  onToggleLike: () => void
}

const EventDetailsSection: React.FC<EventDetailsTabProps> = ({
  eventData,
  eventUrl,
  isLiked,
  likeCount,
  isLiking,
  isSoldOut,
  onToggleLike,
}) => {
  const shareDescription = `Hey, I saw this event on Spotix and I thought you might be interested too! Have a look at it here: ${eventUrl}`

  // Calculate capacity percentage
  const getCapacityPercentage = () => {
    if (!eventData.enableMaxSize || !eventData.maxSize) return 0
    const sold = eventData.ticketsSold || 0
    const max = Number.parseInt(eventData.maxSize)
    return Math.round((sold / max) * 100)
  }

  const capacityPercentage = getCapacityPercentage()
  const isHighDemand = capacityPercentage >= 75 && capacityPercentage < 100
  const isAlmostFull = capacityPercentage >= 90 && capacityPercentage < 100

  // Format date elegantly
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString("en-US", { month: "short" })
    const year = date.getFullYear()
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" })
    
    return { day, month, year, weekday }
  }

  const startDate = formatDate(eventData.eventDate)
  const endDate = eventData.eventEndDate ? formatDate(eventData.eventEndDate) : null

  return (
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header without Gradient Banner */}
      <div className="p-6 md:p-8 border-b-2 border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-3">
              {eventData.eventName}
            </h1>
            <div className="inline-flex items-center gap-2 bg-purple-100 border-2 border-[#6b2fa5] text-[#6b2fa5] px-4 py-2 rounded-full shadow-sm">
              <Award size={18} />
              <span className="font-bold text-sm md:text-base">{eventData.eventType}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              className={`group flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-bold shadow-md transform hover:scale-105 ${
                isLiked
                  ? "bg-purple-100 text-[#6b2fa5] border-2 border-[#6b2fa5]"
                  : "bg-white text-gray-700 hover:bg-purple-50 hover:text-[#6b2fa5] border-2 border-gray-300 hover:border-[#6b2fa5]"
              }`}
              onClick={onToggleLike}
              disabled={isLiking}
            >
              <Heart 
                size={20} 
                className={`transition-all ${isLiked ? "fill-current" : "group-hover:fill-[#6b2fa5]"}`} 
              />
              <span>
                {formatNumber(likeCount)} {likeCount === 1 ? "Like" : "Likes"}
              </span>
            </button>

            <ShareBtn url={eventUrl} title={`Join me at ${eventData.eventName}`} description={shareDescription} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8 space-y-8">

        {/* Date & Time Information - Redesigned */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <CalendarDays size={20} className="text-[#6b2fa5]" />
              </div>
              <h3 className="font-bold text-gray-900 text-xl">Event Schedule</h3>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Start Date & Time - Posh Design */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#6b2fa5] to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
                <div className="relative bg-white rounded-2xl border-2 border-purple-100 p-6 hover:border-purple-300 transition-all">
                  {/* Label */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-[#6b2fa5] rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-[#6b2fa5] uppercase tracking-wider">Starts</span>
                  </div>

                  {/* Date Display - Calendar Style */}
                  <div className="flex items-center gap-5 mb-5">
                    <div className="bg-gradient-to-br from-[#6b2fa5] to-purple-600 rounded-2xl p-4 shadow-lg min-w-[100px] text-center">
                      <div className="text-white/80 text-xs font-bold uppercase mb-1">
                        {startDate.month}
                      </div>
                      <div className="text-white text-4xl font-bold leading-none mb-1">
                        {startDate.day}
                      </div>
                      <div className="text-white/80 text-xs font-semibold">
                        {startDate.year}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="text-gray-900 font-bold text-lg mb-1">
                        {startDate.weekday}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {new Date(eventData.eventDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="flex items-center gap-3 pt-4 border-t-2 border-purple-100">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock size={20} className="text-[#6b2fa5]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Start Time
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {eventData.eventStart || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* End Date & Time - Posh Design */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-[#6b2fa5] rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
                <div className="relative bg-white rounded-2xl border-2 border-purple-100 p-6 hover:border-purple-300 transition-all">
                  {/* Label */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Ends</span>
                  </div>

                  {/* Date Display - Calendar Style */}
                  {endDate ? (
                    <>
                      <div className="flex items-center gap-5 mb-5">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-4 shadow-lg min-w-[100px] text-center">
                          <div className="text-white/80 text-xs font-bold uppercase mb-1">
                            {endDate.month}
                          </div>
                          <div className="text-white text-4xl font-bold leading-none mb-1">
                            {endDate.day}
                          </div>
                          <div className="text-white/80 text-xs font-semibold">
                            {endDate.year}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="text-gray-900 font-bold text-lg mb-1">
                            {endDate.weekday}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {eventData.eventEndDate && new Date(eventData.eventEndDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Time Display */}
                      <div className="flex items-center gap-3 pt-4 border-t-2 border-purple-100">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Clock size={20} className="text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            End Time
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {eventData.eventEnd || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[180px]">
                      <p className="text-gray-400 text-sm font-medium">End date not specified</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Event Countdown Indicator */}
            <EventCountdown 
              eventDate={eventData.eventDate} 
              eventStart={eventData.eventStart} 
            />
          </div>
        </div>

        {/* Event Capacity - Only if enabled */}
        {eventData.enableMaxSize && (
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users size={16} className="text-[#6b2fa5]" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Event Capacity</h3>
                </div>
                {isSoldOut && (
                  <span className="inline-flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    <X size={12} />
                    SOLD OUT
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <TrendingUp size={24} className="text-[#6b2fa5]" />
                  </div>
                  <div>
                    {/* <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tickets Sold</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(eventData.ticketsSold || 0)} / {formatNumber(Number.parseInt(eventData.maxSize))}
                    </p> */}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fill Rate</p>
                  <p className={`text-3xl font-bold ${
                    isSoldOut ? "text-red-600" : isAlmostFull ? "text-orange-600" : isHighDemand ? "text-yellow-600" : "text-[#6b2fa5]"
                  }`}>
                    {capacityPercentage}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSoldOut
                        ? "bg-gradient-to-r from-red-500 to-red-600"
                        : isAlmostFull
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : isHighDemand
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                        : "bg-gradient-to-r from-[#6b2fa5] to-purple-600"
                    }`}
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
                {isHighDemand && !isSoldOut && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
                      <TrendingUp size={16} className="text-yellow-600" />
                      High Demand! {100 - capacityPercentage}% of tickets remaining
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Color Code Section */}
        {eventData.enableColorCode && eventData.colorCode && (
          <div className="bg-white rounded-xl shadow-md border-2 border-purple-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Palette size={20} className="text-[#6b2fa5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Theme</p>
                  <p className="text-sm font-bold text-gray-900">Custom Color Code</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl border-4 border-white shadow-lg ring-2 ring-gray-200"
                  style={{ backgroundColor: eventData.colorCode }}
                />
                <span className="text-lg font-mono font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                  {eventData.colorCode}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Event Description */}
        {eventData.eventDescription && (
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Info size={16} className="text-[#6b2fa5]" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">About This Event</h3>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap">
                  {eventData.eventDescription}
                </p>
              </div>

              {/* Agent Activity */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b-2 border-gray-200">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-600" />
                    <h4 className="font-bold text-gray-900">Ticket Sales</h4>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        eventData.allowAgents ? "bg-green-100" : "bg-gray-100"
                      }`}>
                        {eventData.allowAgents ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <X size={20} className="text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent Status</p>
                        <p className="text-sm font-bold text-gray-900">
                          {eventData.allowAgents ? "Authorized Agents Enabled" : "Organizer Only"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                        eventData.allowAgents
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {eventData.allowAgents ? (
                        <>
                          <Check size={14} />
                          Agents Can Sell
                        </>
                      ) : (
                        <>
                          <X size={14} />
                          Restricted
                        </>
                      )}
                    </span>
                  </div>
                  {eventData.allowAgents && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-800 leading-relaxed">
                        This event allows authorized agents to sell tickets on behalf of the organizer, making it easier to reach more attendees.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EventDetailsSection