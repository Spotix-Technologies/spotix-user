import { MetadataRoute } from 'next'
import { adminDb } from '@/app/lib/firebase-admin'

const BASE_URL = 'https://spotix.com.ng'

interface UserEvent {
  eventName: string
  eventImage?: string
  eventDate?: string
  eventEndDate?: string
  createdBy?: string
  isVerified?: boolean
  isFree?: boolean
  createdAt?: FirebaseFirestore.Timestamp
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      images: [`${BASE_URL}/logo-full.png`],
    },
    {
      url: `${BASE_URL}/home`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      images: [`${BASE_URL}/logo-full.png`],
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/vote`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/iwss`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]

  try {
    // Flat structure: events/{eventId}
    // Order by createdAt desc, limit to 10 most recent
    const eventsSnapshot = await adminDb
      .collection('events')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const eventRoutes: MetadataRoute.Sitemap = []

    eventsSnapshot.docs.forEach((doc) => {
      const event = doc.data() as UserEvent
      const eventId = doc.id
      const creatorId = event.createdBy

      if (!eventId) return

      const eventDate = event.eventDate ? new Date(event.eventDate) : null
      const now = new Date()
      const isUpcoming = eventDate ? eventDate >= now : false

      eventRoutes.push({
        url: `${BASE_URL}/event/${eventId}`,
        lastModified: eventDate || new Date(),
        changeFrequency: 'monthly',
        priority: isUpcoming ? 0.8 : 0.4,
        images: event.eventImage ? [event.eventImage] : undefined,
      })
    })

    return [...staticRoutes, ...eventRoutes]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticRoutes
  }
}