import { z } from "zod";

// ---------- Shared ----------
export const TerritoryKey = z.enum([
    "mali",
    "burkinaFaso",
    "niger",
    "chad",
    "mauritania",
]);

export const TerritoryStatus = z.enum([
    "Critical",
    "Unstable",
    "Tense",
    "Volatile",
    "Stable",
]);

export const ZoneThreat = z.enum(["Critical", "High", "Moderate"]);

export const IntelType = z.enum(["militia", "idp", "illicit"]);

export const EffectType = z.enum(["positive", "negative", "neutral"]);

// ---------- Game State ----------
export const ResourcesSchema = z.object({
    budget: z.number(),
    politicalCapital: z.number(),
    personnel: z.number(),
    intelPoints: z.number(),
    timeMonths: z.number(),
}).strict();

export const MetricsSchema = z.object({
    stability: z.number(),
    insurgency: z.number(),
    civilianSupport: z.number(),
    globalLegitimacy: z.number(),
    regionalSynergy: z.number(),
}).strict();

export const ActorSentimentsSchema = z.object({
    auCommissioner: z.number(),
    goita: z.number(),
    jnim: z.number(),
    ecowas: z.number(),
    tuareg: z.number(),
    burkinaJunta: z.number(),
    burkinaCivil: z.number(),
    nigerJunta: z.number(),
    nigerHumanitarian: z.number(),
    chadTransitional: z.number(),
    mauritaniaIntel: z.number(),
    wagner: z.number(),
}).strict();

export const AiStateSchema = z.object({
    oppositionPressure: z.number(),
    intelConfidence: z.number(),
    actorSentiments: ActorSentimentsSchema,
}).strict();

export const TerritorySchema = z.object({
    name: z.string(),
    status: TerritoryStatus,
    stability: z.number(),
    insurgency: z.number(),
    population: z.string(),
    flag: z.string(),
    coords: z.tuple([z.number(), z.number()]),
    auPresence: z.number().optional(),
}).strict();

export const TerritoriesSchema = z.object({
    mali: TerritorySchema,
    burkinaFaso: TerritorySchema,
    niger: TerritorySchema,
    chad: TerritorySchema,
    mauritania: TerritorySchema,
}).strict();

export const TimerSchema = z.object({
    totalSeconds: z.number(),
    remainingSeconds: z.number(),
    isRunning: z.boolean(),
    intervalId: z.number().nullable(),
}).strict();

export const StatusEffectSchema = z.object({
    label: z.string(),
    type: EffectType.optional(),
}).strict();

export const StatusEntrySchema = z.object({
    turn: z.number(),
    category: z.string(),
    title: z.string(),
    summary: z.string(),
    effects: z.array(StatusEffectSchema),
    time: z.string(),
}).strict();

export const GameStateSchema = z.object({
    act: z.number(),
    turn: z.number(),
    maxTurns: z.number(),
    actionsRemaining: z.number(),
    maxActions: z.number(),
    resources: ResourcesSchema,
    metrics: MetricsSchema,
    ai: AiStateSchema,
    territories: TerritoriesSchema,
    currentTerritory: TerritoryKey.nullable(),
    timer: TimerSchema,
    actionsTaken: z.array(StatusEntrySchema),
}).strict();

// ---------- Zone Data ----------
export const ZoneSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum([
        "Urban Center",
        "Strategic City",
        "Cultural Center",
        "Trade Hub",
        "Border Town",
        "Regional Capital",
        "Isolated Town",
        "Border Region",
        "Desert City",
        "Tri-border Area",
        "Capital City",
        "Strategic Region",
    ]),
    image: z.string().nullable(),
    threat: ZoneThreat,
    population: z.string(),
    insurgency: z.number(),
    displaced: z.string(),
    description: z.string(),
    situation: z.string(),
    threats: z.array(z.string()),
    incidents: z.array(z.string()),
}).strict();

export const ZonesDataSchema = z.object({
    mali: z.array(ZoneSchema),
    burkinaFaso: z.array(ZoneSchema),
    niger: z.array(ZoneSchema),
    chad: z.array(ZoneSchema),
    mauritania: z.array(ZoneSchema),
}).strict();

export const ZoneCoordinatesSchema = z.record(z.string(), z.string());

// ---------- Intel ----------
export const MapIntelItemSchema = z.object({
    id: z.string(),
    type: IntelType,
    name: z.string(),
    coords: z.tuple([z.number(), z.number()]),
    details: z.string(),
}).strict();

export const MapIntelDataSchema = z.array(MapIntelItemSchema);

export const IntelReportSchema = z.object({
    headline: z.string(),
    subheadline: z.string(),
    source: z.string(),
    location: z.string(),
    threat: z.string(),
    urgency: z.string(),
    image: z.string(),
    imageCaption: z.string(),
    content: z.string(),
    sources: z.string(),
}).strict();

export const IntelReportsSchema = z.record(IntelReportSchema);

// ---------- Actors ----------
export const ActorSchema = z.object({
    name: z.string(),
    avatar: z.string(),
    faction: z.string(),
    profile: z.string(),
    stance: z.string(),
    interests: z.array(z.string()),
}).strict();

export const ActorDataSchema = z.record(ActorSchema);

export const DialogueOptionSchema = z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
    effects: z.array(z.object({
        type: EffectType,
        label: z.string(),
    }).strict()),
}).strict();

export const ActorDialogueSchema = z.object({
    avatar: z.string(),
    name: z.string(),
    title: z.string(),
    relationship: z.string(),
    message: z.string(),
    context: z.string(),
    options: z.array(DialogueOptionSchema),
}).strict();

export const ActorDialoguesSchema = z.record(ActorDialogueSchema);

// ---------- Status Report Templates ----------
export const StatusReportTemplateSchema = z.object({
    title: z.string(),
    summary: z.string(),
    effects: z.array(z.object({
        label: z.string(),
        type: EffectType,
    }).strict()),
}).strict();

export const StatusReportTemplatesSchema = z.object({
    military: StatusReportTemplateSchema,
    diplomatic: StatusReportTemplateSchema,
    humanitarian: StatusReportTemplateSchema,
}).strict();

// ---------- Zone Actor Support ----------
export const TerritoryKeyActorsSchema = z.record(
    z.array(z.string())
);

export const SupportActorSchema = z.object({
    name: z.string(),
    role: z.string(),
    impact: z.string(),
}).strict();

export const SupportActorsByTerritorySchema = z.record(
    z.array(SupportActorSchema)
);

export const ZoneActorPresenceSchema = z.record(z.string());
