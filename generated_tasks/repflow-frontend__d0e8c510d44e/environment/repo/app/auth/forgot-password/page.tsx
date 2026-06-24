"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, CheckCircle, Eye, EyeOff, Loader2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

type PasswordRequirements = {
  minLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export default function ForgotPassword() {
  const [step, setStep] = useState<"request" | "reset">("request")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  })
  const router = useRouter()

  // Validate password requirements
  const validatePasswordRequirements = (password: string): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Password reset code sent! Please check your email.")
        setTimeout(() => {
          setStep("reset")
          setSuccess("")
        }, 1500)
      } else {
        setError(data.error || "Failed to send reset code. Please try again.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Request reset error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("New code sent! Please check your email.")
      } else {
        setError(data.error || "Failed to resend code. Please try again.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Resend code error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    // Validate password requirements
    const requirements = validatePasswordRequirements(newPassword)
    if (
      !requirements.minLength ||
      !requirements.hasUppercase ||
      !requirements.hasNumber ||
      !requirements.hasSpecialChar
    ) {
      setError("Password does not meet all requirements")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Password reset successfully! Redirecting to sign in...")
        setTimeout(() => {
          router.push("/auth/signin")
        }, 2000)
      } else {
        setError(data.error || "Failed to reset password. Please try again.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Reset password error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = (value: string) => {
    setNewPassword(value)
    setPasswordRequirements(validatePasswordRequirements(value))
  }

  if (step === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Image
                src="/repflow-logo.png"
                alt="Repflow"
                width={120}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
            <CardDescription className="text-center">
              Enter the verification code sent to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError("")
                  }}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      handlePasswordChange(e.target.value)
                      setError("")
                    }}
                    className="pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {newPassword && (
                  <div className="text-xs space-y-1 mt-2">
                    <p className="font-medium text-gray-700">Password Requirements:</p>
                    <div className="space-y-1">
                      <div
                        className={`flex items-center gap-1 ${
                          passwordRequirements.minLength ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {passwordRequirements.minLength ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span>At least 8 characters</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordRequirements.hasUppercase ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {passwordRequirements.hasUppercase ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span>One uppercase letter</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordRequirements.hasNumber ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {passwordRequirements.hasNumber ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span>One number</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordRequirements.hasSpecialChar ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {passwordRequirements.hasSpecialChar ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span>One special character</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError("")
                    }}
                    className="pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>

            <div className="text-center text-sm space-y-2">
              <div>
                <span className="text-gray-600">Didn&apos;t receive the code? </span>
                <button
                  onClick={handleResendCode}
                  className="text-sage-primary hover:text-sage-primary/80 font-medium"
                  disabled={loading}
                >
                  Resend code
                </button>
              </div>
              <div>
                <button
                  onClick={() => setStep("request")}
                  className="text-sage-primary hover:text-sage-primary/80 font-medium"
                  disabled={loading}
                >
                  ← Change email
                </button>
              </div>
              <div>
                <Link
                  href="/auth/signin"
                  className="text-sage-primary hover:text-sage-primary/80 font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Image
              src="/repflow-logo.png"
              alt="Repflow"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-center">Forgot Your Password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a code to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-sage-primary hover:bg-sage-primary/90 text-figma-forest-dark"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Code
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-600">Remember your password? </span>
            <Link
              href="/auth/signin"
              className="text-sage-primary hover:text-sage-primary/80 font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
