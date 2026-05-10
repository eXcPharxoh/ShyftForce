import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LandingPage } from "@/components/marketing/landing-page";

export default async function Home() {
  const u = await getSessionUser();
  if (u) redirect("/dashboard");
  return <LandingPage />;
}
