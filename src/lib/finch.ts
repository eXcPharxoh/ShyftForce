// Finch unified payroll/HRIS API client
// Docs: https://developer.tryfinch.com/
//
// Finch supports ADP Workforce Now, ADP Run, Gusto, Paychex Flex, Rippling,
// Workday, QuickBooks, BambooHR, and 60+ more — all behind one API.
//
// Get your client id/secret at: https://dashboard.tryfinch.com/

const FINCH_BASE = "https://api.tryfinch.com";
const SANDBOX_BASE = "https://sandbox.tryfinch.com";

function base() {
  return process.env.FINCH_USE_SANDBOX === "true" ? SANDBOX_BASE : FINCH_BASE;
}

export type FinchProvider =
  | "adp_workforce_now" | "adp_run" | "gusto" | "paychex_flex" | "rippling"
  | "quickbooks_online" | "workday" | "bamboohr" | "square_payroll" | "wave"
  | "humi" | "namely" | "trinet" | "zenefits";

export type FinchWorker = {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  emails?: { data: string; type?: string; primary?: boolean }[];
  phone_numbers?: { data: string; type?: string }[];
  start_date?: string | null;
  is_active?: boolean;
  department?: { name: string } | null;
  location?: { line1?: string; city?: string; state?: string } | null;
  manager?: { id: string } | null;
};

export type FinchPayStatement = {
  individual_id: string;
  type?: string;
  payment_method?: string;
  total_hours?: number;
  gross_pay?: { amount: number; currency: string };
  net_pay?:   { amount: number; currency: string };
  earnings?:  { type: string; amount: number; currency: string; hours?: number }[];
};

// ---------- Token exchange (after Finch Connect flow) ----------
export async function exchangeFinchCode(code: string): Promise<{
  access_token: string;
  payroll_provider_id: FinchProvider;
  company_id: string;
}> {
  if (!process.env.FINCH_CLIENT_ID || !process.env.FINCH_CLIENT_SECRET) {
    throw new Error("FINCH_CLIENT_ID / FINCH_CLIENT_SECRET not configured");
  }
  const res = await fetch(`${base()}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.FINCH_CLIENT_ID,
      client_secret: process.env.FINCH_CLIENT_SECRET,
      code,
      redirect_uri:  process.env.FINCH_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL}/api/finch/callback`,
    }),
  });
  if (!res.ok) throw new Error(`Finch token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------- Common API calls ----------
async function call<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Finch-API-Version": "2020-09-17",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Finch ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export const FinchAPI = {
  /** Get the connected company info */
  async company(token: string) {
    return call<{ id: string; legal_name: string; ein?: string; entity?: { type: string }; locations?: any[] }>(
      "/employer/company", token,
    );
  },

  /** List all workers in the connected company */
  async listWorkers(token: string) {
    const r = await call<{ paging?: { count?: number }; individuals: FinchWorker[] }>("/employer/directory", token);
    return r.individuals ?? [];
  },

  /** Hydrate full employment details for a batch of worker IDs */
  async employments(token: string, ids: string[]) {
    return call<{ responses: any[] }>("/employer/employment", token, {
      method: "POST",
      body: JSON.stringify({ requests: ids.map(id => ({ individual_id: id })) }),
    });
  },

  /** Push pay data for a pay statement */
  async createPayStatement(token: string, statement: FinchPayStatement) {
    return call<{ id: string }>("/employer/pay-statement", token, {
      method: "POST",
      body: JSON.stringify(statement),
    });
  },
};
