import { useCallback, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore, type ModalKind } from '../../state/uiStore'
import { useSessionStore } from '../../state/sessionStore'
import type {
  ActorData,
  ActorSentiment,
  ActionDefinition,
  ActionTarget,
  DialogueChoiceData,
  DialogueData,
  EndingType,
  Metrics,
  Resources,
  StrategicValue,
  TerritoryKey,
  TerritoryState,
  ZoneData,
  ZoneState,
  ZoneType,
} from '../../state/types'
import {
  relationshipLabelFromScore,
  resolveActionDescription,
  resolveActionName,
  resolveActorData,
  resolveActorName,
  resolveActorTitle,
  resolveIntelReport,
  resolveLocalizedText,
  resolveTerritoryName,
  resolveZoneName,
} from '../../state/selectors'
import { executeActionWithLog, getResolvedCost, validateAction } from '../../systems/actionResolver'
import { executeDialogueChoice, getActorDialogueAvailability, isActorActive } from '../../systems/dialogueResolver'
import { markIntelReportRead } from '../../systems/intelResolver'
import { describeEndingOutcome, describeFailReason, getActFromTurn } from '../../systems/turnEngine'
import { GameError } from '../../state/types'
import { SessionManagerBody } from './SessionManagerBody'

const BACKDROP_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
} as const

const MODAL_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '1.5rem',
  maxWidth: '90vw',
  maxHeight: '90vh',
  width: 'min(760px, 90vw)',
  overflow: 'auto',
  boxShadow: 'var(--shadow-lg)',
} as const

function modalTitle(modal: ModalKind): string {
  if (modal === 'onboarding_loading') return 'Initializing'
  if (modal === 'session_manager') return 'Sessions'
  if (modal === 'dossier') return 'Dossier'
  if (modal === 'dossier_article') return 'Dossier article'
  if (modal === 'relationship_matrix') return 'Relationship matrix'
  if (modal === 'action_config') return 'Take Action'
  if (modal === 'territory_overview') return 'Territory overview'
  if (modal === 'zone_list') return 'Zone list'
  if (modal === 'zone_detail') return 'Zone detail'
  if (modal === 'intel_report') return 'Intel report'
  if (modal === 'actor_profile') return 'Actor profile'
  if (modal === 'player_profile') return 'Player profile'
  if (modal === 'dialogue') return 'Dialogue'
  if (modal === 'act_briefing') return 'Act briefing'
  if (modal === 'campaign_outcome') return 'Campaign outcome'
  if (modal === 'status_report') return 'Status report'
  if (modal === 'mission_brief') return 'Mission brief'
  if (modal === 'credits') return 'Credits'
  if (modal === 'leaderboard') return 'Leaderboard'
  return 'Modal'
}

type LoadedContent = NonNullable<ReturnType<typeof useGameStore.getState>['state']['content']>
type CutsceneEntry = LoadedContent['cutscenes']['cutscenes'][number]
type StoreState = ReturnType<typeof useGameStore.getState>['state']

function territoryFromState(
  territoryState: Record<TerritoryKey, TerritoryState> | undefined,
  territoryKey: string | null
): TerritoryState | undefined {
  if (!territoryState || !territoryKey) return undefined
  if (!Object.prototype.hasOwnProperty.call(territoryState, territoryKey)) return undefined
  return territoryState[territoryKey as TerritoryKey]
}

function SectionTitle({ children }: { children: ReactNode }): ReactNode {
  return (
    <h3 style={{ margin: '0 0 0.4rem', color: 'var(--gold)', fontSize: '0.95rem', letterSpacing: '0.01em' }}>
      {children}
    </h3>
  )
}

const TERRITORY_FLAG_FALLBACK: Record<TerritoryKey, string> = {
  mali: '/assets/flags/Flag_of_Mali.svg',
  burkina_faso: '/assets/flags/Flag_of_Burkina_Faso.svg',
  niger: '/assets/flags/Flag_of_Niger.svg',
  chad: '/assets/flags/Flag_of_Chad.svg',
  mauritania: '/assets/flags/Flag_of_Mauritania.svg',
}

const RELATIONSHIP_ACTOR_TERRITORY_MAP: Partial<Record<string, TerritoryKey>> = {
  junta_burkina_traore: 'burkina_faso',
  junta_mali: 'mali',
  junta_niger: 'niger',
  civil_society_konate: 'burkina_faso',
  community_dogon: 'mali',
  community_fulani: 'mali',
  insurgent_splinter: 'mali',
}

const RELATIONSHIP_INSTITUTION_SCOPE_MAP: Partial<Record<string, 'Regional' | 'Continental'>> = {
  regional_ecowas: 'Regional',
  regional_aes: 'Regional',
  external_donors: 'Continental',
}

function normalizeAssetSrc(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  return path.startsWith('/') ? path : `/${path}`
}

function resolveTerritoryFlagPaths(
  territoryKey: string,
  territoryFlagUrl: string | null | undefined
): { primarySrc: string | null; fallbackSrc: string | null } {
  const fallbackFromMap = Object.prototype.hasOwnProperty.call(TERRITORY_FLAG_FALLBACK, territoryKey)
    ? TERRITORY_FLAG_FALLBACK[territoryKey as TerritoryKey]
    : null
  const primaryFromData = normalizeAssetSrc(territoryFlagUrl)
  const fallbackSrc = normalizeAssetSrc(fallbackFromMap)
  return {
    primarySrc: primaryFromData ?? fallbackSrc,
    fallbackSrc,
  }
}

function handleFlagImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget
  const fallbackSrc = image.dataset.fallbackSrc ?? ''
  const currentSrc = image.getAttribute('src') ?? ''
  if (!fallbackSrc || currentSrc === fallbackSrc) {
    image.style.display = 'none'
    return
  }
  image.setAttribute('src', fallbackSrc)
}

type ZoneImageAsset = {
  src: string
  dedicated: boolean
}

/* Deterministic zone_id -> image mapping using current public/img assets. */
const ZONE_IMAGE_ASSETS: Record<string, ZoneImageAsset> = {
  mopti: { src: '/img/Mali/Mopti Trade Hub - Mali.png', dedicated: true },
  segou: { src: '/img/Mali/Goundam Urban Center - Mali.png', dedicated: false },
  timbuktu: { src: '/img/Mali/Timbuktu Cultural Center - Mali.png', dedicated: true },
  gao: { src: '/img/Mali/Kidal Strategic City - Mali.png', dedicated: false },
  bamako: { src: '/img/Mali/Goundam Urban Center - Mali.png', dedicated: false },
  burkina_north: { src: '/img/Burkina Faso/Burkina North - Burkina Faso.png', dedicated: true },
  burkina_east: { src: '/img/Burkina Faso/Burkina East - Burkina Faso.png', dedicated: true },
  ouagadougou: { src: '/img/Burkina Faso/Ouagadougou - Burkina Faso.png', dedicated: true },
  niger_west: { src: '/img/Niger/Agadez Desert City - Niger.png', dedicated: false },
  niamey: { src: '/img/Niger/Niamey - Niger.png', dedicated: true },
  niger_south: { src: '/img/Niger/Niger South - Niger.png', dedicated: true },
  lake_chad: { src: '/img/Chad/Lake Chad Basin Strategic Region - Chad.png', dedicated: true },
  ndjamena: { src: "/img/Chad/N'Djamena Capital City - Chad.png", dedicated: true },
  mauritania_south: { src: '/img/Mauritania/Mauritania South - Mauritania.png', dedicated: true },
  nouakchott: { src: '/img/Mauritania/Nouakchott Capital City - Mauritania.png', dedicated: true },
}

/* Deterministic actor_present -> avatar mapping for zone key-actor cards. */
const ACTOR_PRESENT_AVATAR_MAP: Record<string, string | null> = {
  'Boko Haram remnants': '/assets/actors/Boko Haram Remnants.png',
  'Border communities': '/assets/actors/Border Communities.png',
  'Burkina Faso security forces': '/assets/actors/Capt. Ousmane Traore Burkina Faso Junta.png',
  'Chad military forces': '/assets/actors/Amb. Halima Djerma Chad Transitional Government.png',
  'Civil society coalitions': '/assets/actors/Amina Ouedraogo Burkina Civil Society Network.png',
  'Displaced civilians in northern camps': '/assets/actors/Northern Camp Civilians.png',
  'Displaced fishing communities': '/assets/actors/Displaced Fishing Communities.png',
  'Displaced rural communities': '/assets/actors/Border Communities.png',
  'Dogon self-defense militias': '/assets/actors/Dogon Self-Defense.png',
  'ECOWAS envoys': '/assets/actors/ECOWAS Commission.png',
  'ECOWAS leadership': '/assets/actors/ECOWAS Commission.png',
  'Fulani Community': '/assets/actors/Fulani Community.png',
  'Fulani community leaders': '/assets/actors/Fulani Leaders.png',
  "General Ibrahim Traore's government": '/assets/actors/Capt. Ousmane Traore Burkina Faso Junta.png',
  'ISGS': '/assets/actors/ISGS Elements.png',
  'ISGS elements': '/assets/actors/ISGS Elements.png',
  'JNIM': '/assets/actors/JNIM.png',
  'Kanuri community militias': '/assets/actors/Kanuri Militias.png',
  'Mali Transitional Government': '/assets/actors/Col. Assimi Go%C3%AFta.png',
  'Malian government forces': '/assets/actors/Col. Assimi Go%C3%AFta.png',
  'Malian refugees': '/assets/actors/Malian Refugees.png',
  'Mauritania Security Directorate': '/assets/actors/Minister Lamine Ould Mauritania Security Directorate.png',
  'Mauritanian security services': '/assets/actors/Minister Lamine Ould Mauritania Security Directorate.png',
  'National security forces': '/assets/actors/Gen. Abdou Karim Niger Transitional Council.png',
  'Niger security forces': '/assets/actors/Gen. Abdou Karim Niger Transitional Council.png',
  'Niger Transitional Government': '/assets/actors/Gen. Abdou Karim Niger Transitional Council.png',
  'Refugee communities': '/assets/actors/Malian Refugees.png',
  'Regional intelligence partners': '/assets/actors/AU Commissioner.png',
  'Regional peacekeeping partners': '/assets/actors/AU Commissioner.png',
  'Volunteers for Defense of Homeland (VDP)': '/assets/actors/VDP (Burkina Faso).png',
  'Wagner Group': '/assets/actors/Wagner Group.png',
}

function keyActorAvatarForName(actorName: string): string | null {
  return ACTOR_PRESENT_AVATAR_MAP[actorName] ?? null
}

function formatPopulationCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return value.toString()
}

type ZoneThreatBand = 'critical' | 'high' | 'moderate' | 'low'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  capital: 'Capital',
  conflict_hotspot: 'Conflict Hotspot',
  border_region: 'Border Region',
  remote_contested: 'Remote / Contested',
  humanitarian_crisis: 'Humanitarian Crisis',
  urban_center: 'Urban Center',
}

const STRATEGIC_VALUE_LABELS: Record<StrategicValue, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function zoneThreatBand(threatLevel: number): ZoneThreatBand {
  if (threatLevel >= 75) return 'critical'
  if (threatLevel >= 50) return 'high'
  if (threatLevel >= 25) return 'moderate'
  return 'low'
}

function zoneThreatLabel(band: ZoneThreatBand): string {
  if (band === 'critical') return 'Critical'
  if (band === 'high') return 'High'
  if (band === 'moderate') return 'Moderate'
  return 'Low'
}

function zoneCardToneClass(band: ZoneThreatBand): 'critical' | 'stable' | null {
  if (band === 'critical') return 'critical'
  if (band === 'moderate' || band === 'low') return 'stable'
  return null
}

function zoneTypeLabel(zoneType: ZoneType | undefined): string {
  if (!zoneType) return 'Operational Zone'
  return ZONE_TYPE_LABELS[zoneType] ?? 'Operational Zone'
}

function normalizeTextLookup(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const ZONE_ACTOR_ALIAS_RULES: ReadonlyArray<{ pattern: RegExp; actorKey: string }> = [
  { pattern: /\bmali transitional government\b|\bmalian government forces\b/, actorKey: 'junta_mali' },
  {
    pattern: /\bniger transitional government\b|\bniger security forces\b|\bnational security forces\b/,
    actorKey: 'junta_niger',
  },
  {
    pattern: /\btraor\b|\bburkina faso security forces\b|\bvdp\b|\bvolunteers for defense of homeland\b/,
    actorKey: 'junta_burkina_traore',
  },
  { pattern: /\becowas\b/, actorKey: 'regional_ecowas' },
  { pattern: /\bcivil society\b/, actorKey: 'civil_society_konate' },
  { pattern: /\bdogon\b/, actorKey: 'community_dogon' },
  { pattern: /\bfulani\b/, actorKey: 'community_fulani' },
  { pattern: /\bwagner\b/, actorKey: 'external_wagner' },
  { pattern: /\bjnim\b|\bisgs\b|\bboko\b|\binsurgent\b/, actorKey: 'insurgent_networks' },
  { pattern: /\bregional intelligence partners\b|\bmauritania security\b/, actorKey: 'au_intelligence_directorate' },
]

function findActorByDisplayName(
  actors: ActorData[],
  content: LoadedContent,
  actorName: string
): ActorData | undefined {
  const normalizedName = normalizeTextLookup(actorName)
  if (!normalizedName) return undefined
  return actors.find((actor) => {
    const resolved = normalizeTextLookup(resolveActorName(content, actor.actor_key))
    return resolved === normalizedName || resolved.includes(normalizedName) || normalizedName.includes(resolved)
  })
}

function resolveCanonicalActorForZoneName(
  actors: ActorData[],
  content: LoadedContent,
  actorName: string
): ActorData | undefined {
  const directMatch = findActorByDisplayName(actors, content, actorName)
  if (directMatch) return directMatch
  const normalizedName = normalizeTextLookup(actorName)
  if (!normalizedName) return undefined
  const alias = ZONE_ACTOR_ALIAS_RULES.find((rule) => rule.pattern.test(normalizedName))
  if (!alias) return undefined
  return actors.find((actor) => actor.actor_key === alias.actorKey)
}

function formatCoordinate(value: number, positiveLabel: string, negativeLabel: string): string {
  const label = value >= 0 ? positiveLabel : negativeLabel
  return `${Math.abs(value).toFixed(2)} ${label}`
}

function formatZoneCoordinates(zoneData: ZoneData | undefined): string {
  if (!zoneData) return 'Coordinates unavailable'
  return `${formatCoordinate(zoneData.coords.lat, 'N', 'S')}, ${formatCoordinate(zoneData.coords.lon, 'E', 'W')}`
}

function zoneCardDescription(zone: ZoneState, zoneData: ZoneData | undefined): string {
  const strategicLabel = zoneData ? STRATEGIC_VALUE_LABELS[zoneData.strategic_value] : null
  const threatSummary = `${zone.threat_level}/100 threat pressure`
  const displacedSummary =
    zone.displaced > 0
      ? `${formatPopulationCompact(zone.displaced)} displaced civilians tracked`
      : 'no displacement currently logged'
  const strategicSummary = strategicLabel ? `${strategicLabel}-value zone` : 'active operational zone'
  return `${strategicSummary} with ${threatSummary}; ${displacedSummary}.`
}

function inferActorRole(content: LoadedContent, actorData: ActorData | undefined, actorName: string): string {
  if (actorData) return resolveActorTitle(content, actorData.actor_key)
  if (/government|forces|army|junta|military/i.test(actorName)) return 'State security actor'
  if (/jnim|isgs|insurgent|boko/i.test(actorName)) return 'Armed non-state actor'
  if (/community|civil|leader|society/i.test(actorName)) return 'Community stakeholder'
  return 'Local stakeholder'
}

function describeActorProfile(actor: ActorData): string {
  const typeLabel = formatTokenLabel(actor.type)
  const factionLabel = formatTokenLabel(actor.faction)
  const profileLabel = formatTokenLabel(actor.profile)
  const relationshipMode = actor.relationship_tracked
    ? 'Relationship effects are tracked in campaign state.'
    : 'Relationship effects are informational only for this actor.'
  return `${typeLabel} actor aligned with ${factionLabel}. Profile: ${profileLabel}. ${relationshipMode}`
}

function actorInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
  if (tokens.length === 0) return '?'
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase()
  return `${tokens[0]!.charAt(0)}${tokens[tokens.length - 1]!.charAt(0)}`.toUpperCase()
}

type RelationshipLocation = {
  kind: 'flag' | 'logo' | 'fallback'
  label: string
  src: string | null
  fallbackSrc: string | null
}

function relationshipLocationCode(label: string): string {
  const tokens = label
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
  if (tokens.length === 0) return '??'
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase()
  return `${tokens[0]!.charAt(0)}${tokens[1]!.charAt(0)}`.toUpperCase()
}

