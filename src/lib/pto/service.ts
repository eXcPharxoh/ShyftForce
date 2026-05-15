import { prisma } from "@/lib/prisma";

/** Default policy set created for every new org. */
export const DEFAULT_POLICIES = [
  { category: "vacation",    name: "Vacation",     annualHours: 80, hoursPerDay: 8 },
  { category: "sick",        name: "Sick",         annualHours: 40, hoursPerDay: 8 },
  { category: "personal",    name: "Personal",     annualHours: 16, hoursPerDay: 8 },
  { category: "bereavement", name: "Bereavement",  annualHours: 24, hoursPerDay: 8 },
  { category: "unpaid",      name: "Unpaid leave", annualHours:  0, hoursPerDay: 8, accrualMethod: "unlimited" },
] as const;

/** Count business days (Mon-Fri) between two dates inclusive. Uses UTC to avoid TZ drift. */
export function businessDaysBetween(startDate: Date, endDate: Date): number {
  const toUtcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const sMs = toUtcDay(startDate);
  const eMs = toUtcDay(endDate);
  if (eMs < sMs) return 0;
  let count = 0;
  for (let t = sMs; t <= eMs; t += 86400000) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Convert request range → hours, given the policy's hoursPerDay. */
export function hoursForRequest(startDate: Date, endDate: Date, hoursPerDay = 8): number {
  return businessDaysBetween(startDate, endDate) * hoursPerDay;
}

/** Ensure default policies exist for an org. Idempotent. */
export async function ensureDefaultPolicies(organizationId: string) {
  const existing = await prisma.ptoPolicy.findMany({ where: { organizationId } });
  const existingCats = new Set(existing.map(p => p.category));
  const toCreate = DEFAULT_POLICIES.filter(p => !existingCats.has(p.category));
  if (toCreate.length === 0) return;
  await prisma.ptoPolicy.createMany({
    data: toCreate.map(p => ({
      organizationId, category: p.category, name: p.name,
      annualHours: p.annualHours, hoursPerDay: p.hoursPerDay,
      accrualMethod: (p as any).accrualMethod ?? "annual_lump_sum",
    })),
  });
}

/** Get/create a balance row for a member+policy and apply pending accruals. */
export async function getOrInitBalance(memberId: string, policyId: string) {
  const policy = await prisma.ptoPolicy.findUnique({ where: { id: policyId } });
  if (!policy) throw new Error("Policy not found");
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member not found");

  let balance = await prisma.ptoBalance.findUnique({ where: { memberId_policyId: { memberId, policyId } } });
  if (!balance) {
    balance = await prisma.ptoBalance.create({ data: { memberId, policyId } });
  }
  if (policy.accrualMethod === "unlimited" || policy.annualHours <= 0) return balance;

  const year = new Date().getFullYear();
  if (balance.lastAccrualYear !== year) {
    // Pro-rate first year by hire date if not yet credited
    const hireYear = member.hireDate.getFullYear();
    const hireMonth = member.hireDate.getMonth(); // 0-11
    const isFirstYear = balance.lastAccrualYear == null && hireYear === year;
    const monthsRemaining = isFirstYear ? (12 - hireMonth) : 12;
    const proRated = Math.round((policy.annualHours * (monthsRemaining / 12)) * 100) / 100;

    let newAccrued = balance.hoursAccrued + proRated;
    if (policy.maxBalance != null) {
      // Cap accumulation if maxBalance is set
      const available = newAccrued - balance.hoursUsed;
      if (available > policy.maxBalance) newAccrued = balance.hoursUsed + policy.maxBalance;
    }
    balance = await prisma.ptoBalance.update({
      where: { id: balance.id },
      data: {
        hoursAccrued: newAccrued,
        lastAccrualAt: new Date(),
        lastAccrualYear: year,
      },
    });
  }
  return balance;
}

/** Deduct hours from a balance. Allows negative if policy says so. */
export async function deduct(memberId: string, policyId: string, hours: number) {
  const balance = await getOrInitBalance(memberId, policyId);
  const policy = await prisma.ptoPolicy.findUnique({ where: { id: policyId } });
  if (policy?.accrualMethod === "unlimited") return balance;

  const newUsed = balance.hoursUsed + hours;
  const remaining = balance.hoursAccrued - newUsed;
  if (remaining < 0 && !policy?.allowNegative) {
    throw new Error(`Insufficient ${policy?.name ?? "PTO"} — ${(balance.hoursAccrued - balance.hoursUsed).toFixed(1)}h available, ${hours}h requested`);
  }
  return prisma.ptoBalance.update({ where: { id: balance.id }, data: { hoursUsed: newUsed } });
}

/** Refund hours back into the balance (e.g. when an approved request is rescinded). */
export async function refund(memberId: string, policyId: string, hours: number) {
  const balance = await getOrInitBalance(memberId, policyId);
  return prisma.ptoBalance.update({
    where: { id: balance.id },
    data: { hoursUsed: Math.max(0, balance.hoursUsed - hours) },
  });
}

export type BalanceSnapshot = {
  policyId: string;
  category: string;
  name: string;
  annualHours: number;
  hoursPerDay: number;
  accrualMethod: string;
  accrued: number;
  used: number;
  available: number;
  unlimited: boolean;
};

/** Read all balances for a member, initializing + accruing as needed. */
export async function snapshotForMember(memberId: string, organizationId: string): Promise<BalanceSnapshot[]> {
  await ensureDefaultPolicies(organizationId);
  const policies = await prisma.ptoPolicy.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" } });
  const out: BalanceSnapshot[] = [];
  for (const p of policies) {
    const b = await getOrInitBalance(memberId, p.id);
    const unlimited = p.accrualMethod === "unlimited" || p.annualHours <= 0;
    out.push({
      policyId: p.id, category: p.category, name: p.name,
      annualHours: p.annualHours, hoursPerDay: p.hoursPerDay,
      accrualMethod: p.accrualMethod,
      accrued: b.hoursAccrued, used: b.hoursUsed,
      available: unlimited ? Infinity : b.hoursAccrued - b.hoursUsed,
      unlimited,
    });
  }
  return out;
}

/** Batched snapshot for many members at once. Used by the manager time-off page
 *  so we don't issue 50+ queries per pending requester (the old per-member loop). */
export async function snapshotForMembers(memberIds: string[], organizationId: string): Promise<Map<string, BalanceSnapshot[]>> {
  if (memberIds.length === 0) return new Map();
  await ensureDefaultPolicies(organizationId);

  const [policies, members, balances] = await Promise.all([
    prisma.ptoPolicy.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, hireDate: true } }),
    prisma.ptoBalance.findMany({ where: { memberId: { in: memberIds }, policy: { organizationId } } }),
  ]);

  const memberById = new Map(members.map(m => [m.id, m]));
  // Key: `${memberId}|${policyId}` → balance
  const balanceByKey = new Map<string, { id: string; hoursAccrued: number; hoursUsed: number; lastAccrualYear: number | null }>();
  for (const b of balances) {
    balanceByKey.set(`${b.memberId}|${b.policyId}`, b);
  }

  // Identify which (member, policy) pairs need a balance row created and which
  // need an annual accrual. We'll fire those as concurrent writes after the read pass.
  type Pending = { memberId: string; policyId: string };
  const toCreate: Pending[] = [];
  type AccrualUpdate = { id: string; hoursAccrued: number };
  const toAccrue: AccrualUpdate[] = [];
  const year = new Date().getFullYear();

  for (const memberId of memberIds) {
    const member = memberById.get(memberId);
    if (!member) continue;
    for (const p of policies) {
      const key = `${memberId}|${p.id}`;
      let b = balanceByKey.get(key);
      if (!b) {
        toCreate.push({ memberId, policyId: p.id });
        continue;
      }
      if (p.accrualMethod === "unlimited" || p.annualHours <= 0) continue;
      if (b.lastAccrualYear === year) continue;
      const hireYear = member.hireDate.getFullYear();
      const hireMonth = member.hireDate.getMonth();
      const isFirstYear = b.lastAccrualYear == null && hireYear === year;
      const monthsRemaining = isFirstYear ? (12 - hireMonth) : 12;
      const proRated = Math.round((p.annualHours * (monthsRemaining / 12)) * 100) / 100;
      let newAccrued = b.hoursAccrued + proRated;
      if (p.maxBalance != null) {
        const available = newAccrued - b.hoursUsed;
        if (available > p.maxBalance) newAccrued = b.hoursUsed + p.maxBalance;
      }
      toAccrue.push({ id: b.id, hoursAccrued: newAccrued });
      balanceByKey.set(key, { ...b, hoursAccrued: newAccrued, lastAccrualYear: year });
    }
  }

  // Fire writes in parallel (createMany would be cleaner, but we need IDs back)
  await Promise.all([
    ...toCreate.map(p =>
      prisma.ptoBalance.create({ data: { memberId: p.memberId, policyId: p.policyId } })
        .then(b => balanceByKey.set(`${p.memberId}|${p.policyId}`, b))
    ),
    ...toAccrue.map(u =>
      prisma.ptoBalance.update({
        where: { id: u.id },
        data: { hoursAccrued: u.hoursAccrued, lastAccrualAt: new Date(), lastAccrualYear: year },
      })
    ),
  ]);

  // Build the result
  const result = new Map<string, BalanceSnapshot[]>();
  for (const memberId of memberIds) {
    const snaps: BalanceSnapshot[] = [];
    for (const p of policies) {
      const b = balanceByKey.get(`${memberId}|${p.id}`);
      const accrued = b?.hoursAccrued ?? 0;
      const used = b?.hoursUsed ?? 0;
      const unlimited = p.accrualMethod === "unlimited" || p.annualHours <= 0;
      snaps.push({
        policyId: p.id, category: p.category, name: p.name,
        annualHours: p.annualHours, hoursPerDay: p.hoursPerDay,
        accrualMethod: p.accrualMethod,
        accrued, used,
        available: unlimited ? Infinity : accrued - used,
        unlimited,
      });
    }
    result.set(memberId, snaps);
  }
  return result;
}
