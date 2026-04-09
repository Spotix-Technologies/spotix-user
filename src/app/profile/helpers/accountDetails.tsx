"use client"

import { useState, useEffect, useRef } from "react"
import { AlertCircle, CheckCircle, Loader2, Check, Building2 } from "lucide-react"

interface AccountDetailsProps {
  accountName: string
  accountNumber: string
  bankName: string
  onAccountNameChange: (value: string) => void
  onAccountNumberChange: (value: string) => void
  onBankNameChange: (value: string) => void
}

const banks = [
  "Access Bank",
  "Citibank",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "Globus Bank",
  "Guaranty Trust Bank",
  "Heritage Bank",
  "Jaiz Bank",
  "Keystone Bank",
  "Kuda Bank",
  "Lotus Bank",
  "Moniepoint MFB",
  "Opay",
  "Palmpay",
  "Parallex Bank",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Taj Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank For Africa",
  "Unity Bank",
  "VFD Microfinance Bank",
  "Wema Bank",
  "Zenith Bank",
]

export default function AccountDetails({
  accountName,
  accountNumber,
  bankName,
  onAccountNameChange,
  onAccountNumberChange,
  onBankNameChange,
}: AccountDetailsProps) {
  // Local input state — decoupled from the confirmed bankName prop
  const [bankInput, setBankInput] = useState(bankName)
  const [filteredBanks, setFilteredBanks] = useState<string[]>([])
  const [showBankSuggestions, setShowBankSuggestions] = useState(false)

  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifiedName, setVerifiedName] = useState(accountName || "")
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verified" | "failed">(
    accountName ? "verified" : "idle"
  )

  const didAutoVerify = useRef(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Keep local input in sync if parent resets bankName externally
  useEffect(() => {
    setBankInput(bankName)
  }, [bankName])

  // ── Bank search ──────────────────────────────────────────────────────────────

  const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBankInput(value)               // ← Fix 1: actually update the displayed value

    if (value.trim() === "") {
      setFilteredBanks([])
      setShowBankSuggestions(false)
      // User cleared the field — also clear the confirmed bank
      onBankNameChange("")
    } else {
      const filtered = banks.filter((b) =>
        b.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredBanks(filtered)
      setShowBankSuggestions(filtered.length > 0)
    }

    // Any change to bank invalidates previous verification
    resetVerification()
  }

  const selectBank = (bank: string) => {
    setBankInput(bank)
    onBankNameChange(bank)
    setShowBankSuggestions(false)
    resetVerification()
  }

  // ── Verification helpers ─────────────────────────────────────────────────────

  const resetVerification = () => {
    setVerifyStatus("idle")
    setVerifiedName("")
    setVerifyError(null)
    onAccountNameChange("")
    didAutoVerify.current = false
  }

  const verifyAccount = async (accNum = accountNumber, bank = bankName) => {
    if (!accNum || !bank) {
      setVerifyError("Please select a bank and enter your account number first.")
      return
    }
    if (accNum.length !== 10) {
      setVerifyError("Account number must be exactly 10 digits.")
      return
    }

    setVerifyLoading(true)
    setVerifyError(null)

    try {
      // ── Fix 2: use cookie-based auth (spotix_u_at) not Firebase idToken ──
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || ""
      const res = await fetch(
        `${BACKEND_URL}/v1/verify?accountNumber=${accNum}&bankName=${encodeURIComponent(bank)}`,
        {
          method: "GET",
          credentials: "include",   // sends the spotix_u_at httpOnly cookie
        }
      )

      const data = await res.json()

      if (res.ok && data.status === true) {
        setVerifiedName(data.account_name)
        setVerifyStatus("verified")
        onAccountNameChange(data.account_name)
        setVerifyError(null)
      } else {
        setVerifyError(data.message || "Verification failed. Please check your details.")
        setVerifyStatus("failed")
        onAccountNameChange("")
      }
    } catch {
      setVerifyError("Network error while verifying. Please try again.")
      setVerifyStatus("failed")
      onAccountNameChange("")
    } finally {
      setVerifyLoading(false)
    }
  }

  // ── Auto-verify once both fields are ready ───────────────────────────────────
  // Fix 3: watch accountNumber AND bankName; gate with a ref so it fires exactly once
  // per complete pair, not on every keystroke.
  useEffect(() => {
    if (
      accountNumber.length === 10 &&
      bankName.trim() !== "" &&
      verifyStatus === "idle" &&
      !didAutoVerify.current
    ) {
      didAutoVerify.current = true
      const timer = setTimeout(() => verifyAccount(accountNumber, bankName), 600)
      return () => clearTimeout(timer)
    }
  }, [accountNumber, bankName, verifyStatus])

  // ── Keyboard navigation & outside-click for suggestions ─────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowBankSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-md p-6 lg:p-8">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-6">Bank Account Details</h2>

      <div className="space-y-5">

        {/* Bank name with autocomplete */}
        <div className="relative" ref={suggestionsRef}>
          <label htmlFor="bankName" className="block text-sm font-semibold text-gray-700 mb-2">
            Bank Name
          </label>
          <div className="relative">
            <Building2
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              id="bankName"
              value={bankInput}                    // ← Fix 1: bound to local state
              onChange={handleBankInputChange}
              onFocus={() => {
                if (bankInput.trim()) {
                  const filtered = banks.filter((b) =>
                    b.toLowerCase().includes(bankInput.toLowerCase())
                  )
                  setFilteredBanks(filtered)
                  setShowBankSuggestions(filtered.length > 0)
                }
              }}
              placeholder="Search for your bank"
              autoComplete="off"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
            />
          </div>

          {showBankSuggestions && filteredBanks.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredBanks.map((bank) => (
                <button
                  key={bank}
                  type="button"
                  onMouseDown={(e) => {
                    // Use onMouseDown + preventDefault so the input's onBlur
                    // doesn't fire before the click registers
                    e.preventDefault()
                    selectBank(bank)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors text-gray-900 text-sm font-medium flex items-center justify-between group"
                >
                  <span>{bank}</span>
                  {bankName === bank && (
                    <Check size={16} className="text-purple-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account number */}
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-semibold text-gray-700 mb-2">
            Account Number
          </label>
          <input
            type="text"
            id="accountNumber"
            value={accountNumber}
            inputMode="numeric"
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "")
              if (value.length <= 10) {
                onAccountNumberChange(value)
                // Reset verification whenever the number changes
                if (value !== accountNumber) resetVerification()
              }
            }}
            placeholder="Enter your 10-digit account number"
            maxLength={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 font-mono tracking-widest"
          />
          {/* Digit progress hint */}
          {accountNumber.length > 0 && accountNumber.length < 10 && (
            <p className="text-xs text-gray-400 mt-1">
              {accountNumber.length}/10 digits
            </p>
          )}
        </div>

        {/* Manual verify button — shown when both fields are ready but not yet verified */}
        {accountNumber.length === 10 && bankName && verifyStatus === "idle" && !verifyLoading && (
          <button
            type="button"
            onClick={() => verifyAccount()}
            className="w-full px-4 py-2.5 bg-[#6b2fa5] text-white rounded-lg hover:bg-[#5a2789] transition-colors font-semibold flex items-center justify-center gap-2"
          >
            Verify Account
          </button>
        )}

        {/* Loading state */}
        {verifyLoading && (
          <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600 flex-shrink-0" />
            <p className="text-sm text-purple-700 font-medium">Verifying account details…</p>
          </div>
        )}

        {/* Error */}
        {verifyError && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm text-red-700">{verifyError}</p>
              {verifyStatus === "failed" && accountNumber.length === 10 && bankName && (
                <button
                  type="button"
                  onClick={() => { resetVerification(); setTimeout(() => verifyAccount(), 50) }}
                  className="text-xs text-red-600 underline mt-1 hover:text-red-800"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success */}
        {verifyStatus === "verified" && verifiedName && (
          <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-green-700">Account Verified</p>
              <p className="text-sm text-green-600 mt-0.5">{verifiedName}</p>
            </div>
          </div>
        )}

        {/* Account name (read-only, auto-filled) */}
        <div>
          <label htmlFor="accountName" className="block text-sm font-semibold text-gray-700 mb-2">
            Account Name
          </label>
          <input
            type="text"
            id="accountName"
            value={accountName}
            readOnly
            placeholder="Auto-filled after verification"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-900 placeholder-gray-400"
          />
          <p className="text-xs text-gray-500 mt-1">
            Automatically populated after successful verification
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Note:</span> This account will be used for receiving
            payouts from ticket sales. Please ensure the details are correct before saving.
          </p>
        </div>
      </div>
    </div>
  )
}