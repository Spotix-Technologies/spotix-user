"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/app/lib/firebase"
import type { SessionUser } from "@/app/lib/auth-client-user"
import { signOut } from "firebase/auth"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { Loader2 } from "lucide-react"
import Link from "next/link"

// Import helper components
import UserImage from "./helpers/userImage"
import UserDetail from "./helpers/userDetail"
import UserId from "./helpers/userId"
import AuthChange from "./helpers/authChange"
import AccountDetails from "./helpers/accountDetails"
import Referrals from "./helpers/referrals"
import TelegramBot from "./helpers/telegramBot"

interface UserProfile {
  uid: string
  fullName: string
  username: string
  email: string
  profilePicture: string
  accountName: string
  accountNumber: string
  bankName: string
  referralCode: string
  isBooker: boolean
  referredBy?: string
  telegramConnected?: boolean
  telegramUsername?: string
  telegramChatId?: string
}

interface ConfirmDialogProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Confirmation Required</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-[#6b2fa5] hover:bg-[#5a2789] rounded-lg transition-colors"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  )
}

const Profile = ({ user }: { user?: SessionUser }) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [uploadProvider, setUploadProvider] = useState<string | null>(null)
  const [referralListed, setReferralListed] = useState(false)
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        auth.onAuthStateChanged(async (authUser) => {
          if (authUser) {
            await fetchUserData(authUser.uid)
          } else {
            router.push("/auth/login")
          }
        })
      } catch (error) {
        console.error("Error checking auth:", error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchUserData = async (uid: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`/api/v1/user/${uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setReferralListed(data.referralListed)
        if (data.user.referredBy) {
          setReferrerUsername(data.user.referredBy)
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      alert("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!user) return

    setShowDialog(true)
  }

  const confirmUpdate = async () => {
    setShowDialog(false)
    
    if (!user) {
      alert("User data not available")
      return
    }
    
    setSaving(true)

    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`/api/v1/user/${user.uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fullName: user.fullName,
          username: user.username,
          accountName: user.accountName,
          accountNumber: user.accountNumber,
          bankName: user.bankName,
          profilePicture: user.profilePicture,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert("Profile updated successfully!")
      } else {
        alert(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("An error occurred while updating profile")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/auth/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const canSubmitForm = () => {
    if (!user) return false
    return user.fullName.trim() !== "" && user.username.trim() !== ""
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-gray-600 font-medium mb-4">Failed to load profile</p>
          <button
            onClick={() => router.push("/home")}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // TypeScript now knows user is not null after this point
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <UserHeader />
      <ConfirmDialog
        isOpen={showDialog}
        message="Are you sure you want to update your profile?"
        onConfirm={confirmUpdate}
        onCancel={() => setShowDialog(false)}
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Two Column Layout on Large Screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <UserImage
                currentImage={user.profilePicture}
                onImageChange={(newImageUrl) => setUser({ ...user, profilePicture: newImageUrl })}
                uploadProvider={uploadProvider}
                setUploadProvider={setUploadProvider}
              />

              <UserDetail
                fullName={user.fullName}
                username={user.username}
                onFullNameChange={(value) => setUser({ ...user, fullName: value })}
                onUsernameChange={(value) => setUser({ ...user, username: value })}
              />

              <UserId userId={user.uid} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <AuthChange />

              <AccountDetails
                accountName={user.accountName}
                accountNumber={user.accountNumber}
                bankName={user.bankName}
                onAccountNameChange={(value) => setUser({ ...user, accountName: value })}
                onAccountNumberChange={(value) => setUser({ ...user, accountNumber: value })}
                onBankNameChange={(value) => setUser({ ...user, bankName: value })}
              />
            </div>
          </div>

          {/* Full Width Sections */}
          <Referrals
            referralCode={user.referralCode}
            referralListed={referralListed}
            referrerUsername={referrerUsername}
            userId={user.uid}
            onReferralCodeGenerated={(code) => setUser({ ...user, referralCode: code })}
          />

          <TelegramBot
            telegramConnected={user.telegramConnected || false}
            telegramUsername={user.telegramUsername || null}
            userId={user.uid}
            onConnectionStatusChange={(connected, username) => {
              setUser({
                ...user,
                telegramConnected: connected,
                telegramUsername: username || "",
              })
            }}
          />

          {/* Booker Status Section */}
          {!user.isBooker && (
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-8 text-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                Ready to Create Events?
              </h2>
              <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
                Become a booker and start hosting amazing events on Spotix
              </p>
              <Link href="/booker-confirm">
                <button
                  type="button"
                  className="px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-bold text-lg shadow-lg"
                >
                  Become a Booker
                </button>
              </Link>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="submit"
              disabled={saving || !canSubmitForm()}
              className="w-full px-6 py-4 bg-[#6b2fa5] text-white rounded-lg hover:bg-[#5a2789] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-lg shadow-lg"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg shadow-lg"
            >
              Logout
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  )
}

export default Profile