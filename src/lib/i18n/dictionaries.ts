// Lightweight i18n — flat dictionary lookup with English fallback. No external
// library needed. Keys are namespace.purpose so the file can later be split
// into JSON per-namespace if it grows.

export type Locale = "en" | "es" | "fr";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
];

type Dict = Record<string, string>;

// English is canonical. Translate every key in EN to ES and FR below.
const EN: Dict = {
  // ─── Navigation ────────────────────────────────────────────────────────
  "nav.dashboard":   "Home",
  "nav.schedule":    "Schedule",
  "nav.attendance":  "Attendance",
  "nav.open_shifts": "Open Shifts",
  "nav.time_off":    "Time Off",
  "nav.hr":          "Team",
  "nav.messenger":   "Messenger",
  "nav.documents":   "Documents",
  "nav.billboard":   "News Feed",
  "nav.reports":     "Reports",
  "nav.compliance":  "Compliance",
  "nav.more":        "More",
  "nav.settings":    "Settings",
  "nav.workspace":   "Workspace",
  "nav.people":      "People",
  "nav.setup":       "Setup",
  "nav.locations":   "Locations",
  "nav.billing":     "Billing",

  // ─── Common actions ───────────────────────────────────────────────────
  "action.save":     "Save",
  "action.cancel":   "Cancel",
  "action.delete":   "Delete",
  "action.edit":     "Edit",
  "action.confirm":  "Confirm",
  "action.create":   "Create",
  "action.publish":  "Publish",
  "action.approve":  "Approve",
  "action.reject":   "Reject",
  "action.send":     "Send",
  "action.add":      "Add",
  "action.new":      "New",
  "action.search":   "Search",
  "action.export":   "Export",
  "action.import":   "Import",
  "action.update":   "Update",
  "action.invite":   "Invite",
  "action.next":     "Next",
  "action.back":     "Back",
  "action.done":     "Done",
  "action.close":    "Close",
  "action.open":     "Open",
  "action.view":     "View",
  "action.copy":     "Copy",
  "action.filter":   "Filter",
  "action.sort":     "Sort",
  "action.signin":   "Sign in",
  "action.signout":  "Sign out",
  "action.signup":   "Sign up",
  "action.start_trial":   "Start free trial",
  "action.clock_in":      "Clock in",
  "action.clock_out":     "Clock out",

  // ─── Status / generic ─────────────────────────────────────────────────
  "status.loading":      "Loading…",
  "status.saving":       "Saving…",
  "status.saved":        "Saved",
  "status.error":        "Error",
  "status.no_results":   "No results",
  "status.coming_soon":  "Coming soon",
  "status.draft":        "Draft",
  "status.published":    "Published",
  "status.active":       "Active",
  "status.inactive":     "Inactive",
  "status.pending":      "Pending",
  "status.approved":     "Approved",
  "status.rejected":     "Rejected",
  "status.cancelled":    "Cancelled",
  "status.expired":      "Expired",

  // ─── Schedule ─────────────────────────────────────────────────────────
  "schedule.title":              "Schedule",
  "schedule.week_of":            "Week of",
  "schedule.this_week":          "This week",
  "schedule.next_week":          "Next week",
  "schedule.last_week":          "Last week",
  "schedule.today":              "Today",
  "schedule.publish_week":       "Publish week",
  "schedule.auto_schedule":      "Auto-Schedule",
  "schedule.open_shifts":        "Open Shifts",
  "schedule.unpublished_drafts": "Unpublished Drafts",
  "schedule.by_position":        "By position",
  "schedule.by_employee":        "By employee",
  "schedule.day_totals":         "Day totals",
  "schedule.print":              "Print / PDF",
  "schedule.hot_shift":          "Hot shift",
  "schedule.high_demand":        "high demand",

  // ─── Attendance ───────────────────────────────────────────────────────
  "attendance.title":          "Attendance",
  "attendance.clock_in":       "Clock in",
  "attendance.clock_out":      "Clock out",
  "attendance.start_break":    "Start break",
  "attendance.end_break":      "End break",
  "attendance.working":        "Working",
  "attendance.on_break":       "On break",
  "attendance.off_duty":       "Off duty",
  "attendance.run_payroll":    "Run payroll",
  "attendance.on_time":        "On time",
  "attendance.late":           "Late",
  "attendance.no_show":        "No-show",
  "attendance.missed_clockout":"Missed clock-out",
  "attendance.avg_variance":   "Avg variance",
  "attendance.in_geofence":    "in geofence",
  "attendance.outside":        "outside",
  "attendance.verified":       "Verified",

  // ─── Time off ─────────────────────────────────────────────────────────
  "time_off.title":      "Time Off",
  "time_off.request":    "Request time off",
  "time_off.pending":    "Pending",
  "time_off.approved":   "Approved",
  "time_off.rejected":   "Rejected",
  "time_off.balance":    "Balance",

  // ─── Billboard ────────────────────────────────────────────────────────
  "billboard.title":     "News Feed",
  "billboard.new_post":  "New post",

  // ─── Empty states ────────────────────────────────────────────────────
  "empty.no_shifts":     "No shifts scheduled.",
  "empty.no_messages":   "No messages yet.",
  "empty.no_data":       "No data yet.",
  "empty.all_caught_up": "All caught up.",

  // ─── Greetings ────────────────────────────────────────────────────────
  "greeting.morning":   "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening":   "Good evening",

  // ─── Co-pilot ─────────────────────────────────────────────────────────
  "copilot.title":         "Co-pilot",
  "copilot.ask":           "Ask Co-pilot or search…",
  "copilot.search":        "Search anything",
  "copilot.suggestions":   "Co-pilot suggests",
  "copilot.things_to_look":"3 things to look at today",
  "copilot.thinking":      "Thinking…",
  "copilot.powered_by":    "Powered by Claude",

  // ─── KPIs ─────────────────────────────────────────────────────────────
  "kpi.labor_cost":      "Labor cost",
  "kpi.labor_cost_today":"Labor cost today",
  "kpi.open_shifts":     "Open shifts",
  "kpi.clocked_in":      "Live clock-ins",
  "kpi.compliance":      "Compliance",
  "kpi.this_week":       "This week",
  "kpi.hours":           "Hours",
  "kpi.shifts":          "Shifts",
  "kpi.cost":            "Cost",
  "kpi.ot_hours":        "OT hours",

  // ─── Settings ─────────────────────────────────────────────────────────
  "settings.notifications":          "Notifications",
  "settings.notifications.sms":      "Text message (SMS) notifications",
  "settings.notifications.shift_offer":     "New shifts available",
  "settings.notifications.schedule_change": "Schedule changes",
  "settings.notifications.time_off":        "Time-off decisions",
  "settings.notifications.alerts":          "Critical alerts",
  "settings.notifications.quiet_hours":     "Quiet hours (no SMS between)",
  "settings.language":               "Language",
  "settings.language.change":        "Change language",
  "settings.calendar":               "Calendar feed",
  "settings.calendar.description":   "Subscribe to your shifts in Apple Calendar, Google Calendar, or Outlook.",
  "settings.calendar.rotate":        "Rotate URL (invalidates old one)",
  "settings.profile":                "Profile",
  "settings.billing":                "Billing & plan",
  "settings.locations":              "Locations",
  "settings.positions":              "Positions",
  "settings.pay_rates":              "Pay rates",
  "settings.api":                    "API",
  "settings.branding":               "Branding",

  // ─── Roles ────────────────────────────────────────────────────────────
  "role.admin":    "Admin",
  "role.manager":  "Manager",
  "role.employee": "Employee",

  // ─── Marketing / Pricing ──────────────────────────────────────────────
  "pricing.free":       "Free",
  "pricing.pro":        "Pro",
  "pricing.business":   "Business",
  "pricing.enterprise": "Enterprise",
  "pricing.month":      "/mo",
  "pricing.popular":    "Most popular",
  "pricing.contact_sales": "Contact sales",

  // ─── Trial ────────────────────────────────────────────────────────────
  "trial.banner":        "{days} days left in your trial",
  "trial.expired":       "Your trial has ended",
  "trial.expired.days":  "Your trial ended {days} day(s) ago",
  "trial.subscribe":     "Subscribe to keep going",

  // ─── Auth ─────────────────────────────────────────────────────────────
  "auth.email":          "Email",
  "auth.password":       "Password",
  "auth.name":           "Full name",
  "auth.forgot_pw":      "Forgot password?",
  "auth.no_account":     "Don't have an account?",
  "auth.have_account":   "Already have an account?",
  "auth.invalid_creds":  "Invalid email or password",
};