function resolveRelationshipLocation(content: LoadedContent, actor: ActorData): RelationshipLocation {
  const isRegionalOrInstitutional = actor.type === 'institutional' || actor.actor_key.startsWith('regional_')
  const logoSrc = normalizeAssetSrc(actor.portrait_url)

  if (isRegionalOrInstitutional) {
    const scope = RELATIONSHIP_INSTITUTION_SCOPE_MAP[actor.actor_key] ??
      (actor.actor_key.startsWith('regional_') ? 'Regional' : 'Continental')
    return {
      kind: 'logo',
      label: scope,
      src: logoSrc,
      fallbackSrc: null,
    }
  }

  const territoryKey = RELATIONSHIP_ACTOR_TERRITORY_MAP[actor.actor_key]
  if (territoryKey) {
    const territory = content.territories.territories.find((item) => item.territory_key === territoryKey)
    const territoryLabel = resolveTerritoryName(content, territoryKey)
    const { primarySrc, fallbackSrc } = resolveTerritoryFlagPaths(territoryKey, territory?.flag_url)
    return {
      kind: 'flag',
      label: territoryLabel,
      src: primarySrc,
      fallbackSrc,
    }
  }

  return {
    kind: logoSrc ? 'logo' : 'fallback',
    label: 'Transnational',
    src: logoSrc,
    fallbackSrc: null,
  }
}

function RelationshipLocationBadge({ location }: { location: RelationshipLocation }): ReactNode {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [location.src, location.fallbackSrc, location.label, location.kind])

  const showImage = Boolean(location.src) && !imageFailed

  return (
    <div className="relationship-matrix-location">
      <span className={`relationship-matrix-location-badge ${location.kind}${showImage ? ' has-image' : ''}`}>
        {showImage && location.src ? (
          <img
            src={location.src}
            alt={`${location.label} ${location.kind === 'flag' ? 'flag' : 'logo'}`}
            loading="lazy"
            onError={(event) => {
              const image = event.currentTarget
              const fallbackSrc = location.fallbackSrc ?? ''
              const currentSrc = image.getAttribute('src') ?? ''
              if (fallbackSrc && currentSrc !== fallbackSrc) {
                image.setAttribute('src', fallbackSrc)
                return
              }
              setImageFailed(true)
            }}
          />
        ) : (
          <span className="relationship-matrix-location-code">{relationshipLocationCode(location.label)}</span>
        )}
      </span>
      <span className="relationship-matrix-location-label">{location.label}</span>
    </div>
  )
}

function formatBaselineRelationship(score: number | null): string {
  if (score === null) return 'N/A'
  return `${relationshipLabelFromScore(score)} (${score})`
}

function relationshipToneClass(
  label: ActorSentiment['relationship_label']
): 'positive' | 'negative' | 'neutral' {
  if (label === 'allied' || label === 'cooperative') return 'positive'
  if (label === 'hostile' || label === 'adversarial') return 'negative'
  return 'neutral'
}

function ActorPortrait({ actor, name }: { actor: ActorData; name: string }): ReactNode {
  const portraitSrc = normalizeAssetSrc(actor.portrait_url)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [actor.actor_key, portraitSrc])

  const showImage = Boolean(portraitSrc) && !imageFailed

  return (
    <div className={`actor-profile-portrait${showImage ? ' has-image' : ''}`} aria-hidden={showImage ? 'false' : 'true'}>
      {showImage && portraitSrc ? (
        <img
          className="actor-profile-portrait-image"
          src={portraitSrc}
          alt={`${name} portrait`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="actor-profile-portrait-fallback">{actorInitials(name)}</span>
      )}
    </div>
  )
}

function zoneSituationReport(
  content: LoadedContent,
  zone: ZoneState,
  zoneData: ZoneData | undefined,
  territoryName: string
): string {
  const zoneName = resolveZoneName(content, zone.zone_id)
  const typeLabel = zoneTypeLabel(zoneData?.zone_type)
  const strategicLabel = zoneData ? STRATEGIC_VALUE_LABELS[zoneData.strategic_value].toLowerCase() : 'active'
  const topThreat = zone.threats[0]
  const incidentCount = zone.incidents.length
  const displacementText =
    zone.displaced > 0
      ? `${formatPopulationCompact(zone.displaced)} displaced civilians are currently tracked.`
      : 'No displacement has been formally logged in this cycle.'
  const threatText = topThreat
    ? `Primary concern is ${topThreat.toLowerCase()}.`
    : `Threat pressure remains elevated at ${zone.threat_level}/100.`
  const incidentText =
    incidentCount > 0
      ? `${incidentCount} incident${incidentCount === 1 ? '' : 's'} reported in the latest field telemetry.`
      : 'No incidents have been logged yet, but monitoring remains active.'
  return `${zoneName} in ${territoryName} is categorized as a ${typeLabel.toLowerCase()} with ${strategicLabel} strategic value. ${threatText} ${incidentText} ${displacementText}`
}

type RecommendedZoneAction = { title: string; detail: string }

function recommendedZoneActions(
  content: LoadedContent,
  zone: ZoneState,
  zoneData: ZoneData | undefined
): RecommendedZoneAction[] {
  const actions: RecommendedZoneAction[] = []

  if (zone.threat_level >= 75) {
    actions.push({
      title: 'Emergency Deployment',
      detail: 'Deploy rapid-response security assets to contain escalation and protect population centers.',
    })
  } else if (zone.threat_level >= 50) {
    actions.push({
      title: 'Focused Security Operation',
      detail: 'Coordinate patrols and intelligence-led interdiction to reduce active insurgent pressure.',
    })
  } else {
    actions.push({
      title: 'Preventive Stabilization',
      detail: 'Sustain visible security presence and local mediation to prevent threat rebound.',
    })
  }

  if (zone.displaced >= 20_000) {
    actions.push({
      title: 'Humanitarian Corridors',
      detail: `Prioritize protected aid routes for approximately ${formatPopulationCompact(zone.displaced)} displaced civilians.`,
    })
  }

  if (zone.threats.length > 0) {
    const leadThreat = zone.threats[0] ?? 'active threat networks'
    actions.push({
      title: 'Threat Disruption',
      detail: `Target ${leadThreat.toLowerCase()} through synchronized intelligence and local security operations.`,
    })
  }

  if (zoneData && zoneData.adjacent_zones.length > 0) {
    const adjacentNames = zoneData.adjacent_zones
      .slice(0, 2)
      .map((adjacentZoneId) => resolveZoneName(content, adjacentZoneId))
      .join(', ')
    actions.push({
      title: 'Cross-Zone Coordination',
      detail: `Synchronize planning with adjacent zones (${adjacentNames}) to limit spillover effects.`,
    })
  }

  if (zoneData?.strategic_value === 'critical') {
    actions.push({
      title: 'Infrastructure Protection',
      detail: 'Harden governance and logistics nodes to preserve institutional control and service continuity.',
    })
  }

  if (actions.length < 4) {
    actions.push({
      title: 'Intelligence Gathering',
      detail: 'Increase HUMINT and reconnaissance coverage to improve threat attribution and response timing.',
    })
  }

  return actions.slice(0, 4)
}

