"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function SignOut() {
  const router = useRouter()

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut({ 
          redirect: false,
          callbackUrl: "/auth/signin" 
        })
        // Redirect after sign out
        setTimeout(() => {
          router.push("/auth/signin")
        }, 2000)
      } catch (error) {
        console.error("Sign out error:", error)
        router.push("/auth/signin")
      }
    }

    handleSignOut()
  }, [router])

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
          <CardTitle className="text-2xl text-center">Signing out</CardTitle>
          <CardDescription className="text-center">
            Please wait while we sign you out...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    </div>
  )
}
