import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagerOrAdmin } from "@/lib/session";
import { exchangeFinchCode, FinchAPI } from "@/lib/finch";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const u = await requireManagerOrAdmin();
  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = (process.env.NEXTAUTH_URL ?? url.origin).replace(/\/$/, "");

  if (error) return NextResponse.redirect(`${origin}/settings/integrations?error=${encodeURIComponent(error)}`);
  if (!code) return NextResponse.redirect(`${origin}/settings/integrations?error=missing_code`);
  if (state && state !== u.organizationId) {
    return NextResponse.redirect(`${origin}/settings/integrations?error=state_mismatch`);
  }

  try {
    const tok = await exchangeFinchCode(code);
    const company = await FinchAPI.company(tok.access_token);
    await prisma.organization.update({
      where: { id: u.organizationId },
      data: {
        finchAccessToken: tok.access_token,
        finchProviderId:  tok.payroll_provider_id,
        finchCompanyId:   company.id,
        finchConnectedAt: new Date(),
      },
    });
    await audit({
      organizationId: u.organizationId, actorId: u.id,
      action: "org.update", entityType: "Finch",
      metadata: { provider: tok.payroll_provider_id, companyName: company.legal_name },
    });
    return NextResponse.redirect(`${origin}/settings/integrations?connected=1`);
  } catch (e: any) {
    return NextResponse.redirect(`${origin}/settings/integrations?error=${encodeURIComponent(e.message ?? "exchange_failed")}`);
  }
}
