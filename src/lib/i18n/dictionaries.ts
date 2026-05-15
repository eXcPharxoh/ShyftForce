// Lightweight i18n. We don't need react-i18next or next-intl yet — a flat
// dictionary lookup with English fallback covers our top-20 surfaces and
// keeps the bundle tiny. Easy to swap to a bigger library later.

export type Locale = "en" | "es" | "fr";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

type Dict = Record<string, string>;

// English is the canonical key set. Spanish/French translate the same keys.
// Keep keys hierarchical (namespace.purpose) so we can swap to JSON files later.
const EN: Dict = {
  // Navigation
  "nav.dashboard":  "Home",
  "nav.schedule":   "Schedule",
  "nav.attendance": "Attendance",
  "nav.open_shifts":"Open Shifts",
  "nav.time_off":   "Time Off",
  "nav.hr":         "HR",
  "nav.messenger":  "Messenger",
  "nav.documents":  "Documents",
  "nav.billboard":  "News Feed",
  "nav.reports":    "Reports",
  "nav.compliance": "Compliance",
  "nav.more":       "More",
  "nav.settings":   "Settings",

  // Common actions
  "action.save":    "Save",
  "action.cancel":  "Cancel",
  "action.delete":  "Delete",
  "action.edit":    "Edit",
  "action.confirm": "Confirm",
  "action.create":  "Create",
  "action.publish": "Publish",
  "action.approve": "Approve",
  "action.reject":  "Reject",
  "action.send":    "Send",
  "action.add":     "Add",

  // Schedule
  "schedule.title":           "Schedule",
  "schedule.publish_week":    "Publish week",
  "schedule.this_week":       "This week",
  "schedule.open_shifts":     "Open Shifts",
  "schedule.unpublished_drafts": "Unpublished Drafts",

  // Attendance
  "attendance.clock_in":      "Clock in",
  "attendance.clock_out":     "Clock out",
  "attendance.start_break":   "Start break",
  "attendance.end_break":     "End break",
  "attendance.working":       "Working",
  "attendance.on_break":      "On break",
  "attendance.off_duty":      "Off duty",
  "attendance.run_payroll":   "Run payroll",

  // Time off
  "time_off.title":      "Time Off",
  "time_off.request":    "Request time off",
  "time_off.pending":    "Pending",
  "time_off.approved":   "Approved",
  "time_off.rejected":   "Rejected",

  // Billboard
  "billboard.title":     "News Feed",
  "billboard.new_post":  "New post",

  // Empty states
  "empty.no_shifts":     "No shifts scheduled.",
  "empty.no_messages":   "No messages yet.",

  // SMS / settings
  "settings.notifications":          "Notifications",
  "settings.notifications.sms":      "Text message (SMS) notifications",
  "settings.notifications.shift_offer":     "New shift offers",
  "settings.notifications.schedule_change": "Schedule changes",
  "settings.notifications.time_off":        "Time-off decisions",
  "settings.notifications.alerts":          "Critical alerts",
  "settings.notifications.quiet_hours":     "Quiet hours (don't text me between)",
  "settings.language":               "Language",
  "settings.calendar":               "Calendar feed",
  "settings.calendar.description":   "Subscribe to your shifts in Apple Calendar, Google Calendar, or Outlook.",
  "settings.calendar.rotate":        "Rotate URL (invalidates the old one)",
};

const ES: Dict = {
  "nav.dashboard":  "Inicio",
  "nav.schedule":   "Horario",
  "nav.attendance": "Asistencia",
  "nav.open_shifts":"Turnos abiertos",
  "nav.time_off":   "Tiempo libre",
  "nav.hr":         "RR. HH.",
  "nav.messenger":  "Mensajes",
  "nav.documents":  "Documentos",
  "nav.billboard":  "Anuncios",
  "nav.reports":    "Informes",
  "nav.compliance": "Cumplimiento",
  "nav.more":       "Más",
  "nav.settings":   "Ajustes",

  "action.save":    "Guardar",
  "action.cancel":  "Cancelar",
  "action.delete":  "Eliminar",
  "action.edit":    "Editar",
  "action.confirm": "Confirmar",
  "action.create":  "Crear",
  "action.publish": "Publicar",
  "action.approve": "Aprobar",
  "action.reject":  "Rechazar",
  "action.send":    "Enviar",
  "action.add":     "Añadir",

  "schedule.title":           "Horario",
  "schedule.publish_week":    "Publicar semana",
  "schedule.this_week":       "Esta semana",
  "schedule.open_shifts":     "Turnos abiertos",
  "schedule.unpublished_drafts": "Borradores no publicados",

  "attendance.clock_in":      "Marcar entrada",
  "attendance.clock_out":     "Marcar salida",
  "attendance.start_break":   "Iniciar descanso",
  "attendance.end_break":     "Terminar descanso",
  "attendance.working":       "Trabajando",
  "attendance.on_break":      "En descanso",
  "attendance.off_duty":      "Fuera de servicio",
  "attendance.run_payroll":   "Ejecutar nómina",

  "time_off.title":      "Tiempo libre",
  "time_off.request":    "Solicitar tiempo libre",
  "time_off.pending":    "Pendiente",
  "time_off.approved":   "Aprobado",
  "time_off.rejected":   "Rechazado",

  "billboard.title":     "Anuncios",
  "billboard.new_post":  "Nueva publicación",

  "empty.no_shifts":     "Sin turnos programados.",
  "empty.no_messages":   "Aún no hay mensajes.",

  "settings.notifications":          "Notificaciones",
  "settings.notifications.sms":      "Notificaciones por SMS",
  "settings.notifications.shift_offer":     "Nuevos turnos disponibles",
  "settings.notifications.schedule_change": "Cambios de horario",
  "settings.notifications.time_off":        "Decisiones de tiempo libre",
  "settings.notifications.alerts":          "Alertas críticas",
  "settings.notifications.quiet_hours":     "Horas de silencio (no enviar SMS entre)",
  "settings.language":               "Idioma",
  "settings.calendar":               "Calendario",
  "settings.calendar.description":   "Suscríbete a tus turnos en Apple Calendar, Google Calendar u Outlook.",
  "settings.calendar.rotate":        "Renovar URL (invalida la anterior)",
};