// ─── Spanish ──────────────────────────────────────────────────────────────
const ES: Dict = {
  // Navigation
  "nav.dashboard":   "Inicio",
  "nav.schedule":    "Horario",
  "nav.attendance":  "Asistencia",
  "nav.open_shifts": "Turnos abiertos",
  "nav.time_off":    "Tiempo libre",
  "nav.hr":          "Equipo",
  "nav.messenger":   "Mensajería",
  "nav.documents":   "Documentos",
  "nav.billboard":   "Tablón",
  "nav.reports":     "Reportes",
  "nav.compliance":  "Cumplimiento",
  "nav.more":        "Más",
  "nav.settings":    "Ajustes",
  "nav.workspace":   "Espacio de trabajo",
  "nav.people":      "Personas",
  "nav.setup":       "Configuración",
  "nav.locations":   "Sucursales",
  "nav.billing":     "Facturación",

  // Actions
  "action.save":     "Guardar",
  "action.cancel":   "Cancelar",
  "action.delete":   "Eliminar",
  "action.edit":     "Editar",
  "action.confirm":  "Confirmar",
  "action.create":   "Crear",
  "action.publish":  "Publicar",
  "action.approve":  "Aprobar",
  "action.reject":   "Rechazar",
  "action.send":     "Enviar",
  "action.add":      "Añadir",
  "action.new":      "Nuevo",
  "action.search":   "Buscar",
  "action.export":   "Exportar",
  "action.import":   "Importar",
  "action.update":   "Actualizar",
  "action.invite":   "Invitar",
  "action.next":     "Siguiente",
  "action.back":     "Atrás",
  "action.done":     "Hecho",
  "action.close":    "Cerrar",
  "action.open":     "Abrir",
  "action.view":     "Ver",
  "action.copy":     "Copiar",
  "action.filter":   "Filtrar",
  "action.sort":     "Ordenar",
  "action.signin":   "Iniciar sesión",
  "action.signout":  "Cerrar sesión",
  "action.signup":   "Registrarse",
  "action.start_trial":   "Comenzar prueba gratis",
  "action.clock_in":      "Fichar entrada",
  "action.clock_out":     "Fichar salida",

  // Status
  "status.loading":      "Cargando…",
  "status.saving":       "Guardando…",
  "status.saved":        "Guardado",
  "status.error":        "Error",
  "status.no_results":   "Sin resultados",
  "status.coming_soon":  "Próximamente",
  "status.draft":        "Borrador",
  "status.published":    "Publicado",
  "status.active":       "Activo",
  "status.inactive":     "Inactivo",
  "status.pending":      "Pendiente",
  "status.approved":     "Aprobado",
  "status.rejected":     "Rechazado",
  "status.cancelled":    "Cancelado",
  "status.expired":      "Expirado",

  // Schedule
  "schedule.title":              "Horario",
  "schedule.week_of":            "Semana del",
  "schedule.this_week":          "Esta semana",
  "schedule.next_week":          "Próxima semana",
  "schedule.last_week":          "Semana pasada",
  "schedule.today":              "Hoy",
  "schedule.publish_week":       "Publicar semana",
  "schedule.auto_schedule":      "Auto-programar",
  "schedule.open_shifts":        "Turnos abiertos",
  "schedule.unpublished_drafts": "Borradores sin publicar",
  "schedule.by_position":        "Por puesto",
  "schedule.by_employee":        "Por empleado",
  "schedule.day_totals":         "Totales del día",
  "schedule.print":              "Imprimir / PDF",
  "schedule.hot_shift":          "Turno destacado",
  "schedule.high_demand":        "alta demanda",

  // Attendance
  "attendance.title":          "Asistencia",
  "attendance.clock_in":       "Fichar entrada",
  "attendance.clock_out":      "Fichar salida",
  "attendance.start_break":    "Comenzar descanso",
  "attendance.end_break":      "Fin del descanso",
  "attendance.working":        "Trabajando",
  "attendance.on_break":       "En descanso",
  "attendance.off_duty":       "Fuera de servicio",
  "attendance.run_payroll":    "Ejecutar nómina",
  "attendance.on_time":        "A tiempo",
  "attendance.late":           "Tarde",
  "attendance.no_show":        "No se presentó",
  "attendance.missed_clockout":"Salida no fichada",
  "attendance.avg_variance":   "Varianza prom.",
  "attendance.in_geofence":    "en geocerca",
  "attendance.outside":        "fuera",
  "attendance.verified":       "Verificado",

  // Time off
  "time_off.title":      "Tiempo libre",
  "time_off.request":    "Solicitar tiempo libre",
  "time_off.pending":    "Pendiente",
  "time_off.approved":   "Aprobado",
  "time_off.rejected":   "Rechazado",
  "time_off.balance":    "Saldo",

  // Billboard
  "billboard.title":     "Tablón de noticias",
  "billboard.new_post":  "Nueva publicación",

  // Empty
  "empty.no_shifts":     "Sin turnos programados.",
  "empty.no_messages":   "Sin mensajes todavía.",
  "empty.no_data":       "Sin datos todavía.",
  "empty.all_caught_up": "Todo al día.",

  // Greetings
  "greeting.morning":   "Buenos días",
  "greeting.afternoon": "Buenas tardes",
  "greeting.evening":   "Buenas noches",

  // Co-pilot
  "copilot.title":         "Co-pilot",
  "copilot.ask":           "Pregunta al Co-pilot o busca…",
  "copilot.search":        "Buscar lo que sea",
  "copilot.suggestions":   "Co-pilot sugiere",
  "copilot.things_to_look":"3 cosas para revisar hoy",
  "copilot.thinking":      "Pensando…",
  "copilot.powered_by":    "Impulsado por Claude",

  // KPIs
  "kpi.labor_cost":      "Costo laboral",
  "kpi.labor_cost_today":"Costo laboral hoy",
  "kpi.open_shifts":     "Turnos abiertos",
  "kpi.clocked_in":      "Fichados en vivo",
  "kpi.compliance":      "Cumplimiento",
  "kpi.this_week":       "Esta semana",
  "kpi.hours":           "Horas",
  "kpi.shifts":          "Turnos",
  "kpi.cost":            "Costo",
  "kpi.ot_hours":        "Horas extras",

  // Settings
  "settings.notifications":          "Notificaciones",
  "settings.notifications.sms":      "Notificaciones por SMS",
  "settings.notifications.shift_offer":     "Turnos nuevos disponibles",
  "settings.notifications.schedule_change": "Cambios de horario",
  "settings.notifications.time_off":        "Decisiones de tiempo libre",
  "settings.notifications.alerts":          "Alertas críticas",
  "settings.notifications.quiet_hours":     "Horas silenciosas (sin SMS entre)",
  "settings.language":               "Idioma",
  "settings.language.change":        "Cambiar idioma",
  "settings.calendar":               "Calendario",
  "settings.calendar.description":   "Suscríbete a tus turnos en Apple Calendar, Google Calendar u Outlook.",
  "settings.calendar.rotate":        "Renovar URL (invalida la anterior)",
  "settings.profile":                "Perfil",
  "settings.billing":                "Facturación y plan",
  "settings.locations":              "Sucursales",
  "settings.positions":              "Puestos",
  "settings.pay_rates":              "Tarifas de pago",
  "settings.api":                    "API",
  "settings.branding":               "Marca",

  // Roles
  "role.admin":    "Administrador",
  "role.manager":  "Gerente",
  "role.employee": "Empleado",

  // Pricing
  "pricing.free":       "Gratis",
  "pricing.pro":        "Pro",
  "pricing.business":   "Business",
  "pricing.enterprise": "Empresa",
  "pricing.month":      "/mes",
  "pricing.popular":    "Más popular",
  "pricing.contact_sales": "Contactar a ventas",

  // Trial
  "trial.banner":        "{days} días restantes en tu prueba",
  "trial.expired":       "Tu prueba terminó",
  "trial.expired.days":  "Tu prueba terminó hace {days} día(s)",
  "trial.subscribe":     "Suscríbete para continuar",

  // Auth
  "auth.email":          "Correo electrónico",
  "auth.password":       "Contraseña",
  "auth.name":           "Nombre completo",
  "auth.forgot_pw":      "¿Olvidaste tu contraseña?",
  "auth.no_account":     "¿No tienes cuenta?",
  "auth.have_account":   "¿Ya tienes cuenta?",
  "auth.invalid_creds":  "Correo o contraseña inválidos",
};

