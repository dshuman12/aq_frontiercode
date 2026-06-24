"use server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EmailAgentClient from "./client";

const PASSWORD_COOKIE = "demo_email_agent_auth";
const DEMO_PASSWORD = process.env.DEMO_EMAIL_AGENT_PASSWORD;

async function setPassword(formData: FormData) {
  "use server";
  const value = formData.get("password")?.toString() || "";

  if (!DEMO_PASSWORD) {
    return { success: false, error: "DEMO_EMAIL_AGENT_PASSWORD is not set" };
  }

  if (value !== DEMO_PASSWORD) {
    return { success: false, error: "Invalid password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(PASSWORD_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/demo/email-agent");
  return { success: true };
}

async function clearPassword() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(PASSWORD_COOKIE);
  revalidatePath("/demo/email-agent");
  redirect("/demo/email-agent");
}

export default async function EmailAgentDemoPage() {
  const cookieStore = await cookies();
  const savedPassword = cookieStore.get(PASSWORD_COOKIE)?.value;
  const isAuthorized = !!DEMO_PASSWORD && savedPassword === DEMO_PASSWORD;

  if (!DEMO_PASSWORD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Demo password not configured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-700">
            <p>
              Set <code>DEMO_EMAIL_AGENT_PASSWORD</code> in the environment to
              enable this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Email Agent Demo Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={setPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Enter demo password"
                  required
                />
              </div>
              <Button variant="outline" type="submit" className="w-full">
                Enter Demo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <EmailAgentClient onSignOut={clearPassword} />;
}