function TerritoryOverviewBody(): ReactNode {
  const content = useGameStore((s) => s.state.content)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)

  const effectiveTerritoryKey =
    selectedTerritoryKey ?? (selectedZoneId ? zoneState?.[selectedZoneId]?.territory_key ?? null : null)

  if (!content || !territoryState || !zoneState) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading territory data...</p>
  }

  if (!effectiveTerritoryKey) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a territory on the map to view details.</p>
  }

  const territory = territoryFromState(territoryState, effectiveTerritoryKey)
  if (!territory) {
    return <p style={{ color: 'var(--text-secondary)' }}>No runtime state found for this territory.</p>
  }

  const territoryContent = content.territories.territories.find(
    (item) => item.territory_key === territory.territory_key
  )
  const zones = Object.values(zoneState)
    .filter((zone) => zone.territory_key === territory.territory_key)
    .sort((a, b) => b.threat_level - a.threat_level)
  const criticalZoneCount = zones.filter((zone) => zone.threat_level >= 75).length
  const highZoneCount = zones.filter((zone) => zone.threat_level >= 50 && zone.threat_level < 75).length
  const totalDisplaced = zones.reduce((sum, zone) => sum + zone.displaced, 0)
  const totalIncidents = zones.reduce((sum, zone) => sum + zone.incidents.length, 0)
  const topZone = zones[0]
  const topZoneName = topZone ? resolveZoneName(content, topZone.zone_id) : null
  const topThreatLabel = topZone?.threats[0] ?? null
  const stabilityDelta = territory.stability - territory.insurgency
  const statusLabel = territory.status.toUpperCase()
  const topHotspotSummary = topZone && topZoneName
    ? `${topZoneName} (${topZone.threat_level}/100${topThreatLabel ? `, ${topThreatLabel}` : ''})`
    : 'No hotspot identified from current telemetry.'
  const displacementSummary = totalDisplaced > 0
    ? `${totalDisplaced.toLocaleString()} displaced civilians`
    : 'No displacement currently logged'
  const incidentSummary = totalIncidents > 0
    ? `${totalIncidents} active incident${totalIncidents === 1 ? '' : 's'}`
    : 'No active incident logs'
  const currentSituationLead = `${territory.name} is now in ${statusLabel} status with stability ${territory.stability}/100 and insurgency ${territory.insurgency}/100.`
  const currentSituationFollowup = stabilityDelta >= 0
    ? `Stability holds a ${Math.abs(stabilityDelta)}-point edge over insurgency pressure, but zone volatility remains active.`
    : `Insurgency pressure exceeds stability by ${Math.abs(stabilityDelta)} points, requiring coordinated containment and recovery.`
  const currentSituationOps = criticalZoneCount > 0
    ? `${criticalZoneCount} zone${criticalZoneCount === 1 ? '' : 's'} are in critical threat, with ${highZoneCount} additional high-threat zone${highZoneCount === 1 ? '' : 's'}.`
    : highZoneCount > 0
      ? `No critical zones are flagged, but ${highZoneCount} high-threat zone${highZoneCount === 1 ? '' : 's'} remain under sustained pressure.`
      : 'No critical or high-threat zones are currently flagged.'

  const { primarySrc: flagSrc, fallbackSrc: fallbackFlag } = resolveTerritoryFlagPaths(
    territory.territory_key,
    territoryContent?.flag_url
  )

  const keyChallenges = [
    {
      title: 'Security',
      detail: topZone && topZoneName
        ? `${topZoneName} is the lead hotspot at ${topZone.threat_level}/100${topThreatLabel ? ` (${topThreatLabel})` : ''}.`
        : 'No lead hotspot is currently identified from zone telemetry.',
    },
    {
      title: 'Governance',
      detail: `Territory stability (${territory.stability}/100) is still trailing insurgency pressure (${territory.insurgency}/100).`,
    },
    {
      title: 'Humanitarian',
      detail: totalDisplaced > 0
        ? `${totalDisplaced.toLocaleString()} displaced civilians are currently tracked in this territory.`
        : totalIncidents > 0
          ? `${totalIncidents} active incident${totalIncidents === 1 ? '' : 's'} are logged despite no displacement record.`
          : 'No displacement is currently recorded, but incident monitoring must continue.',
    },
    {
      title: 'Operational Scope',
      detail: `${zones.length} zone${zones.length === 1 ? '' : 's'} require synchronized planning and follow-up.`,
    },
  ]

  return (
    <div className="territory-overview">
      <div className="territory-overview-header">
        <div className="territory-overview-flag">
          {flagSrc ? (
            <img
              src={flagSrc}
              alt={`${territory.name} flag`}
              data-fallback-src={fallbackFlag ?? ''}
              onError={handleFlagImageError}
            />
          ) : (
            <span>{territory.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="territory-overview-heading">
          <h3 className="territory-overview-title">{territory.name}</h3>
          <div className="territory-overview-subtitle">Territory Overview</div>
        </div>
      </div>

      <div className="territory-stats">
        <div className="territory-stat">
          <div className="territory-stat-label">Stability</div>
          <div className="territory-stat-value">{territory.stability}</div>
        </div>
        <div className="territory-stat">
          <div className="territory-stat-label">Insurgency</div>
          <div className="territory-stat-value">{territory.insurgency}</div>
        </div>
        <div className="territory-stat">
          <div className="territory-stat-label">Population</div>
          <div className="territory-stat-value">{formatPopulationCompact(territory.population)}</div>
        </div>
        <div className="territory-stat">
          <div className="territory-stat-label">Critical Zones</div>
          <div className="territory-stat-value">{criticalZoneCount}</div>
        </div>
      </div>

      <div className="territory-overview-section">
        <h4 className="territory-overview-section-title">Current Situation</h4>
        <div className="territory-situation-meta">
          <div className={`territory-situation-state territory-situation-state--status territory-status-${territory.status}`}>
            <span className="territory-situation-label">Status</span>
            <span className="territory-situation-value">{statusLabel}</span>
          </div>
          <div className="territory-situation-state">
            <span className="territory-situation-label">Hotspot</span>
            <span className="territory-situation-value">{topHotspotSummary}</span>
          </div>
          <div className="territory-situation-state">
            <span className="territory-situation-label">Incidents</span>
            <span className="territory-situation-value">{incidentSummary}</span>
          </div>
          <div className="territory-situation-state">
            <span className="territory-situation-label">Displacement</span>
            <span className="territory-situation-value">{displacementSummary}</span>
          </div>
        </div>
        <p className="territory-overview-section-text">{currentSituationLead}</p>
        <p className="territory-overview-section-text">{currentSituationFollowup}</p>
        <p className="territory-overview-section-text">{currentSituationOps}</p>
      </div>

      <div className="territory-overview-section">
        <h4 className="territory-overview-section-title">Key Challenges</h4>
        <ul className="territory-overview-list">
          {keyChallenges.map((challenge) => (
            <li key={challenge.title}>
              <strong>{challenge.title}:</strong> {challenge.detail}
            </li>
          ))}
        </ul>
      </div>

      <div className="territory-overview-actions">
        <button type="button" className="action-config-confirm" onClick={() => openModal('zone_list')}>
          Investigate Zones
        </button>
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function ZoneListBody(): ReactNode {
  const content = useGameStore((s) => s.state.content)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)

  if (!content || !zoneState) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading zone list...</p>
  }

  const effectiveTerritoryKey =
    selectedTerritoryKey ?? (selectedZoneId ? zoneState[selectedZoneId]?.territory_key ?? null : null)

  if (!effectiveTerritoryKey) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a territory first to list its zones.</p>
  }

  const territoryName = resolveTerritoryName(content, effectiveTerritoryKey)
  const territoryContent = content.territories.territories.find(
    (item) => item.territory_key === effectiveTerritoryKey
  )
  const { primarySrc: flagSrc, fallbackSrc: fallbackFlag } = resolveTerritoryFlagPaths(
    effectiveTerritoryKey,
    territoryContent?.flag_url
  )
  const zoneDataById = new Map(content.zones.zones.map((zone) => [zone.zone_id, zone]))
  const zones = Object.values(zoneState)
    .filter((zone) => zone.territory_key === effectiveTerritoryKey)
    .sort((a, b) => b.threat_level - a.threat_level)

  if (zones.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No zones available for this territory.</p>
  }

  return (
    <div className="zones-modal-shell">
      <button type="button" className="zone-modal-close" onClick={closeModal} aria-label="Close zone list">
        x
      </button>
      <div className="zones-modal-header zones-modal-header--with-flag">
        <div className="zones-modal-header-row">
          <div className="zones-modal-flag">
            {flagSrc ? (
              <img
                src={flagSrc}
                alt={`${territoryName} flag`}
                loading="lazy"
                data-fallback-src={fallbackFlag ?? ''}
                onError={handleFlagImageError}
              />
            ) : (
              <span>{territoryName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="zones-modal-heading">
            <h3 className="zones-modal-title">{territoryName} - Zones of Interest</h3>
            <div className="zones-modal-subtitle">Strategic Analysis by Region</div>
          </div>
        </div>
      </div>

      <div className="zones-grid">
        {zones.map((zone) => {
          const zoneData = zoneDataById.get(zone.zone_id)
          const threatBand = zoneThreatBand(zone.threat_level)
          const toneClass = zoneCardToneClass(threatBand)
          const threatClass = threatBand === 'low' || threatBand === 'moderate' ? 'stable' : threatBand
          const incidents = zone.incidents.length > 0 ? zone.incidents.slice(0, 3) : ['No incidents logged']

          return (
            <button
              key={zone.zone_id}
              type="button"
              className={`zone-card${toneClass ? ` ${toneClass}` : ''}`}
              onClick={() => {
                setSelectedZone(zone.zone_id)
                openModal('zone_detail')
              }}
            >
              <div className="zone-body">
                <div className="zone-header">
                  <div>
                    <div className="zone-name">{resolveZoneName(content, zone.zone_id)}</div>
                    <div className="zone-type">{zoneTypeLabel(zoneData?.zone_type)}</div>
                  </div>
                  <div className={`zone-threat ${threatClass}`}>{zoneThreatLabel(threatBand)}</div>
                </div>

                <div className="zone-info">
                  <div className="zone-info-item">
                    <div className="zone-info-label">Population</div>
                    <div className="zone-info-value">{formatPopulationCompact(zone.population)}</div>
                  </div>
                  <div className="zone-info-item">
                    <div className="zone-info-label">Insurgency</div>
                    <div className="zone-info-value">{zone.insurgency}/100</div>
                  </div>
                  <div className="zone-info-item">
                    <div className="zone-info-label">Displaced</div>
                    <div className="zone-info-value">{formatPopulationCompact(zone.displaced)}</div>
                  </div>
                </div>

                <div className="zone-description">{zoneCardDescription(zone, zoneData)}</div>

                <div className="zone-incidents">
                  {incidents.map((incident, index) => (
                    <span className="incident-tag" key={`${zone.zone_id}-incident-${index}`}>
                      {incident}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="zone-modal-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('territory_overview')}>
          Back to Territory
        </button>
        <button type="button" className="action-config-confirm" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function ZoneDetailBody(): ReactNode {
  const content = useGameStore((s) => s.state.content)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const actorSentiments = useGameStore((s) => s.state.actor_sentiments) as Record<string, ActorSentiment> | undefined
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedActorKey = useUiStore((s) => s.setSelectedActorKey)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)

  if (!content || !zoneState) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading zone detail...</p>
  }

  if (!selectedZoneId) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a zone on the map to inspect details.</p>
  }

  const zone = zoneState[selectedZoneId]
  if (!zone) {
    return <p style={{ color: 'var(--text-secondary)' }}>Selected zone was not found in runtime state.</p>
  }

  const zoneData = content.zones.zones.find((entry) => entry.zone_id === zone.zone_id)
  const zoneName = resolveZoneName(content, zone.zone_id)
  const zoneImageAsset = ZONE_IMAGE_ASSETS[zone.zone_id]
  const zoneImageSrc = zoneImageAsset?.src
  const territoryName = resolveTerritoryName(content, zone.territory_key)
  const threatBand = zoneThreatBand(zone.threat_level)
  const threatClass = threatBand === 'low' || threatBand === 'moderate' ? 'stable' : threatBand
  const actorEntries = content.actors.actors
  const dialogueActorKeySet = new Set(content.dialogues.dialogues.map((dialogue) => dialogue.actor_key))
  const keyActorLookup = new Set(zone.actors_present.map((name) => normalizeTextLookup(name)))
  const isProfileOnlyActor = (actor: ActorData): boolean =>
    !actor.relationship_tracked && !dialogueActorKeySet.has(actor.actor_key)
  const openActorProfileFromZone = (actorKey: string): void => {
    setSelectedActorKey(actorKey)
    openModal('actor_profile')
  }

  const keyActors = zone.actors_present.map((actorName) => {
    const actorData = resolveCanonicalActorForZoneName(actorEntries, content, actorName)
    const relationshipScore = actorData ? actorSentiments?.[actorData.actor_key] : undefined
    const profileOnly = actorData ? isProfileOnlyActor(actorData) : false
    return {
      name: actorName,
      avatarSrc: keyActorAvatarForName(actorName),
      actorKey: actorData?.actor_key ?? null,
      profileOnly,
      role: inferActorRole(content, actorData, actorName),
      presence: profileOnly
        ? 'Profile briefing available'
        : relationshipScore
          ? `Relationship ${relationshipScore.relationship_score}/100`
          : zone.threat_level >= 75
            ? 'High operational influence'
            : 'Active stakeholder',
    }
  })
  const keyActorKeyLookup = new Set(
    keyActors
      .map((actor) => actor.actorKey)
      .filter((actorKey): actorKey is string => actorKey !== null)
  )
  const profileOnlyActors = Array.from(
    keyActors.reduce<Map<string, { actorKey: string; name: string; role: string }>>((acc, actor) => {
      if (!actor.profileOnly || !actor.actorKey || acc.has(actor.actorKey)) return acc
      acc.set(actor.actorKey, {
        actorKey: actor.actorKey,
        name: resolveActorName(content, actor.actorKey),
        role: resolveActorTitle(content, actor.actorKey),
      })
      return acc
    }, new Map()).values()
  )

  const supportActors = actorEntries
    .filter((actor) => actor.profile !== 'au_internal')
    .map((actor) => {
      const actorName = resolveActorName(content, actor.actor_key)
      const sentiment = actorSentiments?.[actor.actor_key]
      const impact = sentiment
        ? `Relationship: ${sentiment.relationship_label}`
        : isProfileOnlyActor(actor)
          ? 'Profile-only stakeholder'
        : actor.relationship_tracked
          ? 'Relationship tracked'
          : 'Context actor'
      return {
        actor,
        name: actorName,
        role: resolveActorTitle(content, actor.actor_key),
        impact,
      }
    })
    .filter((entry) => !keyActorLookup.has(normalizeTextLookup(entry.name)))
    .filter((entry) => !keyActorKeyLookup.has(entry.actor.actor_key))
    .sort((a, b) => Number(b.actor.relationship_tracked) - Number(a.actor.relationship_tracked))
    .slice(0, 4)

  const threatEntries = zone.threats.length > 0
    ? zone.threats
    : zone.incidents.length > 0
      ? zone.incidents.map((incident) => `Incident pressure: ${incident}`)
      : [`Threat pressure remains at ${zone.threat_level}/100 and requires monitoring.`]

  const actions = recommendedZoneActions(content, zone, zoneData)

  return (
    <div className="zone-detail-shell">
      <button type="button" className="zone-modal-close" onClick={closeModal} aria-label="Close zone detail">
        x
      </button>

      <div className="zone-image-container">
        <div className={`zone-detail-image-banner${zoneImageSrc ? ' has-image' : ''}`}>
          {zoneImageSrc ? (
            <img
              className="zone-detail-image-photo"
              src={zoneImageSrc}
              alt={`${zoneName} zone intelligence view`}
              loading="lazy"
            />
          ) : (
            <div className="zone-detail-image-placeholder">Zone Intelligence View</div>
          )}
          <div className="zone-image-coords">{formatZoneCoordinates(zoneData)}</div>
        </div>
      </div>

      <div className="zone-detail-header-row">
        <div className="zone-detail-headline">
          <h3 className="zone-detail-title">{zoneName}</h3>
          <div className="zone-detail-subtitle">
            {zoneTypeLabel(zoneData?.zone_type)} - {territoryName}
            {zoneData ? ` - ${STRATEGIC_VALUE_LABELS[zoneData.strategic_value]} Value` : ''}
          </div>
        </div>
        <div className={`zone-threat ${threatClass}`}>{zoneThreatLabel(threatBand)}</div>
      </div>

      <div className="zone-detail-stats">
        <div className="zone-detail-stat">
          <div className="zone-detail-stat-value">{formatPopulationCompact(zone.population)}</div>
          <div className="zone-detail-stat-label">Population</div>
        </div>
        <div className="zone-detail-stat">
          <div className="zone-detail-stat-value">{zone.insurgency}</div>
          <div className="zone-detail-stat-label">Insurgency</div>
        </div>
        <div className="zone-detail-stat">
          <div className="zone-detail-stat-value">{formatPopulationCompact(zone.displaced)}</div>
          <div className="zone-detail-stat-label">IDPs</div>
        </div>
      </div>

      <div className="modal-section">
        <h3 className="modal-section-title">Situation Report</h3>
        <p className="modal-text">{zoneSituationReport(content, zone, zoneData, territoryName)}</p>
      </div>

      <div className="modal-section">
        <h3 className="modal-section-title">Active Threats</h3>
        <ul className="modal-list">
          {threatEntries.map((threat, index) => (
            <li key={`${zone.zone_id}-threat-${index}`}>{threat}</li>
          ))}
        </ul>
      </div>

      <div className="modal-section">
        <h3 className="modal-section-title">Key Actors Present</h3>
        {keyActors.length === 0 ? (
          <div className="zone-actors-empty">No key actors listed.</div>
        ) : (
          <div className="zone-actors-list">
            {keyActors.map((actor) => {
              const interactive = actor.profileOnly && actor.actorKey !== null
              const baseClassName = `zone-actor-item${interactive ? ' zone-actor-item--interactive' : ''}`

              const actorBody = (
                <>
                  <div className={`zone-actor-avatar${actor.avatarSrc ? ' has-image' : ''}`}>
                    {actor.avatarSrc ? (
                      <img
                        className="zone-actor-avatar-image"
                        src={actor.avatarSrc}
                        alt={`${actor.name} avatar`}
                        loading="lazy"
                      />
                    ) : (
                      actor.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="zone-actor-info">
                    <div className="zone-actor-name">{actor.name}</div>
                    <div className="zone-actor-role">{actor.role}</div>
                    <div className="zone-actor-presence">{actor.presence}</div>
                  </div>
                </>
              )

              if (!interactive || !actor.actorKey) {
                return (
                  <div className={baseClassName} key={actor.name}>
                    {actorBody}
                  </div>
                )
              }
              const actorKey = actor.actorKey

              return (
                <button
                  type="button"
                  className={baseClassName}
                  key={actor.name}
                  onClick={() => openActorProfileFromZone(actorKey)}
                  aria-label={`Open ${actor.name} profile`}
                >
                  {actorBody}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="modal-section">
        <h3 className="modal-section-title">Profile-Only Stakeholders</h3>
        {profileOnlyActors.length === 0 ? (
          <div className="zone-support-empty">No profile-only stakeholders mapped for this zone.</div>
        ) : (
          <div className="zone-profile-actors-list">
            {profileOnlyActors.map((actor) => (
              <button
                type="button"
                className="zone-profile-actor-item"
                key={actor.actorKey}
                onClick={() => openActorProfileFromZone(actor.actorKey)}
                aria-label={`Open ${actor.name} profile`}
              >
                <div className="zone-profile-actor-name">{actor.name}</div>
                <div className="zone-profile-actor-role">{actor.role}</div>
                <div className="zone-profile-actor-cta">Open profile briefing</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="modal-section">
        <h3 className="modal-section-title">Other Actors</h3>
        {supportActors.length === 0 ? (
          <div className="zone-support-empty">No supporting actors listed.</div>
        ) : (
          <div className="zone-support-actors-list">
            {supportActors.map((actor) => (
              <div className="zone-support-actor-item" key={actor.actor.actor_key}>
                <div className="zone-support-actor-name">{actor.name}</div>
                <div className="zone-support-actor-role">{actor.role}</div>
                <div className="zone-support-actor-impact">{actor.impact}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-section">
        <h3 className="modal-section-title">Recommended Actions</h3>
        <ul className="modal-list">
          {actions.map((action) => (
            <li key={action.title}>
              <strong>{action.title}:</strong> {action.detail}
            </li>
          ))}
        </ul>
      </div>

      <div className="zone-modal-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('zone_list')}>
          Back to Zones
        </button>
      </div>
    </div>
  )
}

function StatusReportBody(): ReactNode {
  const session = useGameStore((s) => s.state.session)
  const actionLog = useGameStore((s) => s.state.action_log ?? [])
  const content = useGameStore((s) => s.state.content)

  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      <div style={{ color: 'var(--text)', fontWeight: 700 }}>Turn {session.turn} operational report</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={chipStyle}>Actions remaining {session.actions_remaining}</span>
        <span style={chipStyle}>Budget {session.resources.budget.toLocaleString()}</span>
        <span style={chipStyle}>Personnel {session.resources.personnel.toLocaleString()}</span>
        <span style={chipStyle}>Intel {session.resources.intel_points}</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        Metrics and resources are updated by confirmed actions and turn progression.
      </p>
      <div>
        <SectionTitle>Action log</SectionTitle>
        {actionLog.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actions recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {[...actionLog].slice(-8).reverse().map((entry, index) => (
              <div
                key={`${entry.turn}-${entry.action_id}-${index}`}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  background: 'var(--bg-panel)',
                  padding: '0.5rem 0.65rem',
                  display: 'grid',
                  gap: '0.3rem',
                }}
              >
                <div style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600 }}>
                  Turn {entry.turn}: {resolveActionName(content, entry.action_id)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Target: {formatTargetLabel(content, entry.target)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Resource delta: {formatResourceDelta(entry.resource_deltas)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Metric delta: {formatMetricDelta(entry.metric_deltas)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ENVOY_ROLE_SUMMARY =
  "You serve as the African Union's lead crisis negotiator and operational strategist in the Sahel. Your mandate is to coordinate regional partners, allocate limited resources, and shape outcomes that will be used to grade mission performance across security, humanitarian access, and political legitimacy."

const ENVOY_BACKGROUND_POINTS = [
  'You trained in political science at the University of Dakar, building a practical foundation in governance and public accountability.',
  'At the London School of Economics, you focused on conflict, security, and development, with emphasis on real-world policy tradeoffs.',
  'You later served as Senior Advisor to the AU Commissioner for Peace and Security, helping coordinate negotiations during high-risk moments.',
  'Your reputation was built on keeping difficult conversations moving and finding shared ground between actors who rarely trust one another.',
]

const ENVOY_MANDATE_POINTS = [
  'You are expected to balance security operations, diplomacy, and humanitarian access at the same time.',
  'You can engage both state and non-state stakeholders through authorized dialogue channels.',
  'Every decision is constrained by limited budget, personnel, political capital, and time.',
  'Your outcome is judged against campaign thresholds, so short-term gains must support long-term stability.',
]

type MissionBriefTimelineItem = {
  step: string
  title: string
  description: string
}

type MissionBriefGuidanceItem = {
  title: string
  description: string
}

const MISSION_PRIMARY_OBJECTIVES: MissionBriefTimelineItem[] = [
  {
    step: '01',
    title: 'Stabilize Critical Zones',
    description:
      'Reduce insurgency levels in high-threat zones across Mali, Burkina Faso, and Niger. Prevent collapse of urban centers under siege and protect civilians from escalating violence.',
  },
  {
    step: '02',
    title: 'Build Regional Cooperation',
    description:
      'Strengthen coordination between ECOWAS, national governments, and local actors. Navigate political tensions created by military juntas while sustaining pressure for credible transitions.',
  },
  {
    step: '03',
    title: 'Counter External Interference',
    description:
      'Address external actors that undermine African-led security frameworks. Offer credible, sovereignty-respecting alternatives that advance long-term regional stability.',
  },
  {
    step: '04',
    title: 'Protect Civilian Populations',
    description:
      'Ensure humanitarian access, prevent mass atrocity risk, and address root conflict drivers including governance failures, climate shocks, and economic marginalization.',
  },
]

const MISSION_STRATEGIC_GUIDANCE: MissionBriefGuidanceItem[] = [
  {
    title: 'Balance Multiple Priorities',
    description:
      'You cannot solve every crisis simultaneously. Focus limited actions on interventions that produce cross-territory spillover gains.',
  },
  {
    title: 'Engage Key Actors',
    description:
      'Success depends on negotiating with military leadership, community coalitions, regional bodies, and local authorities. Actor intent and leverage shift quickly.',
  },
  {
    title: 'Monitor Intelligence',
    description:
      'Use the intelligence feed and territory reports continuously. The strongest interventions are timed to emerging windows, not static assumptions.',
  },
  {
    title: 'Manage Resources',
    description:
      'Budget, political capital, personnel, and time are finite. Planned capacity building and diplomacy usually outperform repeated reactive deployments.',
  },
]

const MISSION_STRATEGIC_HINTS: MissionBriefGuidanceItem[] = [
  {
    title: 'Start with Intelligence Gathering',
    description:
      'Before major actions, investigate pressure zones to understand local dynamics. Opening moves should prioritize areas where early stabilization can cascade across neighboring zones.',
  },
  {
    title: 'Build Relationships Early',
    description:
      'Establish channels with national transition authorities, ECOWAS envoys, and community representatives in Act 1. Early trust reduces friction once escalation begins.',
  },
]

type DossierArticleId = 'wagner' | 'ecowas' | 'climate' | 'french'

type DossierArticle = {
  id: DossierArticleId
  masthead: string
  headline: string
  subheadline: string
  date: string
  location: string
  source: string
  urgencyBadge: string | null
  image: string
  imageCaption: string
  feedTime: string
  feedSummary: string
  contentHtml: string
  sources: string
}

const DOSSIER_ARTICLES: DossierArticle[] = [
  {
    id: 'wagner',
    masthead: 'Sahel Intelligence Brief',
    headline: 'Wagner Group Contractors Spotted in Northern Burkina Faso',
    subheadline:
      'Russian military presence expanding across Sahel as juntas seek alternatives to Western security partnerships',
    date: 'Mar 8, 2026',
    location: 'Northern Burkina Faso',
    source: 'AU Field Intelligence',
    urgencyBadge: 'URGENT',
    image: '/img/Wagner Group contractors have been observed operating in multiple Sahel nations since 2021.png',
    imageCaption: 'Wagner Group contractors have been observed operating in multiple Sahel nations since 2021',
    feedTime: '3 hours ago',
    feedSummary:
      'Wagner Group contractors spotted in northern Burkina Faso. Potential Russian influence expansion detected.',
    contentHtml: `
      <p class="report-paragraph">Wagner Group private military contractors have been identified operating in northern Burkina Faso near Ouahigouya. Multiple sources estimate 200-300 Russian contractors now active in support roles.</p>
      <p class="report-paragraph">Intelligence indicates tactical advising, training, and potential operational support to junta-aligned units. The pattern mirrors expansion previously seen in Mali.</p>
      <h3 class="report-section-title">Strategic Implications</h3>
      <p class="report-paragraph">This signals a major shift in regional security architecture as junta governments seek alternatives to Western military partnerships.</p>
      <div class="report-pullquote">"Wagner expansion risks replacing one dependency with another while reducing transparency and accountability."</div>
      <div class="report-infobox">
        <div class="report-infobox-title">Recommended Focus</div>
        <ul class="report-list">
          <li>Coordinate AU and ECOWAS diplomatic messaging</li>
          <li>Track contractor movements and rights-abuse indicators</li>
          <li>Expand African-led alternatives for partner security support</li>
          <li>Prioritize border intelligence sharing across affected corridors</li>
        </ul>
      </div>
    `,
    sources:
      'AU Regional Bureau for the Sahel, ECOWAS Security Network, National Intelligence Services, Open Source Intelligence',
  },
  {
    id: 'ecowas',
    masthead: 'Sahel Intelligence Brief',
    headline: 'ECOWAS Summit Postponed Indefinitely',
    subheadline:
      'Regional bloc struggles with internal divisions as junta-led states form alternative coalition',
    date: 'Mar 8, 2026',
    location: 'Abuja, Nigeria',
    source: 'ECOWAS Communications',
    urgencyBadge: null,
    image: '/img/ECOWAS headquarters in Abuja.png',
    imageCaption: 'ECOWAS headquarters in Abuja faces escalating pressure on regional cohesion',
    feedTime: '8 hours ago',
    feedSummary:
      'ECOWAS summit delayed. Regional coordination efforts facing diplomatic resistance from junta-led states.',
    contentHtml: `
      <p class="report-paragraph">ECOWAS postponed its emergency Sahel summit as member-state positions diverged on sanctions, engagement, and transitional roadmaps with military-led governments.</p>
      <p class="report-paragraph">Mali, Burkina Faso, and Niger continue advancing a parallel security alignment, increasing pressure on ECOWAS institutional authority.</p>
      <h3 class="report-section-title">Diplomatic Outlook</h3>
      <p class="report-paragraph">Regional fragmentation raises coordination risk across stabilization, border control, and humanitarian corridors unless mediation channels are restored quickly.</p>
      <div class="report-infobox">
        <div class="report-infobox-title">Immediate Priorities</div>
        <ul class="report-list">
          <li>Convene AU-ECOWAS bridge consultations with phased benchmarks</li>
          <li>Protect technical security coordination from political deadlock</li>
          <li>Define incentive pathways tied to constitutional transition milestones</li>
          <li>Maintain active channels with both ECOWAS and junta coalitions</li>
        </ul>
      </div>
    `,
    sources: 'ECOWAS Communications Desk, AU Peace and Security Council, Regional Diplomatic Channels',
  },
  {
    id: 'climate',
    masthead: 'Sahel Intelligence Brief',
    headline: 'Sahel Climate Crisis Accelerating Food Insecurity',
    subheadline:
      '40% drop in agricultural yields threatens to displace millions, creating new security threats',
    date: 'Mar 8, 2026',
    location: 'Sahel Region-Wide',
    source: 'AU Climate Observatory',
    urgencyBadge: null,
    image: '/img/Drought conditions across the Sahel.png',
    imageCaption: 'Drought pressure across the Sahel has reached critical multi-year levels',
    feedTime: '12 hours ago',
    feedSummary:
      'Climate report indicates 40% drop in agricultural yields. Food insecurity rising across the Sahel.',
    contentHtml: `
      <p class="report-paragraph">New assessments show a 40% regional drop in yields versus recent baseline periods, increasing displacement pressure and local resource conflict risks.</p>
      <p class="report-paragraph">Food insecurity now compounds existing insurgency dynamics by raising recruitment vulnerability, migration stress, and governance burden in frontline territories.</p>
      <h3 class="report-section-title">Climate-Security Feedback Loop</h3>
      <p class="report-paragraph">Climate stress and insecurity reinforce each other: conflict blocks planting seasons, disrupted migration routes accelerate land degradation, and state response capacity is diverted to crisis containment.</p>
      <div class="report-pullquote">"In the Sahel, climate policy and security policy are now operationally inseparable."</div>
      <div class="report-infobox">
        <div class="report-infobox-title">Integrated Response Priorities</div>
        <ul class="report-list">
          <li>Scale resilient agriculture support where access is viable</li>
          <li>Protect humanitarian corridors with local early warning links</li>
          <li>Embed climate adaptation metrics in stabilization planning</li>
          <li>Expand youth livelihoods tied to restoration and resilience sectors</li>
        </ul>
      </div>
    `,
    sources:
      'AU Climate Observatory, National Meteorological Services, FAO and WFP Field Assessments, Regional Agriculture Dashboards',
  },
  {
    id: 'french',
    masthead: 'Sahel Intelligence Brief',
    headline: 'France Announces Final Military Withdrawal from Niger',
    subheadline:
      'End of Operation Barkhane creates security vacuum as regional forces struggle to fill gap',
    date: 'Mar 8, 2026',
    location: 'Niamey, Niger',
    source: 'French Ministry of Defense',
    urgencyBadge: 'URGENT',
    image: '/img/French forces have maintained Sahel presence since 2013.png',
    imageCaption: 'French forces maintained Sahel deployments since 2013 before final withdrawal',
    feedTime: '1 day ago',
    feedSummary: 'French military announces withdrawal of remaining forces from Niger. Security vacuum expected.',
    contentHtml: `
      <p class="report-paragraph">France confirmed full withdrawal of remaining forces from Niger, ending its long-running Sahel military mission and accelerating a regional capability transition.</p>
      <p class="report-paragraph">The drawdown removes surveillance, rapid reaction, and coordination capacity that regional actors have not yet replaced at comparable scale.</p>
      <h3 class="report-section-title">Post-Withdrawal Security Landscape</h3>
      <p class="report-paragraph">Analysts project a near-term activity spike as armed groups test response gaps across border corridors and contested urban approaches.</p>
      <div class="report-infobox">
        <div class="report-infobox-title">Strategic Imperatives</div>
        <ul class="report-list">
          <li>Prioritize intelligence fusion and rapid cross-border signaling</li>
          <li>Harden vulnerable mobility corridors and logistics nodes</li>
          <li>Accelerate national-force training with accountability standards</li>
          <li>Prevent substitution with opaque external contractor dependency</li>
        </ul>
      </div>
      <div class="report-pullquote">"The transition is both a sovereignty opportunity and a capacity stress test for African-led security."</div>
    `,
    sources:
      'French Ministry of Defense, AU Regional Bureau, G5 Sahel Secretariat, National Defense and Security Briefs',
  },
]

const DOSSIER_ARTICLE_LOOKUP: Record<DossierArticleId, DossierArticle> = DOSSIER_ARTICLES.reduce((acc, article) => {
  return {
    ...acc,
    [article.id]: article,
  }
}, {} as Record<DossierArticleId, DossierArticle>)

function PlayerProfileBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const openModal = useUiStore((s) => s.openModal)
  const turn = state.session.turn
  const act = getActFromTurn(turn)

  return (
    <div className="actor-profile-layout">
      <div className="actor-profile-header-row">
        <div>
          <div className="actor-profile-name">AU Special Envoy</div>
          <div className="actor-profile-title">Special Envoy for Sahel Stabilization</div>
        </div>
        <div className="actor-chip active">Mandate active</div>
      </div>

      <div className="actor-profile-grid">
        <div className="actor-profile-row">
          <span>Current act</span>
          <strong>{act}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Current turn</span>
          <strong>{turn} / {state.session.max_turns}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Total mandate window</span>
          <strong>{state.config.total_turns} turns</strong>
        </div>
        <div className="actor-profile-row">
          <span>Time remaining</span>
          <strong>{state.session.resources.time_months} months</strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Role</SectionTitle>
        <p className="actor-profile-text">
          {ENVOY_ROLE_SUMMARY}
        </p>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Background</SectionTitle>
        <ul style={listStyle}>
          {ENVOY_BACKGROUND_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Mandate authority</SectionTitle>
        <ul style={listStyle}>
          {ENVOY_MANDATE_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('mission_brief')}>
          Open mission context
        </button>
        <button type="button" className="action-config-confirm" onClick={() => openModal('status_report')}>
          Open status report
        </button>
      </div>
    </div>
  )
}

const MISSION_METRIC_KEYS: (keyof Metrics)[] = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
]

interface MissionThresholdRow {
  metricKey: keyof Metrics
  current: number
  thresholdRule: { operator: string; value: number } | undefined
  onTrack: boolean
}

interface TransitionCategorySummary {
  category: string
  count: number
}

interface ActTransitionSummary {
  previousAct: number
  startTurn: number
  endTurn: number
  startMetrics: Metrics
  endMetrics: Metrics
  metricDeltas: Record<keyof Metrics, number>
  actionsConfirmed: number
  dialogueEngagements: number
  eventsTriggered: number
  criticalZonesNow: number
  topCategories: TransitionCategorySummary[]
}

function thresholdSatisfied(value: number, operator: string, target: number): boolean {
  if (operator === '>=') return value >= target
  if (operator === '<=') return value <= target
  if (operator === '>') return value > target
  if (operator === '<') return value < target
  if (operator === '==') return value === target
  return false
}

function buildMissionThresholdRows(state: StoreState): MissionThresholdRow[] {
  return MISSION_METRIC_KEYS.map((metricKey) => {
    const current = state.session.metrics[metricKey]
    const thresholdRule = state.config.win_conditions[metricKey]
    const onTrack = thresholdRule
      ? thresholdSatisfied(current, thresholdRule.operator, thresholdRule.value)
      : false
    return {
      metricKey,
      current,
      thresholdRule,
      onTrack,
    }
  })
}

function getActionCategoryForLogEntry(state: StoreState, actionId: string): string {
  if (actionId.startsWith('dialogue:')) {
    return 'dialogue'
  }
  const action = state.content?.actions.actions.find((item) => item.action_id === actionId)
  return action?.category ?? 'other'
}

function buildActTransitionSummary(state: StoreState, act: number): ActTransitionSummary | null {
  if (act <= 1) {
    return null
  }

  const previousAct = act - 1
  const startTurn = (previousAct - 1) * 4 + 1
  const endTurn = Math.min(previousAct * 4, state.session.max_turns)

  const startMetrics =
    startTurn === 1
      ? { ...state.config.starting_metrics }
      : { ...(state.metric_history?.[startTurn - 1] ?? state.config.starting_metrics) }
  const endMetrics = { ...(state.metric_history?.[endTurn] ?? state.session.metrics) }

  const metricDeltas: Record<keyof Metrics, number> = {
    stability: endMetrics.stability - startMetrics.stability,
    insurgency: endMetrics.insurgency - startMetrics.insurgency,
    civilian_support: endMetrics.civilian_support - startMetrics.civilian_support,
    global_legitimacy: endMetrics.global_legitimacy - startMetrics.global_legitimacy,
    regional_synergy: endMetrics.regional_synergy - startMetrics.regional_synergy,
  }

  const actionEntries = (state.action_log ?? []).filter((entry) => entry.turn >= startTurn && entry.turn <= endTurn)
  const dialogueEngagements = actionEntries.filter((entry) => entry.action_id.startsWith('dialogue:')).length
  const eventsTriggered = (state.event_log ?? []).filter((entry) => entry.turn >= startTurn && entry.turn <= endTurn).length

  const categoryCounts = actionEntries.reduce<Record<string, number>>((acc, entry) => {
    const category = getActionCategoryForLogEntry(state, entry.action_id)
    const currentCount = acc[category] ?? 0
    return {
      ...acc,
      [category]: currentCount + 1,
    }
  }, {})

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }))

  const criticalZonesNow = Object.values(state.zone_state ?? {}).filter((zone) => zone.threat_level >= 75).length

  return {
    previousAct,
    startTurn,
    endTurn,
    startMetrics,
    endMetrics,
    metricDeltas,
    actionsConfirmed: actionEntries.length,
    dialogueEngagements,
    eventsTriggered,
    criticalZonesNow,
    topCategories,
  }
}

function formatThreshold(operator: string, target: number): string {
  return `${operator}${target}`
}

function formatSignedDelta(value: number): string {
  const rounded = Math.round(value)
  if (rounded > 0) {
    return `+${rounded}`
  }
  return `${rounded}`
}

function isFavorableDelta(metricKey: keyof Metrics, delta: number): boolean {
  if (metricKey === 'insurgency') {
    return delta <= 0
  }
  return delta >= 0
}

function deltaStatusLabel(metricKey: keyof Metrics, delta: number): string {
  if (delta === 0) {
    return 'Stable'
  }
  return isFavorableDelta(metricKey, delta) ? 'Improved' : 'Worsened'
}

function MissionBriefBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const setSelectedDossierArticle = useUiStore((s) => s.setSelectedDossierArticle)
  const [bioEnvelopeOpen, setBioEnvelopeOpen] = useState(false)
  const turn = state.session.turn
  const act = getActFromTurn(turn)
  const turnsRemaining = Math.max(state.session.max_turns - turn + 1, 0)
  const totalMissionWindowMonths = state.config.turn_duration_months?.reduce((sum, months) => sum + months, 0)

  const thresholdRows = buildMissionThresholdRows(state)
  const stabilityThreshold = thresholdRows.find((row) => row.metricKey === 'stability')
  const insurgencyThreshold = thresholdRows.find((row) => row.metricKey === 'insurgency')
  const civilianSupportThreshold = thresholdRows.find((row) => row.metricKey === 'civilian_support')

  const criticalZones = Object.values(state.zone_state ?? {})
    .filter((zone) => zone.threat_level >= 75)
    .sort((a, b) => b.threat_level - a.threat_level)
    .slice(0, 4)

  const noCriticalZonesOnTrack = criticalZones.length === 0
  const watchlistText =
    criticalZones.length === 0
      ? 'No zones are currently in the critical threat band.'
      : `Current critical zones: ${criticalZones.map((zone) => resolveZoneName(content, zone.zone_id)).join(', ')}.`

  const victoryConditions: Array<{
    key: string
    step: string
    title: string
    description: string
    onTrack: boolean
  }> = [
    {
      key: 'stability',
      step: '01',
      title: stabilityThreshold?.thresholdRule
        ? `Regional Stability ${formatThreshold(stabilityThreshold.thresholdRule.operator, stabilityThreshold.thresholdRule.value)}`
        : 'Regional Stability',
      description: `Current score: ${stabilityThreshold?.current ?? state.session.metrics.stability}. Maintain durable security conditions and functioning governance across the theater.`,
      onTrack: stabilityThreshold?.onTrack ?? false,
    },
    {
      key: 'insurgency',
      step: '02',
      title: insurgencyThreshold?.thresholdRule
        ? `Insurgency Level ${formatThreshold(insurgencyThreshold.thresholdRule.operator, insurgencyThreshold.thresholdRule.value)}`
        : 'Insurgency Level',
      description: `Current score: ${insurgencyThreshold?.current ?? state.session.metrics.insurgency}. Reduce organized armed pressure until insurgent groups no longer hold escalation initiative.`,
      onTrack: insurgencyThreshold?.onTrack ?? false,
    },
    {
      key: 'civilian_support',
      step: '03',
      title: civilianSupportThreshold?.thresholdRule
        ? `Civilian Support ${formatThreshold(civilianSupportThreshold.thresholdRule.operator, civilianSupportThreshold.thresholdRule.value)}`
        : 'Civilian Support',
      description: `Current score: ${civilianSupportThreshold?.current ?? state.session.metrics.civilian_support}. Sustain trust that stabilization actions protect communities and address root grievances.`,
      onTrack: civilianSupportThreshold?.onTrack ?? false,
    },
    {
      key: 'critical_zones',
      step: '04',
      title: 'No Critical Zones',
      description: `${watchlistText} Mission end-state requires all zones below the critical threshold.`,
      onTrack: noCriticalZonesOnTrack,
    },
  ]

  return (
    <div className="mission-brief-shell">
      <div className="mission-brief-header">
        <div className="mission-brief-badge">
          <span className="mission-brief-badge-label">Current Act</span>
          <strong className="mission-brief-badge-value">{act}</strong>
        </div>
        <h1 className="mission-brief-title">Mission Brief</h1>
        <p className="mission-brief-subtitle">Operation Sahel Stabilization - Act {act}</p>
        <div className="mission-brief-identity">
          <div className="mission-brief-avatar">
            <img src="/assets/actors/player.png" alt="Special Envoy avatar" />
          </div>
          <div className="mission-brief-role">
            <div className="mission-brief-role-subtitle">Player Role</div>
            <div className="mission-brief-role-title">Special Envoy for Sahel Stabilization</div>
            <p className="mission-brief-role-text">{ENVOY_ROLE_SUMMARY}</p>
            <div className={`mission-brief-envelope${bioEnvelopeOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="mission-brief-envelope-toggle"
                onClick={() => setBioEnvelopeOpen((open) => !open)}
                aria-expanded={bioEnvelopeOpen}
                aria-controls="mission-brief-player-bio"
              >
                <span>Player Bio Envelope</span>
                <span>{bioEnvelopeOpen ? 'Close' : 'Open'}</span>
              </button>
              {bioEnvelopeOpen && (
                <div className="mission-brief-envelope-panel" id="mission-brief-player-bio">
                  <div className="mission-brief-envelope-title">Who You Are</div>
                  <ul className="mission-brief-envelope-list">
                    {ENVOY_BACKGROUND_POINTS.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <div className="mission-brief-envelope-title">How You Lead</div>
                  <ul className="mission-brief-envelope-list">
                    {ENVOY_MANDATE_POINTS.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mission-brief-stats">
          <div className="mission-brief-stat">
            <div className="mission-brief-stat-value">Act {act}</div>
            <div className="mission-brief-stat-label">Campaign Stage</div>
          </div>
          <div className="mission-brief-stat">
            <div className="mission-brief-stat-value">{turn}</div>
            <div className="mission-brief-stat-label">Current Turn</div>
          </div>
          <div className="mission-brief-stat">
            <div className="mission-brief-stat-value">{turnsRemaining}</div>
            <div className="mission-brief-stat-label">Turns Remaining</div>
          </div>
          <div className="mission-brief-stat">
            <div className="mission-brief-stat-value">{state.session.resources.time_months}m</div>
            <div className="mission-brief-stat-label">Time Remaining</div>
          </div>
        </div>
      </div>

      <div className="mission-brief-content">
        <section className="mission-brief-section">
          <h2 className="mission-brief-section-title">Situation Overview</h2>
          <p className="modal-text">
            The Sahel region faces an unprecedented convergence of security, governance, and humanitarian crises.
            Jihadist insurgencies have expanded across Mali, Burkina Faso, and Niger, displacing millions and
            destabilizing national governments. Military juntas have seized power in multiple countries, expelled
            Western forces, and invited Russian Wagner Group contractors as alternative security partners.
          </p>
          <p className="modal-text">
            As the African Union's Special Envoy for Sahel Stabilization, you must navigate this complex landscape to
            restore stability, protect civilian populations, and preserve African-led solutions to regional challenges.
            Your decisions will shape the future of the Sahel and test the AU's capacity for effective crisis response.
          </p>
        </section>

        <section className="mission-brief-section">
          <h2 className="mission-brief-section-title">Primary Objectives</h2>
          <div className="mission-brief-timeline">
            {MISSION_PRIMARY_OBJECTIVES.map((objective) => (
              <div className="mission-brief-timeline-item" key={objective.title}>
                <div className="mission-brief-timeline-title">{objective.title}</div>
                <div className="mission-brief-timeline-description">{objective.description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mission-brief-section">
          <h2 className="mission-brief-section-title">Victory Conditions</h2>
          <p className="modal-text">
            To complete this mission inside the {totalMissionWindowMonths ?? state.config.total_turns}-{
              totalMissionWindowMonths ? 'month' : 'turn'
            } mandate window, all conditions below must be met simultaneously:
          </p>
          <div className="mission-brief-timeline">
            {victoryConditions.map((condition) => (
              <div className="mission-brief-timeline-item" key={condition.key}>
                <div className="mission-brief-timeline-heading">
                  <div className="mission-brief-timeline-title">{condition.title}</div>
                  <span className={`mission-brief-status ${condition.onTrack ? 'on-track' : 'at-risk'}`}>
                    {condition.onTrack ? 'On track' : 'At risk'}
                  </span>
                </div>
                <div className="mission-brief-timeline-description">{condition.description}</div>
              </div>
            ))}
          </div>
          <p className="mission-brief-note">
            All four conditions are required before mandate time expires. Partial gains are not enough to secure a
            durable regional outcome.
          </p>
        </section>

        <section className="mission-brief-section">
          <h2 className="mission-brief-section-title">Strategic Guidance</h2>
          {MISSION_STRATEGIC_GUIDANCE.map((item) => (
            <p className="modal-text" key={item.title}>
              <strong>{item.title}:</strong> {item.description}
            </p>
          ))}
        </section>

        <section className="mission-brief-section">
          <h2 className="mission-brief-section-title">Strategic Hint</h2>
          {MISSION_STRATEGIC_HINTS.map((hint) => (
            <div className="mission-brief-hint" key={hint.title}>
              <p className="modal-text">
                <strong>{hint.title}:</strong> {hint.description}
              </p>
            </div>
          ))}
        </section>
      </div>

      <div className="mission-brief-footer">
        <button
          type="button"
          className="action-config-secondary"
          onClick={() => {
            setSelectedDossierArticle(null)
            openModal('dossier')
          }}
        >
          Dossier
        </button>
        <button
          type="button"
          className="action-config-secondary"
          onClick={() => {
            openModal('relationship_matrix')
          }}
        >
          Relationship Matrix
        </button>
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close Brief
        </button>
      </div>
    </div>
  )
}

function RelationshipMatrixBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const closeModal = useUiStore((s) => s.closeModal)
  const openModal = useUiStore((s) => s.openModal)

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading relationship matrix...</p>
  }

  const relationshipRows = Object.values(state.actor_sentiments ?? {})
    .map((sentiment) => {
      const actor = resolveActorData(content, sentiment.actor_key)
      if (!actor || !actor.relationship_tracked) return null
      const name = resolveActorName(content, actor.actor_key)
      const title = resolveActorTitle(content, actor.actor_key)
      const baseline = actor.default_relationship_score
      const delta = baseline === null ? null : sentiment.relationship_score - baseline
      const location = resolveRelationshipLocation(content, actor)
      return {
        actor,
        sentiment,
        name,
        title,
        baseline,
        delta,
        location,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.sentiment.relationship_score - a.sentiment.relationship_score)

  const trackedCount = relationshipRows.length
  const positiveCount = relationshipRows.filter(
    (row) => row.sentiment.relationship_label === 'allied' || row.sentiment.relationship_label === 'cooperative'
  ).length
  const negativeCount = relationshipRows.filter(
    (row) => row.sentiment.relationship_label === 'hostile' || row.sentiment.relationship_label === 'adversarial'
  ).length
  const averageScore = trackedCount > 0
    ? Math.round(
      relationshipRows.reduce((sum, row) => sum + row.sentiment.relationship_score, 0) / trackedCount
    )
    : 0

  return (
    <div className="relationship-matrix-layout">
      <p className="relationship-matrix-intro">
        Live relationship state for actors with tracked relationship scores in this campaign session.
      </p>

      <div className="relationship-matrix-stats">
        <div className="relationship-matrix-stat">
          <span className="relationship-matrix-stat-label">Tracked Actors</span>
          <strong className="relationship-matrix-stat-value">{trackedCount}</strong>
        </div>
        <div className="relationship-matrix-stat">
          <span className="relationship-matrix-stat-label">Avg. Score</span>
          <strong className="relationship-matrix-stat-value">{averageScore}</strong>
        </div>
        <div className="relationship-matrix-stat">
          <span className="relationship-matrix-stat-label">Cooperative/Allied</span>
          <strong className="relationship-matrix-stat-value">{positiveCount}</strong>
        </div>
        <div className="relationship-matrix-stat">
          <span className="relationship-matrix-stat-label">Hostile/Adversarial</span>
          <strong className="relationship-matrix-stat-value">{negativeCount}</strong>
        </div>
      </div>

      {relationshipRows.length === 0 ? (
        <div className="actor-profile-section">
          <p className="actor-profile-text">No relationship-tracked actors are currently loaded in runtime state.</p>
        </div>
      ) : (
        <div className="relationship-matrix-table-wrap">
          <table className="relationship-matrix-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Location</th>
                <th>Faction</th>
                <th>Relationship</th>
                <th>Score</th>
                <th>Baseline</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              {relationshipRows.map((row) => (
                <tr key={row.actor.actor_key}>
                  <td>
                    <div className="relationship-matrix-actor-cell">
                      <ActorPortrait actor={row.actor} name={row.name} />
                      <div className="relationship-matrix-actor-copy">
                        <div className="relationship-matrix-actor-name">{row.name}</div>
                        <div className="relationship-matrix-actor-title">{row.title}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RelationshipLocationBadge location={row.location} />
                  </td>
                  <td>{formatTokenLabel(row.actor.faction)}</td>
                  <td>
                    <span className={`relationship-matrix-chip ${relationshipToneClass(row.sentiment.relationship_label)}`}>
                      {formatTokenLabel(row.sentiment.relationship_label)}
                    </span>
                  </td>
                  <td>{row.sentiment.relationship_score}</td>
                  <td>{row.baseline ?? 'N/A'}</td>
                  <td className={row.delta === null ? '' : row.delta >= 0 ? 'is-positive' : 'is-negative'}>
                    {row.delta === null ? 'N/A' : `${row.delta > 0 ? '+' : ''}${row.delta}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('mission_brief')}>
          Back to Mission Brief
        </button>
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function CreditsBody(): ReactNode {
  const closeModal = useUiStore((s) => s.closeModal)

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">African Mandate - Credits</div>
      <div className="actor-profile-section">
        <SectionTitle>Core Contributors</SectionTitle>
        <p className="actor-profile-text">
          African Mandate is built by multidisciplinary contributors across design, engineering, narrative systems,
          geospatial operations, and policy simulation.
        </p>
      </div>
      <div className="actor-profile-section">
        <SectionTitle>Acknowledgments</SectionTitle>
        <ul
          style={{
            margin: 0,
            paddingLeft: '1rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            fontSize: '0.84rem',
          }}
        >
          <li>African Union policy and stabilization research references</li>
          <li>Regional data providers and open geospatial map sources</li>
          <li>Scenario design and narrative prototyping support teams</li>
        </ul>
      </div>
      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function DossierBody(): ReactNode {
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const setSelectedDossierArticle = useUiStore((s) => s.setSelectedDossierArticle)

  return (
    <div className="dossier-shell">
      <div className="dossier-header">
        <h2 className="dossier-title">Mission Dossier</h2>
        <p className="dossier-subtitle">Select a briefing to open the full intelligence article.</p>
      </div>

      <div className="dossier-feed-grid">
        {DOSSIER_ARTICLES.map((article) => (
          <button
            type="button"
            key={article.id}
            className={`dossier-feed-item${article.urgencyBadge ? ' urgent' : ''}`}
            onClick={() => {
              setSelectedDossierArticle(article.id)
              openModal('dossier_article')
            }}
          >
            <div className="dossier-feed-time">{article.feedTime}</div>
            <div className="dossier-feed-main">
              <div className="dossier-feed-thumb">
                <img src={article.image} alt={`${article.headline} thumbnail`} loading="lazy" />
              </div>
              <div className="dossier-feed-copy">
                <div className="dossier-feed-masthead">{article.masthead}</div>
                <div className="dossier-feed-headline">{article.headline}</div>
                <div className="dossier-feed-subheadline">{article.subheadline}</div>
                <div className="dossier-feed-summary">{article.feedSummary}</div>
              </div>
            </div>
            <div className="dossier-feed-meta">
              <span>{article.date}</span>
              <span>{article.location}</span>
              <span>{article.source}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="dossier-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('mission_brief')}>
          Back to Mission Brief
        </button>
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function DossierArticleBody(): ReactNode {
  const selectedDossierArticleId = useUiStore((s) => s.selectedDossierArticleId)
  const openModal = useUiStore((s) => s.openModal)

  const selectedArticle =
    (selectedDossierArticleId &&
      Object.prototype.hasOwnProperty.call(DOSSIER_ARTICLE_LOOKUP, selectedDossierArticleId) &&
      DOSSIER_ARTICLE_LOOKUP[selectedDossierArticleId as DossierArticleId]) ||
    DOSSIER_ARTICLES[0]

  if (!selectedArticle) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Dossier article unavailable.</p>
  }

  const articleDateline = `${selectedArticle.location} | ${selectedArticle.date}`

  return (
    <article className="intel-report-modal-shell">
      <div className="intel-report-header">
        <div className="intel-report-kicker-row">
          <div className="intel-report-masthead">{selectedArticle.masthead}</div>
          {selectedArticle.urgencyBadge && <div className="intel-report-urgent">{selectedArticle.urgencyBadge}</div>}
        </div>
        <h1 className="intel-report-headline">{selectedArticle.headline}</h1>
        <p className="intel-report-subheadline">{selectedArticle.subheadline}</p>
        <div className="intel-report-byline">
          <span className="intel-report-byline-label">Filed by</span>
          <span className="intel-report-byline-value">{selectedArticle.source}</span>
        </div>
        <div className="intel-report-meta">
          <span className="intel-report-meta-item">
            <span className="intel-report-meta-label">Dateline</span>
            <span className="intel-report-meta-value">{articleDateline}</span>
          </span>
          <span className="intel-report-meta-item">
            <span className="intel-report-meta-label">Coverage</span>
            <span className="intel-report-meta-value">{selectedArticle.location}</span>
          </span>
          <span className="intel-report-meta-item">
            <span className="intel-report-meta-label">Source Network</span>
            <span className="intel-report-meta-value">{selectedArticle.source}</span>
          </span>
        </div>
      </div>

      <div className="intel-report-content">
        <div className="intel-report-article-wrap">
          <figure className="intel-report-lead-image">
            <div className="intel-report-lead-image-placeholder">
              <img src={selectedArticle.image} alt={selectedArticle.headline} />
            </div>
            <figcaption className="intel-report-image-caption">{selectedArticle.imageCaption}</figcaption>
          </figure>

          <div
            className="intel-report-body"
            dangerouslySetInnerHTML={{ __html: selectedArticle.contentHtml }}
          />
        </div>
      </div>

      <div className="intel-report-footer">
        <div className="intel-report-source">
          <div className="intel-report-source-label">Sources</div>
          <div className="intel-report-source-value">{selectedArticle.sources}</div>
        </div>
        <div className="intel-report-actions">
          <button type="button" className="intel-report-btn close" onClick={() => openModal('dossier')}>
            Close
          </button>
        </div>
      </div>
    </article>
  )
}

function IntelReportBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const intelFeed = state.intel_feed
  const selectedReportKey = useUiStore((s) => s.selectedReportKey)
  const openModal = useUiStore((s) => s.openModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  const intelReport = selectedReportKey ? resolveIntelReport(content, selectedReportKey) : undefined
  const feedItem = selectedReportKey ? intelFeed?.find((item) => item.report_key === selectedReportKey) : undefined

  useEffect(() => {
    if (!selectedReportKey || !intelFeed) {
      return
    }
    const isUnread = intelFeed.some((item) => item.report_key === selectedReportKey && item.is_read === false)
    if (!isUnread) {
      return
    }
    try {
      const currentState = useGameStore.getState().state
      const nextState = markIntelReportRead(currentState, selectedReportKey)
      useGameStore.setState({ state: nextState })
      void autosaveState(nextState, 'intel').catch(() => undefined)
    } catch {
      // Keep intel modal usable even when persistence update fails.
    }
  }, [autosaveState, intelFeed, selectedReportKey])

  if (!selectedReportKey) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No intel report selected.</p>
  }
  if (!intelReport) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Intel report not found.</p>
  }

  const scope = intelReport.zone_scope ? resolveZoneName(content, intelReport.zone_scope) : 'Regional scope'
  const urgencyLabel = formatTokenLabel(intelReport.urgency)
  const confidenceLabel = formatTokenLabel(intelReport.confidence_level)
  const generatorLabel = formatTokenLabel(intelReport.generated_by)
  const turnsUntilExpiry = feedItem
    ? Math.max(0, feedItem.occurred_at + intelReport.expiry_turns - state.session.turn)
    : intelReport.expiry_turns
  const intelTitle = resolveOptionalLocalizedText(content, 'loc.intel.template.title') ?? 'Intelligence briefing'

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">{intelTitle}</div>
      <div className="campaign-presentation-meta">
        <span className={`actor-chip ${intelReport.urgency === 'critical' ? 'inactive' : 'active'}`}>
          Urgency {urgencyLabel}
        </span>
        <span className="actor-chip">Confidence {confidenceLabel}</span>
        <span className="actor-chip">{feedItem?.is_read ? 'Read' : 'Unread'}</span>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>{intelReport.headline_text}</SectionTitle>
        <p className="actor-profile-text">{intelReport.body_text}</p>
      </div>

      <div className="campaign-metric-grid">
        <div className="campaign-metric-row">
          <span>Scope</span>
          <strong>{scope}</strong>
        </div>
        <div className="campaign-metric-row">
          <span>Generated by</span>
          <strong>{generatorLabel}</strong>
        </div>
        <div className="campaign-metric-row">
          <span>First seen</span>
          <strong>{feedItem ? `Turn ${feedItem.occurred_at}` : 'Unknown'}</strong>
        </div>
        <div className="campaign-metric-row">
          <span>Expiry window</span>
          <strong>{turnsUntilExpiry} turns remaining</strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Sources</SectionTitle>
        {intelReport.sources.length === 0 ? (
          <p className="actor-profile-text">No sources listed for this report.</p>
        ) : (
          <div className="dialogue-choice-effects">
            {intelReport.sources.map((source) => (
              <span className="actor-chip" key={source}>{formatTokenLabel(source)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('action_config')}>
          Plan response
        </button>
      </div>
    </div>
  )
}

function resolveOptionalLocalizedText(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  key: string
): string | null {
  const text = resolveLocalizedText(content?.localization, key)
  return text === key ? null : text
}

function findActOpeningCutscene(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  act: number,
  turn: number
): CutsceneEntry | null {
  if (!content) {
    return null
  }
  const openingScenes = content.cutscenes.cutscenes.filter(
    (scene) => scene.act === act && scene.cutscene_id.includes('opening')
  )
  if (openingScenes.length === 0) {
    return null
  }
  return openingScenes.find((scene) => scene.trigger_turn === turn) ?? openingScenes[0] ?? null
}

function resolveActBriefingFallback(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  act: number
): string[] {
  const keys = [
    `loc.briefing.act${act}.diallo.line_001a`,
    `loc.briefing.act${act}.diallo.line_001b`,
    `loc.briefing.act${act}.diallo.line_001c`,
    `loc.briefing.act${act}.theme`,
    `loc.briefing.act${act}.focus`,
    `loc.briefing.act${act}.feeling`,
  ]
  return keys
    .map((key) => resolveOptionalLocalizedText(content, key))
    .filter((line): line is string => line !== null)
}

function findEndingCutscene(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  endingType: EndingType
): CutsceneEntry | null {
  if (!content) {
    return null
  }
  const expectedId = `cutscene_ending_${endingType}`
  return content.cutscenes.cutscenes.find((scene) => scene.cutscene_id === expectedId) ?? null
}

function resolveEndingFallbackText(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  endingType: EndingType
): string {
  if (endingType === 'mandate_revoked') {
    return (
      resolveOptionalLocalizedText(content, 'loc.ending.fail.diallo.line_001') ??
      resolveOptionalLocalizedText(content, 'loc.ending.fail.diallo.line_001a') ??
      'The Peace and Security Council has terminated your mandate.'
    )
  }
  return (
    resolveOptionalLocalizedText(content, 'loc.ending.success.diallo.line_001') ??
    resolveOptionalLocalizedText(content, 'loc.ending.success.diallo.line_001a') ??
    'Mission review complete. Final campaign outcome recorded.'
  )
}

function formatEndingTitle(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  endingType: EndingType
): string {
  const key = `loc.ending.${endingType}.title`
  return resolveOptionalLocalizedText(content, key) ?? formatTokenLabel(endingType)
}

function ActBriefingBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const openModal = useUiStore((s) => s.openModal)
  const turn = state.session.turn
  const act = getActFromTurn(turn)
  const cutscene = findActOpeningCutscene(content, act, turn)
  const briefingTitle =
    resolveOptionalLocalizedText(content, 'loc.cutscene.act_transition.title') ?? 'Act transition briefing'

  const cutsceneNarration = cutscene
    ? resolveOptionalLocalizedText(content, cutscene.text_key)
    : null
  const fallbackLines = resolveActBriefingFallback(content, act)
  const fallbackNarration =
    fallbackLines.length > 0
      ? fallbackLines.join(' ')
      : `Act ${act} has begun. Reassess priorities and align decisions with mandate thresholds.`
  const narration = cutsceneNarration ?? fallbackNarration
  const speaker = cutscene ? resolveActorName(content, cutscene.speaker_key) : 'AU Briefing Desk'
  const transitionSummary = buildActTransitionSummary(state, act)
  const highestRiskZones = Object.values(state.zone_state ?? {})
    .sort((a, b) => b.threat_level - a.threat_level)
    .slice(0, 3)

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">
        {briefingTitle} - Act {act}
      </div>
      <div className="campaign-presentation-meta">
        <span className="action-config-chip">Turn {turn}</span>
        <span className="action-config-chip">Speaker: {speaker}</span>
      </div>
      <p className="campaign-presentation-body">{narration}</p>
      {transitionSummary && (
        <div className="actor-profile-section">
          <SectionTitle>Transition Summary: Act {transitionSummary.previousAct}</SectionTitle>
          <div className="campaign-metric-grid">
            <div className="campaign-metric-row">
              <span>Turns reviewed</span>
              <strong>{transitionSummary.startTurn} - {transitionSummary.endTurn}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Actions confirmed</span>
              <strong>{transitionSummary.actionsConfirmed}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Dialogue engagements</span>
              <strong>{transitionSummary.dialogueEngagements}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Runtime events triggered</span>
              <strong>{transitionSummary.eventsTriggered}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Critical zones now</span>
              <strong>{transitionSummary.criticalZonesNow}</strong>
            </div>
          </div>
          <div className="campaign-metric-grid">
            {MISSION_METRIC_KEYS.map((metricKey) => {
              const delta = transitionSummary.metricDeltas[metricKey]
              const statusLabel = deltaStatusLabel(metricKey, delta)
              const statusClassName =
                delta === 0
                  ? 'actor-chip'
                  : isFavorableDelta(metricKey, delta)
                    ? 'actor-chip active'
                    : 'actor-chip inactive'
              return (
                <div className="campaign-metric-row" key={metricKey}>
                  <span>{formatTokenLabel(metricKey)} shift</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <strong>{formatSignedDelta(delta)}</strong>
                    <span className={statusClassName}>{statusLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {transitionSummary.topCategories.length > 0 && (
            <div className="dialogue-choice-effects">
              {transitionSummary.topCategories.map((item) => (
                <span className="actor-chip" key={item.category}>
                  {formatTokenLabel(item.category)} x{item.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="actor-profile-section">
        <SectionTitle>Immediate Priorities</SectionTitle>
        {highestRiskZones.length === 0 ? (
          <p className="actor-profile-text">No critical zones are flagged. Keep pressure on prevention and recovery.</p>
        ) : (
          <ul style={listStyle}>
            {highestRiskZones.map((zone) => (
              <li key={zone.zone_id}>
                {resolveZoneName(content, zone.zone_id)} (Threat {zone.threat_level}, Stability {zone.stability},
                Insurgency {zone.insurgency})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('mission_brief')}>
          Open mission brief
        </button>
        <button type="button" className="action-config-secondary" onClick={() => openModal('status_report')}>
          View status report
        </button>
        <button type="button" className="action-config-confirm" onClick={() => openModal('action_config')}>
          Continue to operations
        </button>
      </div>
    </div>
  )
}

function CampaignOutcomeBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const resetGame = useGameStore((s) => s.reset)
  const endingType = state.ending_type
  const failReason = state.fail_reason
  const content = state.content
  const closeModal = useUiStore((s) => s.closeModal)
  const openModal = useUiStore((s) => s.openModal)
  const resetUi = useUiStore((s) => s.reset)

  if (!endingType) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Campaign is still active.</p>
  }

  const endingCutscene = findEndingCutscene(content, endingType)
  const endingNarration = endingCutscene
    ? resolveOptionalLocalizedText(content, endingCutscene.text_key)
    : null
  const fallbackNarration = resolveEndingFallbackText(content, endingType)
  const narration = endingNarration ?? fallbackNarration
  const thresholdRows = buildMissionThresholdRows(state)
  const passedCount = thresholdRows.filter((row) => row.onTrack).length
  const failedRows = thresholdRows.filter((row) => !row.onTrack)
  const isNegativeOutcome = endingType === 'mandate_revoked' || endingType === 'regional_setback'

  const handleRestart = (): void => {
    resetGame()
    resetUi()
    openModal('mission_brief')
  }

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">
        {formatEndingTitle(content, endingType)}
      </div>
      <div className="campaign-presentation-meta">
        <span className="action-config-chip">Turn {state.session.turn}</span>
        <span className="action-config-chip">Outcome {formatTokenLabel(endingType)}</span>
        <span className={`actor-chip ${isNegativeOutcome ? 'inactive' : 'active'}`}>
          Thresholds met {passedCount} / {thresholdRows.length}
        </span>
      </div>
      <p className="campaign-presentation-body">{narration}</p>
      <div className={`campaign-presentation-rationale ${isNegativeOutcome ? 'campaign-rationale-fail' : 'campaign-rationale-success'}`}>
        <strong>Rationale:</strong> {describeEndingOutcome(endingType, failReason)}
      </div>
      {failReason && (
        <div className="campaign-presentation-rationale campaign-rationale-fail">
          <strong>Fail trigger:</strong> {describeFailReason(failReason)}
        </div>
      )}
      <div className="campaign-metric-grid">
        {thresholdRows.map((row) => (
          <div className="campaign-metric-row" key={row.metricKey}>
            <span>{formatTokenLabel(row.metricKey)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <strong>
                {row.current}
                {row.thresholdRule ? ` / ${formatThreshold(row.thresholdRule.operator, row.thresholdRule.value)}` : ''}
              </strong>
              <span className={`actor-chip ${row.onTrack ? 'active' : 'inactive'}`}>
                {row.onTrack ? 'Passed' : 'Missed'}
              </span>
            </div>
          </div>
        ))}
      </div>
      {failedRows.length > 0 && (
        <div className="actor-profile-section">
          <SectionTitle>Thresholds still missed</SectionTitle>
          <ul style={listStyle}>
            {failedRows.map((row) => (
              <li key={row.metricKey}>
                {formatTokenLabel(row.metricKey)} at {row.current}
                {row.thresholdRule ? ` (required ${formatThreshold(row.thresholdRule.operator, row.thresholdRule.value)})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('status_report')}>
          View status report
        </button>
        <button type="button" className="action-config-confirm" onClick={handleRestart}>
          {resolveOptionalLocalizedText(content, 'loc.ui.action.new_campaign') ?? 'Restart campaign'}
        </button>
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function ActorProfileBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const selectedActorKey = useUiStore((s) => s.selectedActorKey)
  const openModal = useUiStore((s) => s.openModal)
  const setSelectedDialogueId = useUiStore((s) => s.setSelectedDialogueId)
  const resetDialogueFlow = useUiStore((s) => s.resetDialogueFlow)

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading actor profile...</p>
  }
  if (!selectedActorKey) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actor selected.</p>
  }

  const actor = resolveActorData(content, selectedActorKey)
  if (!actor) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Actor not found.</p>
  }

  const actorSentiment = state.actor_sentiments?.[actor.actor_key]
  const actorActive = isActorActive(state, actor)
  const dialogueAvailability = getActorDialogueAvailability(state, actor.actor_key)
  const hasDialogue = dialogueAvailability !== null
  const actorName = resolveActorName(content, actor.actor_key)
  const actorDescription = describeActorProfile(actor)

  const openDialogue = (): void => {
    if (!hasDialogue) {
      return
    }
    resetDialogueFlow()
    if (dialogueAvailability) {
      setSelectedDialogueId(dialogueAvailability.dialogueId)
    }
    openModal('dialogue')
  }

  return (
    <div className="actor-profile-layout">
      <div className="actor-profile-header-row">
        <ActorPortrait actor={actor} name={actorName} />
        <div>
          <div className="actor-profile-name">{actorName}</div>
          <div className="actor-profile-title">{resolveActorTitle(content, actor.actor_key)}</div>
        </div>
        <div className={`actor-chip ${actorActive ? 'active' : 'inactive'}`}>
          {actorActive ? 'Active' : 'Conditional'}
        </div>
      </div>

      <div className="actor-profile-grid">
        <div className="actor-profile-row">
          <span>Actor key</span>
          <strong className="actor-profile-value-code">{actor.actor_key}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Faction</span>
          <strong>{formatTokenLabel(actor.faction)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Type</span>
          <strong>{formatTokenLabel(actor.type)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Profile</span>
          <strong>{formatTokenLabel(actor.profile)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Default sentiment</span>
          <strong>{formatTokenLabel(actor.default_sentiment)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Relationship tracking</span>
          <strong>{actor.relationship_tracked ? 'Tracked' : 'Untracked'}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Baseline relationship</span>
          <strong>{formatBaselineRelationship(actor.default_relationship_score)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Relationship</span>
          <strong>
            {actorSentiment
              ? `${actorSentiment.relationship_label} (${actorSentiment.relationship_score})`
              : 'Untracked'}
          </strong>
        </div>
        <div className="actor-profile-row">
          <span>Dialogue status</span>
          <strong>
            {!hasDialogue
              ? 'No dialogue authored'
              : dialogueAvailability.isAvailable
                ? 'Available now'
                : dialogueAvailability.reason ?? 'Unavailable'}
          </strong>
        </div>
        <div className="actor-profile-row actor-profile-row--stacked">
          <span>Portrait asset</span>
          <strong className="actor-profile-value-code">{actor.portrait_url}</strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Description</SectionTitle>
        <p className="actor-profile-text">{actorDescription}</p>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Notes</SectionTitle>
        <p className="actor-profile-text">{actor.notes ?? 'No additional notes.'}</p>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Activation</SectionTitle>
        <p className="actor-profile-text">
          {actor.activation_condition
            ? `Condition: ${actor.activation_condition}`
            : 'Always available in actor panel.'}
        </p>
      </div>

      <div className="action-config-review-actions">
        <button
          type="button"
          className="action-config-confirm"
          onClick={openDialogue}
          disabled={!hasDialogue}
        >
          {hasDialogue ? 'Open dialogue' : 'No dialogue authored'}
        </button>
      </div>
    </div>
  )
}

function DialogueBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const selectedActorKey = useUiStore((s) => s.selectedActorKey)
  const selectedDialogueId = useUiStore((s) => s.selectedDialogueId)
  const dialogueFlowStep = useUiStore((s) => s.dialogueFlowStep)
  const dialogueOutcomeTextKey = useUiStore((s) => s.dialogueOutcomeTextKey)
  const dialogueChoiceId = useUiStore((s) => s.dialogueChoiceId)
  const setSelectedDialogueId = useUiStore((s) => s.setSelectedDialogueId)
  const setDialogueOutcome = useUiStore((s) => s.setDialogueOutcome)
  const setDialogueFlowStep = useUiStore((s) => s.setDialogueFlowStep)
  const resetDialogueFlow = useUiStore((s) => s.resetDialogueFlow)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  const actor = content && selectedActorKey
    ? resolveActorData(content, selectedActorKey)
    : undefined
  const dialogueAvailability = actor
    ? getActorDialogueAvailability(state, actor.actor_key)
    : null

  useEffect(() => {
    if (!selectedDialogueId && dialogueAvailability) {
      setSelectedDialogueId(dialogueAvailability.dialogueId)
    }
  }, [dialogueAvailability, selectedDialogueId, setSelectedDialogueId])

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading dialogue...</p>
  }
  if (!selectedActorKey) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actor selected.</p>
  }
  if (!actor) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Actor not found.</p>
  }

  if (!dialogueAvailability) {
    return (
      <div className="actor-profile-layout">
        <p className="actor-profile-text">No authored dialogue exists for this actor.</p>
        <button type="button" className="action-config-secondary" onClick={() => openModal('actor_profile')}>
          Back to actor profile
        </button>
      </div>
    )
  }

  const dialogue =
    content.dialogues.dialogues.find((item) => item.dialogue_id === (selectedDialogueId ?? dialogueAvailability.dialogueId)) ??
    null
  if (!dialogue) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Dialogue not found.</p>
  }

  const rootText = dialogue.node_graph.root?.text_key
    ? resolveLocalizedText(content.localization, dialogue.node_graph.root.text_key)
    : 'No dialogue opening text available.'
  const choiceNode = findDialogueChoiceNode(dialogue)
  const choices = choiceNode?.choices ?? []

  const selectedChoice = dialogueChoiceId ? choices.find((choice) => choice.choice_id === dialogueChoiceId) : undefined
  const outcomeText = dialogueOutcomeTextKey
    ? resolveLocalizedText(content.localization, dialogueOutcomeTextKey)
    : 'Outcome unavailable.'
  const latestLog = state.action_log?.[state.action_log.length - 1]
  const latestRelationship = state.actor_sentiments?.[dialogue.actor_key]
  const isLatestDialogueEntry =
    latestLog?.action_id.startsWith(`dialogue:${dialogue.dialogue_id}:`) ?? false

  const executeChoice = (choiceId: string): void => {
    try {
      const result = executeDialogueChoice(state, dialogue.dialogue_id, choiceId)
      useGameStore.setState({ state: result.state })
      void autosaveState(result.state, 'dialogue').catch(() => undefined)
      setDialogueOutcome(result.outcomeTextKey, result.choice.choice_id)
    } catch (error: unknown) {
      if (error instanceof GameError) {
        window.alert(`Dialogue failed: ${error.message}`)
        return
      }
      window.alert('Dialogue failed due to an unexpected runtime error.')
    }
  }

  if (dialogueFlowStep === 'outcome') {
    return (
      <div className="actor-profile-layout">
        <div className="actor-profile-name">{resolveActorName(content, actor.actor_key)}</div>
        <div className="actor-profile-title">Dialogue outcome</div>
        <div className="actor-profile-section">
          {selectedChoice && (
            <>
              <SectionTitle>Selected response</SectionTitle>
              <p className="actor-profile-text">
                {resolveLocalizedText(content.localization, selectedChoice.label_key)}
              </p>
            </>
          )}
          <SectionTitle>Actor response</SectionTitle>
          <p className="actor-profile-text">{outcomeText}</p>
        </div>
        {isLatestDialogueEntry && latestLog && (
          <div className="actor-profile-grid">
            <div className="actor-profile-row">
              <span>Resource delta</span>
              <strong>{formatResourceDelta(latestLog.resource_deltas)}</strong>
            </div>
            <div className="actor-profile-row">
              <span>Metric delta</span>
              <strong>{formatMetricDelta(latestLog.metric_deltas)}</strong>
            </div>
            <div className="actor-profile-row">
              <span>Relationship now</span>
              <strong>
                {latestRelationship
                  ? `${latestRelationship.relationship_label} (${latestRelationship.relationship_score})`
                  : 'Untracked'}
              </strong>
            </div>
          </div>
        )}
        <div className="action-config-review-actions">
          <button
            type="button"
            className="action-config-secondary"
            onClick={() => {
              resetDialogueFlow()
              openModal('actor_profile')
            }}
          >
            Back to actor profile
          </button>
          <button type="button" className="action-config-confirm" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="actor-profile-layout">
      <div className="actor-profile-header-row">
        <ActorPortrait actor={actor} name={resolveActorName(content, actor.actor_key)} />
        <div>
          <div className="actor-profile-name">{resolveActorName(content, actor.actor_key)}</div>
          <div className="actor-profile-title">{resolveActorTitle(content, actor.actor_key)}</div>
        </div>
        <div className={`actor-chip ${dialogueAvailability.isAvailable ? 'active' : 'inactive'}`}>
          {dialogueAvailability.isAvailable ? 'Open' : 'Locked'}
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Actor Brief</SectionTitle>
        <p className="actor-profile-text">{describeActorProfile(actor)}</p>
        <p className="actor-profile-text">{actor.notes ?? 'No additional notes.'}</p>
      </div>

      <div className="actor-profile-grid">
        <div className="actor-profile-row">
          <span>Actor key</span>
          <strong className="actor-profile-value-code">{actor.actor_key}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Default sentiment</span>
          <strong>{formatTokenLabel(actor.default_sentiment)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Relationship tracking</span>
          <strong>{actor.relationship_tracked ? 'Tracked' : 'Untracked'}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Baseline relationship</span>
          <strong>{formatBaselineRelationship(actor.default_relationship_score)}</strong>
        </div>
        <div className="actor-profile-row actor-profile-row--stacked">
          <span>Portrait asset</span>
          <strong className="actor-profile-value-code">{actor.portrait_url}</strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Opening statement</SectionTitle>
        <p className="actor-profile-text">{rootText}</p>
      </div>

      {!dialogueAvailability.isAvailable && (
        <div className="action-config-validation">{dialogueAvailability.reason ?? 'Dialogue unavailable.'}</div>
      )}

      {dialogueAvailability.isAvailable && choices.length > 0 && (
        <div className="dialogue-choice-list">
          {choices.map((choice) => {
            const metricEffects = Object.entries(choice.effects.metrics ?? {})
              .map(([key, value]) => `${formatTokenLabel(key)} ${value > 0 ? '+' : ''}${value}`)
            const resourceEffects = Object.entries(choice.effects.resources ?? {})
              .map(([key, value]) => `${formatTokenLabel(key)} ${value > 0 ? '+' : ''}${value}`)
            const relationshipDelta = choice.effects.actor_relationship ?? 0
            return (
              <button
                key={choice.choice_id}
                type="button"
                className="dialogue-choice-card"
                onClick={() => executeChoice(choice.choice_id)}
              >
                <div className="dialogue-choice-label">
                  {resolveLocalizedText(content.localization, choice.label_key)}
                </div>
                <div className="dialogue-choice-description">
                  {resolveLocalizedText(content.localization, choice.description_key)}
                </div>
                <div className="dialogue-choice-effects">
                  {(choice.costs.budget ?? 0) > 0 && (
                    <span className="actor-chip">Budget -{(choice.costs.budget ?? 0).toLocaleString()}</span>
                  )}
                  {(choice.costs.political_capital ?? 0) > 0 && (
                    <span className="actor-chip">Political -{choice.costs.political_capital}</span>
                  )}
                  <span className="actor-chip">
                    Relationship {relationshipDelta > 0 ? '+' : ''}{relationshipDelta}
                  </span>
                  {metricEffects.map((effect) => (
                    <span key={effect} className="actor-chip">{effect}</span>
                  ))}
                  {resourceEffects.map((effect) => (
                    <span key={effect} className="actor-chip">{effect}</span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('actor_profile')}>
          Back to actor profile
        </button>
        {dialogueFlowStep !== 'choices' && (
          <button type="button" className="action-config-secondary" onClick={() => setDialogueFlowStep('choices')}>
            Back to choices
          </button>
        )}
      </div>
    </div>
  )
}

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.2rem 0.55rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
  color: 'var(--text)',
  fontSize: '0.74rem',
  background: 'var(--bg-panel)',
} as const

const listStyle = {
  margin: 0,
  paddingLeft: '1rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.45,
  fontSize: '0.86rem',
} as const

function formatResourceDelta(deltas: Record<string, number | undefined>): string {
  const values = Object.entries(deltas)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
  return values.length > 0 ? values.join(', ') : 'No resource changes'
}

function formatMetricDelta(deltas: Record<string, number | undefined>): string {
  const values = Object.entries(deltas)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
  return values.length > 0 ? values.join(', ') : 'No metric changes'
}

function formatTargetLabel(content: ReturnType<typeof useGameStore.getState>['state']['content'], target: ActionTarget): string {
  if (target.zone_id) return resolveZoneName(content, target.zone_id)
  if (target.territory_key) return resolveTerritoryName(content, target.territory_key)
  if (target.actor_key) return resolveActorName(content, target.actor_key)
  return 'N/A'
}

function formatCategoryLabel(category: string): string {
  if (category === 'governance_economic') return 'Governance / Economic'
  if (category === 'community_mediation') return 'Community Mediation'
  return category
    .split('_')
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function formatTokenLabel(value: string): string {
  return value
    .split('_')
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function findDialogueChoiceNode(dialogue: DialogueData): { choices: DialogueChoiceData[] } | undefined {
  const root = dialogue.node_graph.root
  if (root?.next) {
    const linked = dialogue.node_graph[root.next]
    if (linked?.type === 'choice' && linked.choices) {
      return { choices: linked.choices }
    }
  }
  const fallback = Object.values(dialogue.node_graph).find((node) => node?.type === 'choice' && node.choices)
  if (!fallback?.choices) {
    return undefined
  }
  return { choices: fallback.choices }
}

const ALLOCATION_RESOURCE_KEYS: (keyof Resources)[] = [
  'budget',
  'personnel',
  'political_capital',
  'intel_points',
  'time_months',
]

const RESOURCE_LABELS: Record<keyof Resources, string> = {
  budget: 'Budget',
  personnel: 'Personnel',
  political_capital: 'Political Capital',
  intel_points: 'Intel Points',
  time_months: 'Time (Months)',
}

function formatResourceValue(key: keyof Resources, value: number): string {
  if (key === 'budget') {
    return `$${Math.round(value).toLocaleString()}`
  }
  if (key === 'time_months') {
    return `${Math.round(value)} mo`
  }
  return Math.round(value).toLocaleString()
}

function formatResourceSignedValue(key: keyof Resources, value: number): string {
  const sign = value >= 0 ? '+' : '-'
  const abs = Math.abs(value)
  if (key === 'budget') {
    return `${sign}$${Math.round(abs).toLocaleString()}`
  }
  if (key === 'time_months') {
    return `${sign}${Math.round(abs)} mo`
  }
  return `${sign}${Math.round(abs).toLocaleString()}`
}

function buildDefaultAllocation(action: ActionDefinition): Partial<Resources> {
  return {
    budget: action.costs.budget.default,
    personnel: action.costs.personnel.default,
    political_capital: action.costs.political_capital.default,
    intel_points: action.costs.intel_points.default,
    time_months: action.costs.time_months.default,
  }
}

function buildRequestedAllocation(
  action: ActionDefinition,
  draft: Partial<Resources> | null
): Partial<Resources> {
  const fallback = buildDefaultAllocation(action)
  return {
    budget: draft?.budget ?? fallback.budget,
    personnel: draft?.personnel ?? fallback.personnel,
    political_capital: draft?.political_capital ?? fallback.political_capital,
    intel_points: draft?.intel_points ?? fallback.intel_points,
    time_months: draft?.time_months ?? fallback.time_months,
  }
}

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface TerritorySelectOption extends SelectOption<TerritoryKey> {
  flagSrc: string | null
  fallbackFlag: string | null
}

function pickPreferredOption<T extends string>(
  preferred: string | null | undefined,
  options: readonly SelectOption<T>[]
): T | undefined {
  if (preferred) {
    const matched = options.find((option) => option.value === preferred)
    if (matched) return matched.value
  }
  return options[0]?.value
}

function TerritoryFlagBadge({
  territoryName,
  flagSrc,
  fallbackFlag,
}: {
  territoryName: string
  flagSrc: string | null
  fallbackFlag: string | null
}): ReactNode {
  return (
    <span className="action-config-territory-flag" aria-hidden="true">
      {flagSrc ? (
        <img
          src={flagSrc}
          alt=""
          loading="lazy"
          data-fallback-src={fallbackFlag ?? ''}
          onError={handleFlagImageError}
        />
      ) : (
        <span className="action-config-territory-code">{actorInitials(territoryName)}</span>
      )}
    </span>
  )
}

function ActionConfigBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = useGameStore((s) => s.state.content)
  const selectedActionId = useUiStore((s) => s.selectedActionId)
  const selectedTarget = useUiStore((s) => s.selectedTarget)
  const actionFlowStep = useUiStore((s) => s.actionFlowStep)
  const actionAllocation = useUiStore((s) => s.actionAllocation)
  const actionOutcome = useUiStore((s) => s.actionOutcome)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedActorKey = useUiStore((s) => s.selectedActorKey)
  const setSelectedAction = useUiStore((s) => s.setSelectedAction)
  const setActionFlowStep = useUiStore((s) => s.setActionFlowStep)
  const setActionAllocation = useUiStore((s) => s.setActionAllocation)
  const setActionAllocationValue = useUiStore((s) => s.setActionAllocationValue)
  const setActionOutcome = useUiStore((s) => s.setActionOutcome)
  const closeModal = useUiStore((s) => s.closeModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading action definitions...</p>
  }

  const actions = content.actions.actions
  if (actions.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actions available.</p>
  }

  const categories = Array.from(new Set(actions.map((item) => item.category)))
  const selectedAction = selectedActionId ? actions.find((item) => item.action_id === selectedActionId) : undefined
  const fallbackAction = actions[0]
  const activeCategory = selectedAction?.category ?? categories[0]
  if (!fallbackAction || !activeCategory) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actions available.</p>
  }

  const actionsInCategory = actions.filter((item) => item.category === activeCategory)
  const action =
    selectedAction && selectedAction.category === activeCategory
      ? selectedAction
      : (actionsInCategory[0] ?? fallbackAction)
  const actionId = action.action_id

  useEffect(() => {
    setActionAllocation(buildDefaultAllocation(action))
    setActionFlowStep('configure')
    setActionOutcome(null)
  }, [actionId, setActionAllocation, setActionFlowStep, setActionOutcome])

  const zoneState = state.zone_state ?? {}
  const allZones = Object.values(zoneState)
  const territoryOptions: TerritorySelectOption[] = Object.values(state.territory_state ?? {}).map((territory) => {
    const territoryContent = content.territories.territories.find(
      (item) => item.territory_key === territory.territory_key
    )
    const { primarySrc, fallbackSrc } = resolveTerritoryFlagPaths(
      territory.territory_key,
      territoryContent?.flag_url
    )
    return {
      value: territory.territory_key,
      label: resolveTerritoryName(content, territory.territory_key),
      flagSrc: primarySrc,
      fallbackFlag: fallbackSrc,
    }
  })

  const preferredTerritoryFromZoneSelection = (() => {
    if (selectedTarget?.zone_id) return zoneState[selectedTarget.zone_id]?.territory_key
    if (selectedZoneId) return zoneState[selectedZoneId]?.territory_key
    return undefined
  })()

  const selectedTerritory = pickPreferredOption(
    selectedTarget?.territory_key ?? selectedTerritoryKey ?? preferredTerritoryFromZoneSelection,
    territoryOptions
  )
  const selectedTerritoryOption = selectedTerritory
    ? territoryOptions.find((option) => option.value === selectedTerritory)
    : territoryOptions[0]

  const zoneOptions: SelectOption<string>[] = allZones
    .filter((zone) => (selectedTerritory ? zone.territory_key === selectedTerritory : true))
    .map((zone) => ({
      value: zone.zone_id,
      label: resolveZoneName(content, zone.zone_id),
    }))

  const selectedZone = pickPreferredOption(selectedTarget?.zone_id ?? selectedZoneId, zoneOptions)

  const actorPool = action.target_actors && action.target_actors.length > 0
    ? action.target_actors
    : Object.keys(state.actor_sentiments ?? {})

  const actorOptions: SelectOption<string>[] = actorPool.map((actorKey) => ({
    value: actorKey,
    label: resolveActorName(content, actorKey),
  }))

  const selectedActor = pickPreferredOption(selectedTarget?.actor_key ?? selectedActorKey, actorOptions)

  const resolvedTarget: ActionTarget = (() => {
    if (action.target_scope === 'zone') {
      return selectedZone ? { zone_id: selectedZone } : {}
    }
    if (action.target_scope === 'territory') {
      return selectedTerritory ? { territory_key: selectedTerritory } : {}
    }
    return selectedActor ? { actor_key: selectedActor } : {}
  })()
  const resolvedTargetTerritoryKey = resolvedTarget.zone_id
    ? zoneState[resolvedTarget.zone_id]?.territory_key
    : resolvedTarget.territory_key
  const resolvedTargetTerritoryLabel = resolvedTargetTerritoryKey
    ? resolveTerritoryName(content, resolvedTargetTerritoryKey)
    : null

  const handleTerritoryChange = (value: string): void => {
    const matched = territoryOptions.find((option) => option.value === value)
    if (!matched) {
      setSelectedAction(action.action_id, { ...(selectedTarget ?? {}), territory_key: undefined, zone_id: undefined })
      return
    }
    const defaultZoneForTerritory = allZones.find((zone) => zone.territory_key === matched.value)?.zone_id
    setSelectedAction(action.action_id, {
      ...(selectedTarget ?? {}),
      territory_key: matched.value,
      zone_id: defaultZoneForTerritory,
    })
  }

  const handleZoneChange = (value: string): void => {
    const matched = zoneOptions.find((option) => option.value === value)
    if (!matched) {
      setSelectedAction(action.action_id, { ...(selectedTarget ?? {}), zone_id: undefined })
      return
    }
    const zone = zoneState[matched.value]
    setSelectedAction(action.action_id, {
      ...(selectedTarget ?? {}),
      territory_key: zone?.territory_key ?? selectedTerritory,
      zone_id: matched.value,
    })
  }

  const handleActorChange = (value: string): void => {
    const matched = actorOptions.find((option) => option.value === value)
    setSelectedAction(action.action_id, { ...(selectedTarget ?? {}), actor_key: matched?.value })
  }

  const requestedAllocation = buildRequestedAllocation(action, actionAllocation)
  const cost = getResolvedCost(action, requestedAllocation)
  const allocationSpecs = ALLOCATION_RESOURCE_KEYS.map((key) => {
    const range = action.costs[key]
    const available = state.session.resources[key]
    const cappedMax = Math.min(range.max, available)
    const sliderMax = Math.max(range.min, cappedMax)
    const value = Math.min(Math.max(cost[key], range.min), sliderMax)
    const unavailable = cappedMax < range.min
    const fixed = range.max === range.min
    return {
      key,
      label: RESOURCE_LABELS[key],
      min: range.min,
      max: sliderMax,
      step: range.step > 0 ? range.step : 1,
      value,
      available,
      unavailable,
      fixed,
      rangeMax: range.max,
    }
  })

  let validationError: string | null = null
  try {
    validateAction(state, action, resolvedTarget, cost)
  } catch (error: unknown) {
    validationError = error instanceof GameError ? error.message : 'Action cannot be executed with current state.'
  }

  const executeAction = (): void => {
    try {
      const result = executeActionWithLog(state, action, resolvedTarget, requestedAllocation)
      useGameStore.setState({ state: result.state })
      void autosaveState(result.state, 'after_action').catch(() => undefined)
      setActionOutcome(result.logEntry)
      setActionFlowStep('outcome')
    } catch (error: unknown) {
      if (error instanceof GameError) {
        window.alert(`Action failed: ${error.message}`)
        return
      }
      window.alert('Action failed due to an unexpected runtime error.')
    }
  }

  if (actionFlowStep === 'review') {
    return (
      <div className="action-config-layout">
        <div className="action-config-review">
          <div className="action-config-review-row">
            <span>Action</span>
            <strong>{resolveActionName(content, action.action_id)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Category</span>
            <strong>{formatCategoryLabel(action.category)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Target</span>
            <strong>{formatTargetLabel(content, resolvedTarget)}</strong>
          </div>
          {resolvedTarget.zone_id && (
            <div className="action-config-review-row">
              <span>Territory</span>
              <strong>{resolvedTargetTerritoryLabel ?? 'N/A'}</strong>
            </div>
          )}
          {allocationSpecs.map((spec) => (
            <div className="action-config-review-row" key={spec.key}>
              <span>{spec.label}</span>
              <strong>{formatResourceValue(spec.key, cost[spec.key])}</strong>
            </div>
          ))}
        </div>

        {validationError && (
          <div className="action-config-validation">
            {validationError}
          </div>
        )}

        <div className="action-config-review-actions">
          <button
            type="button"
            className="action-config-secondary"
            onClick={() => setActionFlowStep('configure')}
          >
            Back
          </button>
          <button
            type="button"
            className="action-config-confirm"
            onClick={executeAction}
            disabled={validationError !== null}
          >
            Confirm action
          </button>
        </div>
      </div>
    )
  }

  if (actionFlowStep === 'outcome') {
    if (!actionOutcome) {
      return (
        <div className="action-config-layout">
          <p className="action-config-description">Action outcome unavailable.</p>
          <button type="button" className="action-config-confirm" onClick={closeModal}>
            Close
          </button>
        </div>
      )
    }

    return (
      <div className="action-config-layout">
        <div className="action-config-outcome-title">Action executed</div>
        <div className="action-config-review">
          <div className="action-config-review-row">
            <span>Action</span>
            <strong>{resolveActionName(content, actionOutcome.action_id)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Target</span>
            <strong>{formatTargetLabel(content, actionOutcome.target)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Turn</span>
            <strong>{actionOutcome.turn}</strong>
          </div>
          {ALLOCATION_RESOURCE_KEYS.map((key) => (
            <div className="action-config-review-row" key={key}>
              <span>{RESOURCE_LABELS[key]} delta</span>
              <strong>{formatResourceSignedValue(key, actionOutcome.resource_deltas[key] ?? 0)}</strong>
            </div>
          ))}
          <div className="action-config-review-row">
            <span>Metric changes</span>
            <strong>{formatMetricDelta(actionOutcome.metric_deltas)}</strong>
          </div>
        </div>
        <div className="action-config-review-actions">
          {state.session.actions_remaining > 0 && (
            <button
              type="button"
              className="action-config-secondary"
              onClick={() => {
                setActionOutcome(null)
                setActionFlowStep('configure')
              }}
            >
              Configure next action
            </button>
          )}
          <button type="button" className="action-config-confirm" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="action-config-layout">
      <div className="action-config-grid">
        <label className="action-config-field">
          <span>Category</span>
          <select
            className="action-config-select"
            value={activeCategory}
            onChange={(event) => {
              const nextAction = actions.find((item) => item.category === event.target.value)
              if (!nextAction) return
              setSelectedAction(nextAction.action_id, selectedTarget)
            }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="action-config-field">
          <span>Action</span>
          <select
            className="action-config-select"
            value={action.action_id}
            onChange={(event) => setSelectedAction(event.target.value, selectedTarget)}
          >
            {actionsInCategory.map((item) => (
              <option key={item.action_id} value={item.action_id}>
                {resolveActionName(content, item.action_id)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="action-config-field">
        <span>Territory</span>
        {territoryOptions.length === 0 ? (
          <div className="action-config-territory-trigger is-disabled">
            <span className="action-config-territory-name">No valid targets available</span>
          </div>
        ) : (
          <details className="action-config-territory-select">
            <summary className="action-config-territory-trigger">
              <span className="action-config-territory-option">
                <TerritoryFlagBadge
                  territoryName={selectedTerritoryOption?.label ?? 'Territory'}
                  flagSrc={selectedTerritoryOption?.flagSrc ?? null}
                  fallbackFlag={selectedTerritoryOption?.fallbackFlag ?? null}
                />
                <span className="action-config-territory-name">
                  {selectedTerritoryOption?.label ?? 'Select territory'}
                </span>
              </span>
              <span className="action-config-territory-chevron">Select</span>
            </summary>
            <div className="action-config-territory-menu" role="listbox" aria-label="Territory options">
              {territoryOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`action-config-territory-item${option.value === selectedTerritory ? ' is-selected' : ''}`}
                  role="option"
                  aria-selected={option.value === selectedTerritory}
                  onClick={(event) => {
                    handleTerritoryChange(option.value)
                    const detailsElement = event.currentTarget.closest('details')
                    if (detailsElement instanceof HTMLDetailsElement) {
                      detailsElement.open = false
                    }
                  }}
                >
                  <span className="action-config-territory-option">
                    <TerritoryFlagBadge
                      territoryName={option.label}
                      flagSrc={option.flagSrc}
                      fallbackFlag={option.fallbackFlag}
                    />
                    <span className="action-config-territory-name">{option.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </details>
        )}
      </label>

      <label className="action-config-field">
        <span>Zone</span>
        <select
          className="action-config-select"
          value={selectedZone ?? ''}
          disabled={zoneOptions.length === 0}
          onChange={(event) => handleZoneChange(event.target.value)}
        >
          {zoneOptions.length === 0 ? (
            <option value="">No zones in selected territory</option>
          ) : (
            zoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      </label>

      {action.target_scope === 'actor' && (
        <label className="action-config-field">
          <span>Actor</span>
          <select
            className="action-config-select"
            value={selectedActor ?? ''}
            disabled={actorOptions.length === 0}
            onChange={(event) => handleActorChange(event.target.value)}
          >
            {actorOptions.length === 0 ? (
              <option value="">No valid actors available</option>
            ) : (
              actorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </label>
      )}

      <div className="action-config-resource-grid">
        {allocationSpecs.map((spec) => (
          <div className="action-config-resource" key={spec.key}>
            <div className="action-config-resource-header">
              <span>{spec.label}</span>
              <strong>{formatResourceValue(spec.key, spec.value)}</strong>
            </div>
            <input
              type="range"
              className="action-config-slider"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={spec.value}
              disabled={spec.unavailable || spec.fixed}
              onChange={(event) => setActionAllocationValue(spec.key, Number(event.target.value))}
            />
            <div className="action-config-resource-meta">
              <span>
                Range {formatResourceValue(spec.key, spec.min)} to {formatResourceValue(spec.key, spec.rangeMax)}
              </span>
              <span>Available {formatResourceValue(spec.key, spec.available)}</span>
            </div>
            {spec.unavailable && (
              <div className="action-config-resource-warning">
                Insufficient available {spec.label.toLowerCase()} for this action.
              </div>
            )}
            {spec.fixed && !spec.unavailable && (
              <div className="action-config-resource-fixed">Fixed cost</div>
            )}
          </div>
        ))}
      </div>

      <p className="action-config-description">
        {resolveActionDescription(content, action.action_id)}
      </p>

      <div className="action-config-meta">
        <span className="action-config-chip">Budget -{cost.budget.toLocaleString()}</span>
        <span className="action-config-chip">Personnel -{cost.personnel.toLocaleString()}</span>
        <span className="action-config-chip">Political -{cost.political_capital}</span>
        <span className="action-config-chip">Intel -{cost.intel_points}</span>
        <span className="action-config-chip">Time -{cost.time_months}</span>
      </div>

      {validationError && (
        <div className="action-config-validation">
          {validationError}
        </div>
      )}

      <button
        type="button"
        className="action-config-confirm"
        onClick={() => setActionFlowStep('review')}
        disabled={validationError !== null}
      >
        Review action
      </button>
    </div>
  )
}

function OnboardingLoadingBody(): ReactNode {
  const closeModal = useUiStore((s) => s.closeModal)
  const [isReady, setIsReady] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const exitTimerRef = useRef<number | null>(null)
  const readyFallbackTimerRef = useRef<number | null>(null)

  const markReady = useCallback(() => {
    setIsReady((current) => (current ? current : true))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (video && video.readyState >= 3 && !video.paused) {
      markReady()
    } else if (video && video.readyState >= 2 && typeof window !== 'undefined') {
      // Avoid hanging on a black shell if autoplay stalls momentarily.
      readyFallbackTimerRef.current = window.setTimeout(markReady, 420)
    }

    return () => {
      if (exitTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
      if (readyFallbackTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(readyFallbackTimerRef.current)
        readyFallbackTimerRef.current = null
      }
    }
  }, [markReady])

  const beginRevealExit = (): void => {
    if (isExiting) return
    setIsExiting(true)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('african-mandate:theme-fade-out', {
          detail: { durationMs: 1800 },
        })
      )
    }
    if (typeof window === 'undefined') {
      closeModal()
      return
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current)
    }
    exitTimerRef.current = window.setTimeout(() => {
      closeModal()
      exitTimerRef.current = null
    }, 420)
  }

  return (
    <div className={`onboarding-loading-shell${isReady ? ' is-ready' : ''}${isExiting ? ' is-exiting' : ''}`}>
      <video
        ref={videoRef}
        className="onboarding-loading-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={markReady}
        onCanPlay={() => {
          if (typeof window !== 'undefined' && readyFallbackTimerRef.current === null) {
            readyFallbackTimerRef.current = window.setTimeout(markReady, 220)
          }
        }}
        onEnded={beginRevealExit}
        onError={beginRevealExit}
      >
        <source src="/assets/vid/pre-interface%20loading_video.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

function ModalBody(): ReactNode {
  const modal = useUiStore((s) => s.modal)

  if (modal === 'onboarding_loading') return <OnboardingLoadingBody />
  if (modal === 'session_manager') {
    return <SessionManagerBody />
  }
  if (modal === 'dossier') return <DossierBody />
  if (modal === 'dossier_article') return <DossierArticleBody />
  if (modal === 'relationship_matrix') return <RelationshipMatrixBody />
  if (modal === 'action_config') {
    return <ActionConfigBody />
  }
  if (modal === 'territory_overview') return <TerritoryOverviewBody />
  if (modal === 'zone_list') return <ZoneListBody />
  if (modal === 'zone_detail') return <ZoneDetailBody />
  if (modal === 'intel_report') return <IntelReportBody />
  if (modal === 'actor_profile') {
    return <ActorProfileBody />
  }
  if (modal === 'player_profile') return <PlayerProfileBody />
  if (modal === 'dialogue') {
    return <DialogueBody />
  }
  if (modal === 'act_briefing') return <ActBriefingBody />
  if (modal === 'campaign_outcome') return <CampaignOutcomeBody />
  if (modal === 'status_report') return <StatusReportBody />
  if (modal === 'mission_brief') return <MissionBriefBody />
  if (modal === 'credits') return <CreditsBody />
  if (modal === 'leaderboard') {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Leaderboard is deferred in this release scope.</p>
  }
  return null
}

export function ModalRoot(): ReactNode {
  const modal = useUiStore((s) => s.modal)
  const closeModal = useUiStore((s) => s.closeModal)
  const previousModalRef = useRef<ModalKind>('none')
  const revealFrameRef = useRef<number | null>(null)
  const [missionBriefRevealVisible, setMissionBriefRevealVisible] = useState(false)
  const [missionBriefFromLoading, setMissionBriefFromLoading] = useState(false)
  const entryGateRequiresChoice = useSessionStore((s) => s.entry_gate_active && !s.entry_gate_confirmed)
  const isBlockingEntryGate = modal === 'session_manager' && entryGateRequiresChoice
  const isBlockingLoading = modal === 'onboarding_loading'
  const isTerritoryOverviewModal = modal === 'territory_overview'
  const isZoneListModal = modal === 'zone_list'
  const isZoneDetailModal = modal === 'zone_detail'
  const isMissionBriefModal = modal === 'mission_brief'
  const isDossierModal = modal === 'dossier'
  const isDossierArticleModal = modal === 'dossier_article'
  const isRelationshipMatrixModal = modal === 'relationship_matrix'
  const isZoneModal = isZoneListModal || isZoneDetailModal
  const loadingEnteringFromEntryGate = isBlockingLoading && previousModalRef.current === 'session_manager'
  useEffect(() => {
    if (revealFrameRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(revealFrameRef.current)
      revealFrameRef.current = null
    }

    const previousModal = previousModalRef.current
    if (modal === 'mission_brief') {
      setMissionBriefFromLoading(previousModal === 'onboarding_loading')
      setMissionBriefRevealVisible(false)
      if (typeof window !== 'undefined') {
        revealFrameRef.current = window.requestAnimationFrame(() => {
          setMissionBriefRevealVisible(true)
          revealFrameRef.current = null
        })
      } else {
        setMissionBriefRevealVisible(true)
      }
    } else {
      setMissionBriefRevealVisible(false)
      setMissionBriefFromLoading(false)
    }

    previousModalRef.current = modal

    return () => {
      if (revealFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(revealFrameRef.current)
        revealFrameRef.current = null
      }
    }
  }, [modal])

  const isBlockingModal = isBlockingLoading || isBlockingEntryGate
  const missionBriefEnteringFromLoading =
    isMissionBriefModal && (missionBriefFromLoading || previousModalRef.current === 'onboarding_loading')
  const baseBackdropStyle = isBlockingModal ? { ...BACKDROP_STYLE, background: '#000' } : BACKDROP_STYLE
  const backdropStyle =
    missionBriefEnteringFromLoading && !missionBriefRevealVisible
      ? { ...baseBackdropStyle, background: '#000' }
      : baseBackdropStyle
  const modalStyle = isBlockingEntryGate
    ? {
        ...MODAL_STYLE,
        width: 'min(560px, 92vw)',
        maxHeight: '90vh',
        overflow: 'hidden',
      }
      : isBlockingLoading
      ? {
          ...MODAL_STYLE,
          width: loadingEnteringFromEntryGate ? 'min(560px, 92vw)' : 'min(640px, 92vw)',
          maxHeight: loadingEnteringFromEntryGate ? '90vh' : '88vh',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(10,10,10,0.96), rgba(6,6,6,0.98))',
          border: '1px solid rgba(212, 175, 55, 0.28)',
        }
      : isTerritoryOverviewModal
        ? {
            ...MODAL_STYLE,
            width: 'min(860px, 94vw)',
            padding: '1.2rem',
          }
      : isZoneListModal
        ? {
            ...MODAL_STYLE,
            width: 'min(1080px, 96vw)',
            maxHeight: '92vh',
          }
      : isZoneDetailModal
        ? {
            ...MODAL_STYLE,
            width: 'min(920px, 94vw)',
            maxHeight: '92vh',
          }
      : isDossierModal
        ? {
            ...MODAL_STYLE,
            width: 'min(920px, 94vw)',
            maxHeight: '90vh',
            overflow: 'hidden',
            padding: 0,
          }
      : isDossierArticleModal
        ? {
            ...MODAL_STYLE,
            width: 'min(920px, 94vw)',
            maxHeight: '90vh',
            overflow: 'hidden',
            padding: 0,
          }
      : isRelationshipMatrixModal
        ? {
            ...MODAL_STYLE,
            width: 'min(1120px, 96vw)',
            maxHeight: '92vh',
            overflow: 'hidden',
            padding: '1.1rem',
          }
      : isMissionBriefModal
        ? {
            ...MODAL_STYLE,
            width: 'min(1120px, 96vw)',
            maxHeight: '92vh',
            overflow: 'hidden',
            padding: 0,
          }
      : MODAL_STYLE
  const modalContentClassName = `modal-content${isBlockingLoading ? ' modal-content-loading' : ''}${
    loadingEnteringFromEntryGate ? ' loading-entry-from-gate' : ''
  }${
    isBlockingEntryGate ? ' modal-content-entry-gate' : ''
  }${isTerritoryOverviewModal ? ' modal-content-territory-overview' : ''}${
    isZoneListModal ? ' modal-content-zone-list' : ''
  }${isZoneDetailModal ? ' modal-content-zone-detail' : ''}${
    isDossierModal ? ' modal-content-dossier' : ''
  }${isDossierArticleModal ? ' modal-content-dossier-article' : ''}${
    isRelationshipMatrixModal ? ' modal-content-relationship-matrix' : ''
  }${
    isMissionBriefModal ? ' modal-content-mission-brief' : ''
  }${isMissionBriefModal && !missionBriefRevealVisible ? ' mission-brief-prep' : ''}${
    isMissionBriefModal && missionBriefRevealVisible ? ' mission-brief-visible' : ''
  }`
  const heading = modal === 'session_manager' && entryGateRequiresChoice ? 'Secure Access' : modalTitle(modal)
  const backdropClassName = `modal-backdrop${loadingEnteringFromEntryGate ? ' loading-entry-from-gate' : ''}`

  if (modal === 'none') return null

  return (
    <div
      className={backdropClassName}
      role="dialog"
      aria-modal="true"
      style={backdropStyle}
      onClick={(event) => {
        if (isBlockingModal) return
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <div
        className={modalContentClassName}
        style={modalStyle}
        onClick={(event) => event.stopPropagation()}
      >
        {!isBlockingLoading &&
          !isBlockingEntryGate &&
          !isTerritoryOverviewModal &&
          !isZoneModal &&
          !isMissionBriefModal &&
          !isDossierModal &&
          !isDossierArticleModal && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--gold)', fontSize: '1.25rem', fontFamily: 'var(--font-sans)' }}>{heading}</h2>
            {!isBlockingModal && (
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                x
              </button>
            )}
          </div>
        )}
        <ModalBody />
      </div>
    </div>
  )
}