// ─── French (CA Québec spellings preferred where applicable) ──────────────
const FR: Dict = {
  // Navigation
  "nav.dashboard":   "Accueil",
  "nav.schedule":    "Horaire",
  "nav.attendance":  "Présence",
  "nav.open_shifts": "Quarts ouverts",
  "nav.time_off":    "Congés",
  "nav.hr":          "Équipe",
  "nav.messenger":   "Messagerie",
  "nav.documents":   "Documents",
  "nav.billboard":   "Babillard",
  "nav.reports":     "Rapports",
  "nav.compliance":  "Conformité",
  "nav.more":        "Plus",
  "nav.settings":    "Paramètres",
  "nav.workspace":   "Espace de travail",
  "nav.people":      "Personnes",
  "nav.setup":       "Configuration",
  "nav.locations":   "Emplacements",
  "nav.billing":     "Facturation",

  // Actions
  "action.save":     "Enregistrer",
  "action.cancel":   "Annuler",
  "action.delete":   "Supprimer",
  "action.edit":     "Modifier",
  "action.confirm":  "Confirmer",
  "action.create":   "Créer",
  "action.publish":  "Publier",
  "action.approve":  "Approuver",
  "action.reject":   "Refuser",
  "action.send":     "Envoyer",
  "action.add":      "Ajouter",
  "action.new":      "Nouveau",
  "action.search":   "Rechercher",
  "action.export":   "Exporter",
  "action.import":   "Importer",
  "action.update":   "Mettre à jour",
  "action.invite":   "Inviter",
  "action.next":     "Suivant",
  "action.back":     "Retour",
  "action.done":     "Terminé",
  "action.close":    "Fermer",
  "action.open":     "Ouvrir",
  "action.view":     "Voir",
  "action.copy":     "Copier",
  "action.filter":   "Filtrer",
  "action.sort":     "Trier",
  "action.signin":   "Se connecter",
  "action.signout":  "Se déconnecter",
  "action.signup":   "S'inscrire",
  "action.start_trial":   "Commencer l'essai gratuit",
  "action.clock_in":      "Pointer l'arrivée",
  "action.clock_out":     "Pointer le départ",

  // Status
  "status.loading":      "Chargement…",
  "status.saving":       "Enregistrement…",
  "status.saved":        "Enregistré",
  "status.error":        "Erreur",
  "status.no_results":   "Aucun résultat",
  "status.coming_soon":  "À venir",
  "status.draft":        "Brouillon",
  "status.published":    "Publié",
  "status.active":       "Actif",
  "status.inactive":     "Inactif",
  "status.pending":      "En attente",
  "status.approved":     "Approuvé",
  "status.rejected":     "Refusé",
  "status.cancelled":    "Annulé",
  "status.expired":      "Expiré",

  // Schedule
  "schedule.title":              "Horaire",
  "schedule.week_of":            "Semaine du",
  "schedule.this_week":          "Cette semaine",
  "schedule.next_week":          "Semaine prochaine",
  "schedule.last_week":          "Semaine dernière",
  "schedule.today":              "Aujourd'hui",
  "schedule.publish_week":       "Publier la semaine",
  "schedule.auto_schedule":      "Auto-planifier",
  "schedule.open_shifts":        "Quarts ouverts",
  "schedule.unpublished_drafts": "Brouillons non publiés",
  "schedule.by_position":        "Par poste",
  "schedule.by_employee":        "Par employé",
  "schedule.day_totals":         "Totaux du jour",
  "schedule.print":              "Imprimer / PDF",
  "schedule.hot_shift":          "Quart prime",
  "schedule.high_demand":        "forte demande",

  // Attendance
  "attendance.title":          "Présence",
  "attendance.clock_in":       "Pointer l'arrivée",
  "attendance.clock_out":      "Pointer le départ",
  "attendance.start_break":    "Commencer la pause",
  "attendance.end_break":      "Fin de la pause",
  "attendance.working":        "Au travail",
  "attendance.on_break":       "En pause",
  "attendance.off_duty":       "Hors service",
  "attendance.run_payroll":    "Lancer la paie",
  "attendance.on_time":        "À l'heure",
  "attendance.late":           "En retard",
  "attendance.no_show":        "Absence",
  "attendance.missed_clockout":"Départ non pointé",
  "attendance.avg_variance":   "Écart moy.",
  "attendance.in_geofence":    "dans la zone",
  "attendance.outside":        "hors zone",
  "attendance.verified":       "Vérifié",

  // Time off
  "time_off.title":      "Congés",
  "time_off.request":    "Demander un congé",
  "time_off.pending":    "En attente",
  "time_off.approved":   "Approuvé",
  "time_off.rejected":   "Refusé",
  "time_off.balance":    "Solde",

  // Billboard
  "billboard.title":     "Babillard",
  "billboard.new_post":  "Nouvelle publication",

  // Empty
  "empty.no_shifts":     "Aucun quart programmé.",
  "empty.no_messages":   "Aucun message pour l'instant.",
  "empty.no_data":       "Aucune donnée pour l'instant.",
  "empty.all_caught_up": "Tout est à jour.",

  // Greetings
  "greeting.morning":   "Bonjour",
  "greeting.afternoon": "Bon après-midi",
  "greeting.evening":   "Bonsoir",

  // Co-pilot
  "copilot.title":         "Co-pilot",
  "copilot.ask":           "Demande au Co-pilot ou recherche…",
  "copilot.search":        "Tout chercher",
  "copilot.suggestions":   "Suggestions du Co-pilot",
  "copilot.things_to_look":"3 choses à surveiller aujourd'hui",
  "copilot.thinking":      "Réflexion en cours…",
  "copilot.powered_by":    "Propulsé par Claude",

  // KPIs
  "kpi.labor_cost":      "Coût de main-d'œuvre",
  "kpi.labor_cost_today":"Coût de main-d'œuvre aujourd'hui",
  "kpi.open_shifts":     "Quarts ouverts",
  "kpi.clocked_in":      "Pointages en direct",
  "kpi.compliance":      "Conformité",
  "kpi.this_week":       "Cette semaine",
  "kpi.hours":           "Heures",
  "kpi.shifts":          "Quarts",
  "kpi.cost":            "Coût",
  "kpi.ot_hours":        "Heures supp.",

  // Settings
  "settings.notifications":          "Notifications",
  "settings.notifications.sms":      "Notifications par SMS",
  "settings.notifications.shift_offer":     "Nouveaux quarts disponibles",
  "settings.notifications.schedule_change": "Changements d'horaire",
  "settings.notifications.time_off":        "Décisions de congé",
  "settings.notifications.alerts":          "Alertes critiques",
  "settings.notifications.quiet_hours":     "Heures de silence (pas de SMS entre)",
  "settings.language":               "Langue",
  "settings.language.change":        "Changer la langue",
  "settings.calendar":               "Flux de calendrier",
  "settings.calendar.description":   "Abonnez-vous à vos quarts dans Apple Calendar, Google Calendar ou Outlook.",
  "settings.calendar.rotate":        "Renouveler l'URL (invalide l'ancienne)",
  "settings.profile":                "Profil",
  "settings.billing":                "Facturation et forfait",
  "settings.locations":              "Emplacements",
  "settings.positions":              "Postes",
  "settings.pay_rates":              "Taux de paie",
  "settings.api":                    "API",
  "settings.branding":               "Image de marque",

  // Roles
  "role.admin":    "Administrateur",
  "role.manager":  "Gérant",
  "role.employee": "Employé",

  // Pricing
  "pricing.free":       "Gratuit",
  "pricing.pro":        "Pro",
  "pricing.business":   "Affaires",
  "pricing.enterprise": "Entreprise",
  "pricing.month":      "/mois",
  "pricing.popular":    "Le plus populaire",
  "pricing.contact_sales": "Contacter les ventes",

  // Trial
  "trial.banner":        "Il reste {days} jours à votre essai",
  "trial.expired":       "Votre essai est terminé",
  "trial.expired.days":  "Votre essai s'est terminé il y a {days} jour(s)",
  "trial.subscribe":     "Abonnez-vous pour continuer",

  // Auth
  "auth.email":          "Courriel",
  "auth.password":       "Mot de passe",
  "auth.name":           "Nom complet",
  "auth.forgot_pw":      "Mot de passe oublié?",
  "auth.no_account":     "Pas de compte?",
  "auth.have_account":   "Vous avez déjà un compte?",
  "auth.invalid_creds":  "Courriel ou mot de passe invalide",
};

const DICTS: Record<Locale, Dict> = { en: EN, es: ES, fr: FR };

/** Look up a translated string. Falls back to English, then to the key itself.
 *  Supports {placeholder} interpolation. */
export function t(locale: Locale | string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  const loc: Locale = (locale === "es" || locale === "fr") ? locale : "en";
  let str = DICTS[loc][key] ?? EN[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

/** Resolves a member's effective locale: user override → org default → "en". */
export function resolveLocale(memberLocale: string | null | undefined, orgDefault: string | null | undefined): Locale {
  const candidate = memberLocale ?? orgDefault ?? "en";
  return (candidate === "es" || candidate === "fr") ? candidate : "en";
}
