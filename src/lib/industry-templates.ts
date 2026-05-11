// Industry templates picked at signup. Pre-populates the new org with
// sensible defaults so the user is productive in <5 minutes.

export type IndustryKey = "restaurant" | "retail" | "grocery" | "security" | "healthcare" | "field_service" | "office" | "fitness" | "other";

export type Template = {
  key: IndustryKey;
  label: string;
  emoji: string;
  description: string;
  positions: string[];
  shiftBlocks: { name: string; startTime: string; endTime: string }[];
  dayNoteSamples: string[];
  defaultGeofenceMeters: number;
  recommendedComplianceTweaks?: { mealBreakRequiredAfterHours?: number; predictiveSchedulingDays?: number };
};

export const INDUSTRY_TEMPLATES: Template[] = [
  {
    key: "restaurant", label: "Restaurant / Hospitality", emoji: "🍽️",
    description: "Servers, line cooks, hosts, bartenders. POS-driven scheduling, tip pools.",
    positions: ["Server", "Line Cook", "Host", "Bartender", "Dishwasher", "Manager on Duty"],
    shiftBlocks: [
      { name: "Brunch",  startTime: "09:00", endTime: "15:00" },
      { name: "Dinner",  startTime: "16:00", endTime: "23:00" },
      { name: "Closing", startTime: "21:00", endTime: "02:00" },
    ],
    dayNoteSamples: ["VIP table at 8pm", "Wine tasting event 7-9", "Liquor delivery 11am"],
    defaultGeofenceMeters: 50,
    recommendedComplianceTweaks: { mealBreakRequiredAfterHours: 5, predictiveSchedulingDays: 14 },
  },
  {
    key: "retail", label: "Retail", emoji: "🛍️",
    description: "Sales associates, cashiers, stockers. Foot-traffic-driven scheduling.",
    positions: ["Sales Associate", "Cashier", "Stock Associate", "Visual Merchandiser", "Store Manager", "Loss Prevention"],
    shiftBlocks: [
      { name: "Open",   startTime: "09:00", endTime: "15:00" },
      { name: "Mid",    startTime: "12:00", endTime: "18:00" },
      { name: "Close",  startTime: "15:00", endTime: "21:00" },
    ],
    dayNoteSamples: ["Restock fitting rooms", "Markdown event Friday", "Truck arrives 7am"],
    defaultGeofenceMeters: 75,
    recommendedComplianceTweaks: { predictiveSchedulingDays: 14 },
  },
  {
    key: "healthcare", label: "Healthcare / Senior Care", emoji: "🏥",
    description: "Nurses, aides, techs. License tracking, 12-hour shifts, strict compliance.",
    positions: ["RN", "LPN", "CNA", "Medical Assistant", "Charge Nurse", "Receptionist"],
    shiftBlocks: [
      { name: "Day",      startTime: "07:00", endTime: "19:00" },
      { name: "Night",    startTime: "19:00", endTime: "07:00" },
      { name: "Mid-day",  startTime: "11:00", endTime: "19:00" },
    ],
    dayNoteSamples: ["Doctor rounds 8-10am", "Family conference 2pm", "Med pass 4pm"],
    defaultGeofenceMeters: 100,
    recommendedComplianceTweaks: { mealBreakRequiredAfterHours: 6 },
  },
  {
    key: "grocery", label: "Grocery / Supermarket", emoji: "🛒",
    description: "Cashiers, deli, produce, bakery, stockers. Department-based scheduling, minor labor rules.",
    positions: ["Cashier", "Bagger", "Deli Clerk", "Bakery", "Produce", "Meat Cutter", "Stocker", "Customer Service", "Self-Checkout Attendant", "Floor Manager", "Pharmacy Tech"],
    shiftBlocks: [
      { name: "Early Stock",   startTime: "05:00", endTime: "13:00" },
      { name: "Mid",           startTime: "10:00", endTime: "18:00" },
      { name: "Close",         startTime: "14:00", endTime: "22:00" },
      { name: "Overnight",     startTime: "22:00", endTime: "06:00" },
    ],
    dayNoteSamples: ["Truck arrives 4am", "Senior hour 7-8am", "Weekly ad changes Wednesday", "Pharmacy closed 2-3pm lunch"],
    defaultGeofenceMeters: 80,
    recommendedComplianceTweaks: { mealBreakRequiredAfterHours: 6, predictiveSchedulingDays: 14 },
  },
  {
    key: "security", label: "Security Services", emoji: "🛡️",
    description: "Guards, patrol, post coverage. Client billing, incident reports, checkpoint tours.",
    positions: ["Unarmed Guard", "Armed Guard", "Patrol", "Site Supervisor", "Dispatcher", "Console Operator", "Event Security", "Loss Prevention"],
    shiftBlocks: [
      { name: "1st Shift (Day)",   startTime: "06:00", endTime: "14:00" },
      { name: "2nd Shift (Eve)",   startTime: "14:00", endTime: "22:00" },
      { name: "3rd Shift (Night)", startTime: "22:00", endTime: "06:00" },
      { name: "12h Day",           startTime: "06:00", endTime: "18:00" },
      { name: "12h Night",         startTime: "18:00", endTime: "06:00" },
    ],
    dayNoteSamples: ["VIP escort 3pm", "Client walkthrough 10am", "Post inspection scheduled", "Alarm test 2pm"],
    defaultGeofenceMeters: 150,
    recommendedComplianceTweaks: { mealBreakRequiredAfterHours: 6 },
  },
  {
    key: "field_service", label: "Field Service", emoji: "🛠️",
    description: "Technicians, drivers, installers. GPS-verified, multi-site coverage.",
    positions: ["Technician", "Senior Tech", "Driver", "Dispatcher", "Service Manager", "Installer"],
    shiftBlocks: [
      { name: "Morning",   startTime: "06:00", endTime: "14:00" },
      { name: "Afternoon", startTime: "14:00", endTime: "22:00" },
      { name: "Overnight", startTime: "22:00", endTime: "06:00" },
    ],
    dayNoteSamples: ["Equipment audit", "Service routes leave 7am", "Customer survey deadline"],
    defaultGeofenceMeters: 120,
  },
  {
    key: "office", label: "Office / Corporate", emoji: "🏢",
    description: "Standard 9-5, hybrid teams, simple scheduling.",
    positions: ["Receptionist", "Admin", "Office Manager", "IT Support", "HR Coordinator"],
    shiftBlocks: [
      { name: "Standard",  startTime: "09:00", endTime: "17:00" },
      { name: "Early",     startTime: "07:00", endTime: "15:00" },
      { name: "Late",      startTime: "11:00", endTime: "19:00" },
    ],
    dayNoteSamples: ["All-hands meeting 11am", "Client visit 2-4pm", "Office closed for holiday"],
    defaultGeofenceMeters: 200,
  },
  {
    key: "fitness", label: "Fitness / Wellness", emoji: "💪",
    description: "Trainers, instructors, front-desk. Class-driven scheduling.",
    positions: ["Personal Trainer", "Group Fitness Instructor", "Front Desk", "Manager", "Maintenance"],
    shiftBlocks: [
      { name: "AM Block",  startTime: "05:00", endTime: "12:00" },
      { name: "PM Block",  startTime: "15:00", endTime: "22:00" },
      { name: "Mid",       startTime: "10:00", endTime: "16:00" },
    ],
    dayNoteSamples: ["6am HIIT class", "Member appreciation 5-7pm", "Pool maintenance Tue 6am"],
    defaultGeofenceMeters: 75,
  },
];

export function templateByKey(key: string): Template | null {
  return INDUSTRY_TEMPLATES.find(t => t.key === key) ?? null;
}
