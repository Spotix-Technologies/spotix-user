import { Metadata } from "next";
import {
  ClipboardList,
  Building2,
  FolderOpen,
  Settings,
  Wallet,
  Handshake,
  Users,
  Cookie,
  Wrench,
  Archive,
  Scale,
  ShieldCheck,
  ShieldOff,
  FileEdit,
  Mail,
} from "lucide-react";

import UserHeader from "../../components/UserHeader";
import Footer from "../../components/footer";
import TableOfContents from "./components/TableOfContents";
import PolicyHero from "./components/PolicyHero";
import PolicySection from "./components/PolicySection";
import InfoCard from "./components/InfoCard";

export const metadata: Metadata = {
  title: "Privacy Policy — Spotix Event",
  description:
    "Understand how Spotix Technologies collects, uses, stores, and protects your personal data on the Spotix Event platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <UserHeader />

      <main className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">

          {/* Hero */}
          <PolicyHero />

          {/* Layout: TOC + Content */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

            {/* ── Sidebar / Mobile sticky TOC ── */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <TableOfContents />
            </div>

            {/* ── Article ── */}
            <article className="flex-1 min-w-0">

              {/* 01 */}
              <PolicySection id="overview" number={1} Icon={ClipboardList} title="Overview">
                <p>
                  This Privacy Policy is issued by <strong>Spotix Technologies</strong> ("we",
                  "us", "our"), a company duly registered in the Federal Republic of Nigeria. It
                  governs the collection, use, storage, and disclosure of personal data through
                  our product, the <strong>Spotix Event</strong> platform — a service for
                  discovering, listing, booking, and managing events across Nigeria and other
                  African countries.
                </p>
                <p>
                  By accessing or using Spotix Event — whether as an event organizer or as an
                  attendee — you acknowledge that you have read and understood this Policy. If
                  you do not agree, please discontinue use of the platform.
                </p>
                <InfoCard type="note">
                  This Policy is governed by the <strong>Nigeria Data Protection Act (NDPA)
                  2023</strong> and the <strong>Nigeria Data Protection Regulation (NDPR)</strong>.
                  Where we operate in other African countries, we additionally observe the
                  applicable national data protection laws of those jurisdictions.
                </InfoCard>
              </PolicySection>

              {/* 02 */}
              <PolicySection id="who-we-are" number={2} Icon={Building2} title="Who We Are">
                <p>
                  <strong>Spotix Technologies</strong> is the data controller responsible for
                  your personal information. We operate the <strong>Spotix Event</strong> platform
                  and the <strong>Spotix Integrated Wallet Settlement System (IWSS)</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Legal name:</strong> Spotix Technologies</li>
                  <li><strong>Product:</strong> Spotix Event</li>
                  <li><strong>Registered in:</strong> Federal Republic of Nigeria</li>
                  <li>
                    <strong>Privacy contact:</strong>{" "}
                    <a href="mailto:support@spotix.com.ng" className="text-[#6b2fa5] underline underline-offset-2">
                      support@spotix.com.ng
                    </a>
                  </li>
                </ul>
              </PolicySection>

              {/* 03 */}
              <PolicySection id="data-we-collect" number={3} Icon={FolderOpen} title="Data We Collect">
                <p>
                  We collect personal data in three ways: directly from you, automatically
                  through your use of the platform, and from third parties where applicable.
                </p>

                <p className="font-semibold text-slate-800 mt-4">A. Data collected from Event Organizers</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Identity:</strong> Full name and email address</li>
                  <li><strong>Contact:</strong> Phone number</li>
                  <li><strong>Profile:</strong> Profile photo or avatar</li>
                  <li><strong>Demographics:</strong> Date of birth and gender</li>
                  <li>
                    <strong>Business verification:</strong> Government-issued ID and/or CAC
                    (Corporate Affairs Commission) registration documents to verify your identity
                    as a legitimate organizer
                  </li>
                  <li><strong>Business details:</strong> Business name and registered address</li>
                  <li>
                    <strong>Financial:</strong> Bank account details provided for payout
                    settlements via the IWSS wallet system
                  </li>
                </ul>

                <p className="font-semibold text-slate-800 mt-4">B. Data collected from Attendees</p>
                <p>
                  Attendees may purchase tickets without creating a Spotix account. In doing so,
                  we collect their <strong>name, email address, and phone number</strong> to
                  process and confirm the booking.
                </p>
                <InfoCard type="note">
                  If an attendee later creates a Spotix account using the same email address they
                  used to purchase tickets, their ticket history and booking data will
                  automatically sync to the new account.
                </InfoCard>

                <p className="font-semibold text-slate-800 mt-4">C. Event-specific data</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Event location coordinates:</strong> GPS coordinates submitted by
                    organizers when creating event listings, used to display accurate venue maps
                    to attendees.
                  </li>
                </ul>

                <p className="font-semibold text-slate-800 mt-4">D. Automatically collected data</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Device data:</strong> Device type, operating system, device identifiers</li>
                  <li><strong>Browser data:</strong> Browser type, version, language settings, and screen resolution</li>
                  <li><strong>Usage data:</strong> Pages visited, events browsed, actions taken, session duration</li>
                  <li><strong>Network data:</strong> IP address and approximate location derived from it</li>
                  <li><strong>Cookies and tracking data:</strong> See Section 8 for full details</li>
                </ul>
              </PolicySection>

              {/* 04 */}
              <PolicySection id="how-we-use-data" number={4} Icon={Settings} title="How We Use Your Data">
                <p>
                  We process your personal data only for lawful, specific, and legitimate purposes:
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong>Account creation & verification:</strong> To register and verify organizer accounts, including identity and business verification via Government ID / CAC documents.</li>
                  <li><strong>Event management:</strong> To allow organizers to create, publish, and manage event listings.</li>
                  <li><strong>Ticket sales & bookings:</strong> To process ticket purchases, issue digital tickets, and send booking confirmations to attendees.</li>
                  <li><strong>Event discovery:</strong> To display relevant events based on location, preferences, and browsing activity.</li>
                  <li><strong>Payments & settlements:</strong> To facilitate payments via card, bank transfer, USSD, and the IWSS wallet, and to process payouts to organizers.</li>
                  <li><strong>Customer support:</strong> To respond to enquiries and resolve disputes via in-app chat (Tawk.to) and email.</li>
                  <li><strong>Marketing communications:</strong> To send promotional emails and push notifications about new events and platform updates — with your consent, and with the ability to opt out at any time.</li>
                  <li><strong>Platform security & fraud prevention:</strong> To detect and prevent fraudulent transactions, spam, and abuse.</li>
                  <li><strong>Analytics & improvement:</strong> To understand how the platform is used, identify bugs, and improve features and performance.</li>
                  <li><strong>Legal compliance:</strong> To fulfil obligations under Nigerian law and respond to lawful requests from regulatory or law enforcement authorities.</li>
                </ul>
                <InfoCard type="note">
                  We do not sell your personal data. We do not use your data to serve
                  third-party advertisements on the Spotix Event platform.
                </InfoCard>
              </PolicySection>

              {/* 05 */}
              <PolicySection id="iwss" number={5} Icon={Wallet} title="IWSS — Integrated Wallet Settlement System" tinted>
                <p>
                  The <strong>Spotix Integrated Wallet Settlement System (IWSS)</strong> is a
                  financial feature built into the Spotix platform. Users — primarily organizers
                  — fund a digital wallet that can be used:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Within Spotix Event</strong> — for ticketing fees, promotional features, or platform services.</li>
                  <li><strong>Within third-party applications</strong> that integrate with the IWSS API — enabling seamless settlement outside the Spotix ecosystem.</li>
                </ul>
                <p>To operate IWSS, we collect and process the following financial data:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Bank account details for wallet funding and withdrawal</li>
                  <li>Transaction history (amounts, dates, references)</li>
                  <li>Wallet balance and movement records</li>
                </ul>
                <InfoCard type="warning">
                  When your IWSS wallet is used within a third-party application, that
                  application may receive transaction metadata (such as amounts and reference IDs)
                  necessary to complete the settlement. Spotix is not responsible for how
                  third-party applications handle that data — please review their privacy policies
                  before use.
                </InfoCard>
                <p>
                  All IWSS financial data is processed in compliance with Central Bank of Nigeria
                  (CBN) guidelines and applicable Nigerian financial regulations. Transaction
                  records are retained for a minimum of <strong>6 years</strong> in line with
                  statutory requirements.
                </p>
                <InfoCard type="important">
                  We do not store your full card or bank credentials on our servers. Sensitive
                  financial data is tokenised and held exclusively by licensed payment processors
                  certified to PCI-DSS standards.
                </InfoCard>
              </PolicySection>

              {/* 06 */}
              <PolicySection id="sharing-data" number={6} Icon={Handshake} title="Sharing Your Data">
                <p>
                  We share your personal data only in the specific circumstances below. We do
                  not sell, rent, or trade your data.
                </p>
                <ul className="list-disc pl-5 space-y-3">
                  <li>
                    <strong>Payment processors (Paystack / Flutterwave):</strong> We share
                    necessary payment data with our licensed payment partners to process card
                    payments, bank transfers, and USSD transactions.
                  </li>
                  <li>
                    <strong>Event organizers:</strong> When an attendee purchases a ticket, the
                    event organizer receives the attendee's <strong>name, email address, and phone
                    number</strong> through their organizer dashboard for the purpose of managing
                    attendance and event operations only.
                  </li>
                  <li>
                    <strong>Business partners and affiliates:</strong> We may share certain data
                    with trusted business partners and affiliates as part of our commercial
                    operations. Where this occurs, we ensure appropriate contractual safeguards
                    are in place. You have the right to opt out — see Section 11.
                  </li>
                  <li>
                    <strong>Service providers:</strong> We engage third-party vendors for cloud
                    hosting (AWS/GCP/Azure), analytics, crash reporting (Sentry), live chat
                    (Tawk.to), and push notifications. These vendors act as data processors under
                    our instruction and are contractually bound to data protection obligations.
                  </li>
                  <li>
                    <strong>IWSS API partners:</strong> Where your wallet is used within a
                    third-party application integrating with the IWSS API, transactional data
                    necessary for settlement may be shared with that application. See Section 5.
                  </li>
                  <li>
                    <strong>Legal & regulatory authorities:</strong> We may disclose data to
                    courts, regulators, or law enforcement in Nigeria or other jurisdictions where
                    required by applicable law or court order.
                  </li>
                  <li>
                    <strong>Business transfers:</strong> In the event of a merger, acquisition, or
                    sale of assets, your data may be transferred to the successor entity. You will
                    be notified via email in advance.
                  </li>
                </ul>
                <InfoCard type="warning">
                  All third parties who receive your personal data are contractually obligated to
                  handle it in accordance with the NDPA 2023, the NDPR, and this Privacy Policy.
                  We do not permit third parties to use your data for their own independent
                  marketing purposes.
                </InfoCard>
              </PolicySection>

              {/* 07 */}
              <PolicySection id="organizer-access" number={7} Icon={Users} title="Organizer Access to Attendee Data">
                <p>
                  Event organizers on Spotix Event have access to the following attendee data
                  for events they have created and published:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Attendee full name</li>
                  <li>Attendee email address</li>
                  <li>Attendee phone number</li>
                  <li>Ticket type and booking reference</li>
                  <li>Check-in status</li>
                </ul>
                <InfoCard type="warning">
                  By accepting the Spotix Event <strong>Organizer Terms of Service</strong>,
                  organizers agree to use attendee data strictly for the purpose of managing their
                  event. Organizers are <strong>prohibited</strong> from using attendee data for
                  unsolicited marketing, selling it to third parties, or sharing it beyond their
                  internal event operations team.
                </InfoCard>
                <p>
                  Spotix Technologies is not responsible for an organizer's misuse of attendee
                  data. If you believe an organizer has misused your data, please contact us
                  immediately at{" "}
                  <a href="mailto:support@spotix.com.ng" className="text-[#6b2fa5] underline underline-offset-2">
                    support@spotix.com.ng
                  </a>.
                </p>
              </PolicySection>

              {/* 08 */}
              <PolicySection id="cookies-tracking" number={8} Icon={Cookie} title="Cookies & Tracking">
                <p>
                  Spotix Event uses cookies and similar technologies (such as local storage and
                  session tokens) to operate the platform and improve your experience.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Essential / session cookies:</strong> Required for core functionality
                    such as keeping you logged in and processing secure transactions. These cannot
                    be disabled without breaking the platform.
                  </li>
                  <li>
                    <strong>Analytics cookies:</strong> Used to understand how users navigate the
                    platform — which events are viewed, how long sessions last, and where users
                    drop off. This data is aggregated and used solely to improve platform
                    performance.
                  </li>
                  <li>
                    <strong>Push notification tokens:</strong> If you opt in to push
                    notifications, we store a device token to deliver event alerts and platform
                    updates to you.
                  </li>
                </ul>
                <p>
                  You can manage non-essential cookies through your browser settings. Disabling
                  certain cookies may affect the functionality of Spotix Event. You may withdraw
                  consent to push notifications at any time through your device or browser
                  settings.
                </p>
              </PolicySection>

              {/* 09 */}
              <PolicySection id="third-party-tools" number={9} Icon={Wrench} title="Third-Party Tools We Use">
                <p>
                  We use the following third-party tools to operate and improve the Spotix Event
                  platform. Each may collect or process your personal data as part of its
                  operation:
                </p>
                <ul className="list-disc pl-5 space-y-3">
                  <li>
                    <strong>Sentry (Crash & Error Reporting):</strong> Automatically captures
                    technical errors and crash logs. Sentry may collect device data, browser
                    information, and anonymised user identifiers.
                  </li>
                  <li>
                    <strong>Tawk.to (Live Chat & In-App Messaging):</strong> Powers our in-app
                    customer support chat. When you initiate a chat, Tawk.to collects your name,
                    email, IP address, browser type, and the content of your conversation.
                  </li>
                  <li>
                    <strong>Push Notification Provider:</strong> Delivers alerts and updates to
                    your browser or device, requiring a notification token linked to your device.
                    You can opt out at any time in your account or device settings.
                  </li>
                  <li>
                    <strong>Cloud Infrastructure (AWS / GCP / Azure):</strong> All data is hosted
                    on enterprise-grade cloud infrastructure with encryption at rest and strict
                    access controls.
                  </li>
                  <li>
                    <strong>Payment Processors (Paystack / Flutterwave):</strong> Handle all
                    card, bank transfer, and USSD payment transactions. These providers are
                    PCI-DSS certified and maintain independent privacy policies.
                  </li>
                </ul>
                <InfoCard type="note">
                  We encourage you to review the privacy policies of these third-party tools.
                  Spotix Technologies is not responsible for data practices of external services,
                  though we carefully vet all vendors before engagement.
                </InfoCard>
              </PolicySection>

              {/* 10 */}
              <PolicySection id="data-retention" number={10} Icon={Archive} title="Data Retention">
                <p>
                  We retain personal data only for as long as necessary for the purpose it was
                  collected, or as required by Nigerian law:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Account data:</strong> Retained for the lifetime of your account, plus up to <strong>12 months</strong> after deletion for dispute resolution.</li>
                  <li><strong>Transaction & financial records (including IWSS):</strong> Retained for a minimum of <strong>6 years</strong> under Nigerian financial and tax regulations.</li>
                  <li><strong>Event data:</strong> Retained for <strong>3 years</strong> post-event for audit and dispute purposes.</li>
                  <li><strong>Marketing data:</strong> Retained until you unsubscribe or withdraw consent.</li>
                  <li><strong>Support conversations (Tawk.to):</strong> Retained for up to <strong>2 years</strong> after the last interaction.</li>
                  <li><strong>Analytics and usage data:</strong> Aggregated and anonymised after <strong>26 months</strong>.</li>
                </ul>
                <p>
                  When data is no longer required, we securely delete or irreversibly anonymise
                  it so that it can no longer be linked back to you.
                </p>
              </PolicySection>

              {/* 11 */}
              <PolicySection id="your-rights" number={11} Icon={Scale} title="Your Rights" tinted>
                <p>
                  Under the <strong>Nigeria Data Protection Act (NDPA) 2023</strong> and the
                  NDPR, you have the following rights regarding your personal data — applicable to
                  both organizers and attendees:
                </p>
                <ul className="list-disc pl-5 space-y-3">
                  <li><strong>Right to access:</strong> Request a copy of all personal data we hold about you.</li>
                  <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data. Most details can be updated directly in your account settings.</li>
                  <li><strong>Right to erasure:</strong> Request deletion of your personal data, subject to legal retention obligations.</li>
                  <li><strong>Right to data portability:</strong> Request a copy of your data in a structured, machine-readable format (e.g. JSON or CSV).</li>
                  <li><strong>Right to opt out of marketing:</strong> Unsubscribe from promotional emails via the unsubscribe link in any email, or disable push notifications in your account or device settings.</li>
                  <li><strong>Right to object:</strong> Object to processing of your data for certain purposes, including profiling and data sharing with partners and affiliates.</li>
                  <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data while a concern is being investigated.</li>
                  <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
                </ul>
                <InfoCard type="right">
                  To exercise any of these rights, email us at{" "}
                  <a href="mailto:support@spotix.com.ng" className="font-semibold underline underline-offset-2">
                    support@spotix.com.ng
                  </a>. We will acknowledge your request within <strong>5 business days</strong>{" "}
                  and respond fully within <strong>30 days</strong>. We may ask you to verify
                  your identity before processing the request.
                </InfoCard>
                <p>
                  If you are unsatisfied with our response, you may lodge a complaint with the{" "}
                  <strong>Nigeria Data Protection Commission (NDPC)</strong>.
                </p>
              </PolicySection>

              {/* 12 */}
              <PolicySection id="data-security" number={12} Icon={ShieldCheck} title="Data Security">
                <p>
                  We implement industry-standard technical and organisational measures to protect
                  your personal data against unauthorised access, loss, alteration, or disclosure:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>All data in transit is encrypted using <strong>TLS/HTTPS</strong>.</li>
                  <li>Sensitive data at rest is encrypted using AES-256 or equivalent standards.</li>
                  <li>Access to personal data is restricted to authorised Spotix staff on a strict need-to-know basis.</li>
                  <li>All infrastructure is hosted on enterprise-grade cloud platforms (AWS / GCP / Azure) with built-in redundancy and security controls.</li>
                  <li>We conduct regular security assessments and vulnerability testing.</li>
                  <li>Payment data is handled exclusively by PCI-DSS certified processors — we do not store raw card or bank credentials.</li>
                </ul>
                <InfoCard type="note">
                  Despite our measures, no system is completely immune to breach. In the event of
                  a data breach that poses a material risk to your rights, we will notify you and
                  the <strong>Nigeria Data Protection Commission (NDPC)</strong> within the
                  timeframes required by law.
                </InfoCard>
                <p>
                  You are responsible for keeping your Spotix account password secure. If you
                  suspect unauthorised access to your account, contact us immediately at{" "}
                  <a href="mailto:support@spotix.com.ng" className="text-[#6b2fa5] underline underline-offset-2">
                    support@spotix.com.ng
                  </a>.
                </p>
              </PolicySection>

              {/* 13 */}
              <PolicySection id="children" number={13} Icon={ShieldOff} title="Age Policy — 18+ Only">
                <p>
                  Spotix Event is intended exclusively for users who are{" "}
                  <strong>18 years of age or older</strong>. We do not knowingly collect personal
                  data from anyone under the age of 18.
                </p>
                <InfoCard type="important">
                  If you are under 18, you are not permitted to create an account, register as an
                  organizer, or purchase tickets on Spotix Event. If we discover that a user under
                  the age of 18 has provided us with personal data, we will delete that data
                  immediately without notice.
                </InfoCard>
                <p>
                  If you believe a minor has registered on our platform or provided personal data,
                  please contact us at{" "}
                  <a href="mailto:support@spotix.com.ng" className="text-[#6b2fa5] underline underline-offset-2">
                    support@spotix.com.ng
                  </a>{" "}
                  and we will take prompt action.
                </p>
              </PolicySection>

              {/* 14 */}
              <PolicySection id="policy-changes" number={14} Icon={FileEdit} title="Changes to This Policy">
                <p>
                  We may update this Privacy Policy periodically to reflect changes in our
                  services, business practices, or legal obligations. When we make material
                  changes, we will:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Update the effective date at the top of this page.</li>
                  <li>Notify registered organizers via email and/or a prominent in-app notification at least <strong>14 days</strong> before significant changes take effect.</li>
                  <li>For minor clarifications, we may update the policy without separate notice, so we encourage you to review it periodically.</li>
                </ul>
                <p>
                  Your continued use of Spotix Event after changes are published and the notice
                  period has elapsed constitutes your acceptance of the updated Policy.
                </p>
              </PolicySection>

              {/* 15 */}
              <PolicySection id="contact" number={15} Icon={Mail} title="Contact Us" tinted>
                <p>
                  If you have any questions, concerns, or requests relating to this Privacy Policy
                  or the way we handle your personal data, please reach out to us:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Company:</strong> Spotix Technologies</li>
                  <li><strong>Platform:</strong> Spotix Event</li>
                  <li><strong>Registered in:</strong> Federal Republic of Nigeria</li>
                  <li>
                    <strong>Privacy & support email:</strong>{" "}
                    <a href="mailto:support@spotix.com.ng" className="text-[#6b2fa5] underline underline-offset-2 font-medium">
                      support@spotix.com.ng
                    </a>
                  </li>
                </ul>
                <InfoCard type="right">
                  We aim to acknowledge all privacy-related enquiries within{" "}
                  <strong>5 business days</strong> and resolve them within{" "}
                  <strong>30 days</strong>, in accordance with our obligations under the NDPA
                  2023. For complaints that remain unresolved, you may escalate to the{" "}
                  <strong>Nigeria Data Protection Commission (NDPC)</strong> at{" "}
                  <a
                    href="https://ndpc.gov.ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 font-semibold"
                  >
                    ndpc.gov.ng
                  </a>.
                </InfoCard>
              </PolicySection>

            </article>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}