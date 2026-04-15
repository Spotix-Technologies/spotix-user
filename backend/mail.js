import { MailerSend } from "mailersend"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Initialize MailerSend with API key
const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
})

/**
 * Send email route handler for Fastify
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} options - Route options
 */
export default async function sendMailRoutes(fastify, options) {
  // Route for booker confirmation emails
  fastify.post("/booker-confirmation", async (request, reply) => {
    try {
      const { email, name } = request.body

      if (!email || !name) {
        return reply.code(400).send({
          success: false,
          message: "Missing required fields: email or name",
        })
      }

      const emailParams = {
        from: {
          email: "auth@spotix.com.ng",
          name: "Spotix Events",
        },
        to: [
          {
            email: email,
            name: name,
          },
        ],
        subject: "Welcome to Spotix Bookers",
        template_id: "zr6ke4n8j3e4on12",
        personalization: [
          {
            email: email,
            data: {
              name: name,
              action_url: "https://www.spotix.com.ng/dashboard",
              support_url: "support@spotix.com.ng",
            },
          },
        ],
      }

      const response = await mailersend.email.send(emailParams)

      fastify.log.info("Booker confirmation email sent successfully")
      return reply.code(200).send({
        success: true,
        message: "Booker confirmation email sent successfully",
      })
    } catch (error) {
      fastify.log.error("Error sending booker confirmation email:", error)
      return reply.code(500).send({
        success: false,
        message: "Failed to send booker confirmation email",
        error: error.message,
      })
    }
  })

  // Route for payment confirmation emails
  // Route for payment confirmation emails
  fastify.post("/payment-confirmation", async (request, reply) => {
    try {
      const {
        email,
        name,
        ticket_IDs,
        ticket_references,
        event_host,
        event_name,
        payment_ref,
        ticket_types,
        booker_email,
        total_amount,
        ticket_count,
        payment_method,
      } = request.body

      // Validate required fields
      const requiredFields = {
        email,
        name,
        ticket_IDs,
        ticket_references,
        event_host,
        event_name,
        payment_ref,
        ticket_types,
        booker_email,
        total_amount,
        ticket_count,
        payment_method,
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        fastify.log.warn(`[payment-confirmation] Missing required fields: ${missingFields.join(", ")}`);
        return reply.code(400).send({
          success: false,
          message: "Missing required fields for payment confirmation email",
        });
      }

      const emailParams = {
        from: {
          email: "tickets@spotix.com.ng",
          name: "Spotix Tickets",
        },
        to: [
          {
            email: email,
            name: name,
          },
        ],
        subject: `Your Ticket for ${event_name}`,
        template_id: "3zxk54vv5op4jy6v",
        personalization: [
          {
            email: email,
            data: {
              name: name,
              ticket_IDs: ticket_IDs,
              ticket_references: ticket_references || payment_ref,
              event_host: event_host || "Spotix Event Host",
              event_name: event_name,
              payment_ref: payment_ref,
              ticket_types: ticket_types || "Standard",
              booker_email: booker_email || "support@spotix.com.ng",
              total_amount: total_amount || "0.00",
              ticket_count: ticket_count || 1,
              payment_method: payment_method,
            },
          },
        ],
      }

      await mailersend.email.send(emailParams)

      fastify.log.info("Payment confirmation email sent successfully")
      return reply.code(200).send({
        success: true,
        message: "Payment confirmation email sent successfully",
      })
    } catch (error) {
      fastify.log.error("Error sending payment confirmation email:", error)
      return reply.code(500).send({
        success: false,
        message: "Failed to send payment confirmation email",
        error: error.message,
      })
    }
  })

  // Route for welcome emails
  fastify.post("/welcome-email", async (request, reply) => {
    try {
      const { email, name } = request.body

      if (!email || !name) {
        return reply.code(400).send({
          success: false,
          message: "Missing required fields: email or name",
        })
      }

      const emailParams = {
        from: {
          email: "auth@spotix.com.ng",
          name: "Spotix Welcome",
        },
        to: [
          {
            email: email,
            name: name,
          },
        ],
        subject: "Welcome to Spotix!",
        template_id: "3vz9dle5ydplkj50",
        personalization: [
          {
            email: email,
            data: {
              name: name,
            },
          },
        ],
      }

      const response = await mailersend.email.send(emailParams)

      fastify.log.info("Welcome email sent successfully")
      return reply.code(200).send({
        success: true,
        message: "Welcome email sent successfully",
      })
    } catch (error) {
      fastify.log.error("Error sending welcome email:", error)
      return reply.code(500).send({
        success: false,
        message: "Failed to send welcome email",
        error: error.message,
      })
    }
  })
}