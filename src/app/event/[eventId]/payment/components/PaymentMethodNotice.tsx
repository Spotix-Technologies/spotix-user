// "use client"

// import { Loader2, XCircle } from "lucide-react"
// import { getPaymentMethodNotice, type PaymentMethodId } from "@/lib/paystack/payment-channels"

// interface PaymentMethodNoticeProps {
//   methodId: PaymentMethodId
//   amount: number
//   /** True once the message has been shown long enough and checkout is opening (unused for apple_pay). */
//   connecting: boolean
//   onChooseDifferent: () => void
// }

// /**
//  * Brief transitional screen shown right after a payment method is picked
//  * and right before the Paystack widget opens (or, for Apple Pay, a
//  * standing "not available yet" notice). Mirrors spotix-vote's
//  * PaymentMethodNotice, restyled for spotix-user.
//  */
// export default function PaymentMethodNotice({ methodId, amount, connecting, onChooseDifferent }: PaymentMethodNoticeProps) {
//   const message = getPaymentMethodNotice(methodId, amount)
//   const isAppleUnavailable = methodId === "apple_pay"

//   return (
//     <div className="flex flex-col items-center gap-4 py-6 text-center">
//       <div className="w-14 h-14 rounded-full flex items-center justify-center bg-purple-100">
//         {isAppleUnavailable ? (
//           <XCircle className="w-7 h-7 text-red-500" />
//         ) : (
//           <Loader2 className={`w-7 h-7 text-[#6b2fa5] ${connecting ? "animate-spin" : ""}`} />
//         )}
//       </div>

//       <p className="text-sm text-gray-700 max-w-xs">{message}</p>

//       {isAppleUnavailable && (
//         <button
//           type="button"
//           onClick={onChooseDifferent}
//           className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
//         >
//           Choose a different method
//         </button>
//       )}
//     </div>
//   )
// }
