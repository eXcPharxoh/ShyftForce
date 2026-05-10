"use client";
import { useState } from "react";
import { Clock, Coffee, LogOut } from "lucide-react";
import { ClockInDialog } from "./clock-in-dialog";

type Action = "clock_in" | "clock_out" | "break_start" | "break_end";

export function ClockButton({
  memberId, state, assignedLocation,
}: {
  memberId: string;
  state: "in" | "break" | "out";
  assignedLocation?: { name: string; latitude: number | null; longitude: number | null; geofenceRadiusMeters: number } | null;
}) {
  const [openAction, setOpenAction] = useState<Action | null>(null);

  return (
    <>
      {state === "out" && (
        <button onClick={() => setOpenAction("clock_in")} className="btn-primary"><Clock className="w-4 h-4" /> Clock in</button>
      )}
      {state === "break" && (
        <button onClick={() => setOpenAction("break_end")} className="btn-primary"><Clock className="w-4 h-4" /> End break</button>
      )}
      {state === "in" && (
        <div className="flex items-center gap-2">
          <button onClick={() => setOpenAction("break_start")} className="btn-outline"><Coffee className="w-4 h-4" /> Break</button>
          <button onClick={() => setOpenAction("clock_out")}   className="btn-primary"><LogOut className="w-4 h-4" /> Clock out</button>
        </div>
      )}
      {openAction && (
        <ClockInDialog
          open={true}
          action={openAction}
          memberId={memberId}
          assignedLocation={assignedLocation}
          onClose={() => setOpenAction(null)}
        />
      )}
    </>
  );
}
