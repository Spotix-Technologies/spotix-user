"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { auth, db } from "@/app/lib/firebase"
import type { SessionUser } from "@/app/lib/auth-client-user"
import { doc, getDoc, collection, setDoc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore"
import { ArrowRight, Users, Wallet, AlertCircle, CheckCircle, TrendingUp, ArrowDown, Copy, Check } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

interface UserData {
  uid: string
  username: string
  email: string
  referralCode: string
}

interface ReferredUser {
  username: string
  joinedAt: any
}

interface ReferralData {
  uid: string
  username: string
  email: string
  refGain: number
  totalWithdrawn: number
  createdAt: any
  referredUsers: ReferredUser[]
}

const formatJoinDate = (joinedAt: any): string => {
  try {
    if (!joinedAt) return "Recently"
    if (joinedAt && typeof joinedAt.toDate === "function") {
      return new Date(joinedAt.toDate()).toLocaleDateString()
    }
    if (typeof joinedAt === "string") {
      return new Date(joinedAt).toLocaleDateString()
    }
    return new Date(joinedAt).toLocaleDateString()
  } catch (error) {
    console.error("Error formatting join date:", error)
    return "Recently"
  }
}

export default function ReferralsClient({ user }: { user?: SessionUser }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [referralListed, setReferralListed] = useState(false)
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [refGain, setRefGain] = useState(0)
  const [totalWithdrawn, setTotalWithdrawn] = useState(0)
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        auth.onAuthStateChanged(async (authUser) => {
          if (authUser) {
            const userDocRef = doc(db, "users", authUser.uid)
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
              const data = userDoc.data()
              setUserData({
                uid: authUser.uid,
                username: data.username || "",
                email: data.email || "",
                referralCode: data.referralCode || "",
              })

              if (data.referralCode) {
                const referralDocRef = doc(db, "referrals", data.referralCode)
                const referralDoc = await getDoc(referralDocRef)
                setReferralListed(referralDoc.exists())

                if (referralDoc.exists()) {
                  const referralData = referralDoc.data() as ReferralData
                  setRefGain(referralData.refGain || 0)
                  setTotalWithdrawn(referralData.totalWithdrawn || 0)

                  if (referralData.referredUsers && referralData.referredUsers.length > 0) {
                    setReferredUsers(referralData.referredUsers)
                  }
                }
              }
            }
            setLoading(false)
          } else {
            router.push("/auth/login")
          }
        })
      } catch (error) {
        console.error("Error checking authentication:", error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleEnlistReferral = async () => {
    if (!userData || !userData.referralCode) return

    setLoading(true)
    try {
      await setDoc(doc(db, "referrals", userData.referralCode), {
        uid: userData.uid,
        username: userData.username,
        email: userData.email,
        refGain: 0,
        totalWithdrawn: 0,
        createdAt: serverTimestamp(),
        referredUsers: [],
      })

      setReferralListed(true)
      setMessage({
        text: "Your referral code has been successfully listed!",
        type: "success",
      })
    } catch (error) {
      console.error("Error enlisting referral code:", error)
      setMessage({
        text: "Failed to enlist your referral code. Please try again.",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!userData || refGain <= 0) return

    setWithdrawing(true)
    setMessage({ text: "", type: "" })

    try {
      const userDocRef = doc(db, "users", userData.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        throw new Error("User data not found")
      }

      const currentWalletBalance = userDoc.data().wallet || 0
      const newWalletBalance = currentWalletBalance + refGain

      await updateDoc(userDocRef, {
        wallet: newWalletBalance,
      })

      const referralDocRef = doc(db, "referrals", userData.referralCode)
      const newTotalWithdrawn = totalWithdrawn + refGain

      await updateDoc(referralDocRef, {
        refGain: 0,
        totalWithdrawn: newTotalWithdrawn,
        lastWithdrawalAt: serverTimestamp(),
        lastWithdrawalAmount: refGain,
      })

      const walletPayCollectionRef = collection(db, "users", userData.uid, "wallet-pay")
      await addDoc(walletPayCollectionRef, {
        transactionId: `ref-withdraw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        transactionDate: new Date().toLocaleDateString(),
        transactionTime: new Date().toLocaleTimeString(),
        transactionType: "Referral Payment",
        amount: refGain,
        tag: "credit",
        status: "completed",
        createdAt: serverTimestamp(),
        previousBalance: currentWalletBalance,
        newBalance: newWalletBalance,
        userEmail: userData.email,
        userFullName: userData.username,
        referralCode: userData.referralCode,
        totalReferrals: referredUsers.length,
      })

      setTotalWithdrawn(newTotalWithdrawn)
      const withdrawnAmount = refGain
      setRefGain(0)
      setWithdrawSuccess(true)
      setMessage({
        text: `Successfully withdrawn ₦${formatNumber(withdrawnAmount)} to your wallet!`,
        type: "success",
      })
    } catch (error) {
      console.error("Error withdrawing referral earnings:", error)
      setMessage({
        text: `Failed to withdraw: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const handleCopyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode)
      setCopied(true)
      setMessage({ text: "Referral code copied to clipboard!", type: "success" })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <UserHeader />
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Referrals</h1>
          <p className="text-blue-100 text-lg">Invite friends and earn rewards</p>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className="max-w-6xl mx-auto px-4 mt-6">
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            )}
            <p className="flex-1">{message.text}</p>
            <button
              onClick={() => setMessage({ text: "", type: "" })}
              className="text-lg font-semibold hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {!userData?.referralCode ? (
          // No Referral Code State
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8">
              <div className="flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Begin Your Referral Journey</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Create your referral key from your profile to start earning rewards!
                </p>
                <button
                  onClick={() => router.push("/profile")}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-fit"
                >
                  Go to Profile <ArrowRight size={18} />
                </button>
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/referral-illustration.svg"
                  alt="Referral Illustration"
                  width={300}
                  height={300}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        ) : !referralListed ? (
          // Not Listed State
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8">
              <div className="flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Hey, {userData.username}!</h2>
                <p className="text-gray-600 text-lg mb-4">
                  We can see you have a referral key but it isn't listed yet.
                </p>
                <p className="text-gray-600 text-lg mb-8">
                  Click the button below to list your referral key and start earning rewards!
                </p>
                <button
                  onClick={handleEnlistReferral}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all w-fit"
                >
                  {loading ? "Processing..." : "Enlist"}
                </button>
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/referral-list.svg"
                  alt="Referral Listing"
                  width={300}
                  height={300}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        ) : (
          // Dashboard State
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Available Earnings */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-gray-600 font-semibold">Available Earnings</h3>
                  <Wallet className="text-blue-600" size={24} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-4">₦{formatNumber(refGain)}</div>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || refGain <= 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {withdrawing ? "Processing..." : "Withdraw to Wallet"}
                </button>
              </div>

              {/* Total Withdrawn */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-gray-600 font-semibold">Total Withdrawn</h3>
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-4">₦{formatNumber(totalWithdrawn)}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {withdrawSuccess ? (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <span>Last withdrawal successful</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown size={16} />
                      <span>Lifetime withdrawals</span>
                    </>
                  )}
                </div>
              </div>

              {/* Total Earnings */}
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold">Total Earnings</h3>
                  <TrendingUp size={24} />
                </div>
                <div className="text-3xl font-bold mb-4">₦{formatNumber(totalWithdrawn + refGain)}</div>
                <div className="flex items-center gap-2 text-sm text-orange-100">
                  <Users size={16} />
                  <span>From {referredUsers.length} referrals</span>
                </div>
              </div>
            </div>

            {/* Referral Code Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Referral Code</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <code className="text-lg font-mono font-bold text-gray-900">{userData.referralCode}</code>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-gray-600">
                Share this code with friends. When they sign up using your code, you'll earn ₦200 per referral!
              </p>
            </div>

            {/* Referred Users Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Referred Users</h3>
                </div>
                <span className="bg-blue-100 text-blue-800 font-semibold py-1 px-3 rounded-full text-sm">
                  {referredUsers.length} users
                </span>
              </div>

              {referredUsers.length > 0 ? (
                <div className="space-y-3">
                  {referredUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.username}</p>
                          <p className="text-sm text-gray-600">
                            Joined: {user.joinedAt ? formatJoinDate(user.joinedAt) : "Recently"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+₦200</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">You haven't referred anyone yet. Share your code to start earning!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}