const FR: Dict = {
  "nav.dashboard":  "Accueil",
  "nav.schedule":   "Horaire",
  "nav.attendance": "Présences",
  "nav.open_shifts":"Quarts disponibles",
  "nav.time_off":   "Congés",
  "nav.hr":         "RH",
  "nav.messenger":  "Messagerie",
  "nav.documents":  "Documents",
  "nav.billboard":  "Annonces",
  "nav.reports":    "Rapports",
  "nav.compliance": "Conformité",
  "nav.more":       "Plus",
  "nav.settings":   "Paramètres",

  "action.save":    "Enregistrer",
  "action.cancel":  "Annuler",
  "action.delete":  "Supprimer",
  "action.edit":    "Modifier",
  "action.confirm": "Confirmer",
  "action.create":  "Créer",
  "action.publish": "Publier",
  "action.approve": "Approuver",
  "action.reject":  "Refuser",
  "action.send":    "Envoyer",
  "action.add":     "Ajouter",

  "schedule.title":           "Horaire",
  "schedule.publish_week":    "Publier la semaine",
  "schedule.this_week":       "Cette semaine",
  "schedule.open_shifts":     "Quarts disponibles",
  "schedule.unpublished_drafts": "Brouillons non publiés",

  "attendance.clock_in":      "Pointer l'entrée",
  "attendance.clock_out":     "Pointer la sortie",
  "attendance.start_break":   "Commencer la pause",
  "attendance.end_break":     "Terminer la pause",
  "attendance.working":       "Au travail",
  "attendance.on_break":      "En pause",
  "attendance.off_duty":      "Hors service",
  "attendance.run_payroll":   "Lancer la paie",

  "time_off.title":      "Congés",
  "time_off.request":    "Demander un congé",
  "time_off.pending":    "En attente",
  "time_off.approved":   "Approuvé",
  "time_off.rejected":   "Refusé",

  "billboard.title":     "Annonces",
  "billboard.new_post":  "Nouvelle publication",

  "empty.no_shifts":     "Aucun quart programmé.",
  "empty.no_messages":   "Aucun message pour l'instant.",

  "settings.notifications":          "Notifications",
  "settings.notifications.sms":      "Notifications par SMS",
  "settings.notifications.shift_offer":     "Nouveaux quarts disponibles",
  "settings.notifications.schedule_change": "Changements d'horaire",
  "settings.notifications.time_off":        "Décisions de congé",
  "settings.notifications.alerts":          "Alertes critiques",
  "settings.notifications.quiet_hours":     "Heures de silence (pas de SMS entre)",
  "settings.language":               "Langue",
  "settings.calendar":               "Flux de calendrier",
  "settings.calendar.description":   "Abonnez-vous à vos quarts dans Apple Calendar, Google Calendar ou Outlook.",
  "settings.calendar.rotate":        "Renouveler l'URL (invalide l'ancienne)",
};

const DICTS: Record<Locale, Dict> = { en: EN, es: ES, fr: FR };

/** Look up a translated string. Falls back to English, then to the key itself. */
export function t(locale: Locale | string | null | undefined, key: string): string {
  const loc = (locale === "es" || locale === "fr") ? locale : "en";
  return DICTS[loc][key] ?? EN[key] ?? key;
}

/** Resolves a member's effective locale: user override → org default → "en". */
export function resolveLocale(memberLocale: string | null | undefined, orgDefault: string | null | undefined): Locale {
  const candidate = memberLocale ?? orgDefault ?? "en";
  return (candidate === "es" || candidate === "fr") ? candidate : "en";
}
