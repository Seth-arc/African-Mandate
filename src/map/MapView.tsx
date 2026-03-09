import { useEffect, useRef, useState, useMemo, useCallback, type ReactNode } from 'react'
import { MapContainer, TileLayer, useMap, CircleMarker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'
import { useGameStore } from '../state/gameStore'
import { useUiStore } from '../state/uiStore'
import { resolveTerritoryName, resolveZoneName, threatLevelToStatus } from '../state/selectors'
import type {
  StrategicValue,
  TerritoryKey,
  TerritoryState,
  TerritoryStatus,
  ZoneState,
  ZoneType,
} from '../state/types'

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const GEOJSON_URL = '/assets/sahel_countries.geojson'
const MAP_CENTER: [number, number] = [15, 0]
const MAP_ZOOM = 5

/** CartoDB Dark Matter — military-grade dark basemap */
const DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

const STATUS_COLORS: Record<TerritoryStatus, string> = {
  low: '#2d9659',
  moderate: '#d4af37',
  high: '#e8a523',
  critical: '#a83232',
}

const ISO_TO_TERRITORY_KEY: Record<string, string> = {
  MLI: 'mali',
  BFA: 'burkina_faso',
  NER: 'niger',
  TCD: 'chad',
  MRT: 'mauritania',
}

const LEGACY_KEY_TO_CANONICAL: Record<string, string> = {
  burkinaFaso: 'burkina_faso',
}

const TERRITORY_FLAG_FALLBACK: Record<TerritoryKey, string> = {
  mali: '/assets/flags/Flag_of_Mali.svg',
  burkina_faso: '/assets/flags/Flag_of_Burkina_Faso.svg',
  niger: '/assets/flags/Flag_of_Niger.svg',
  chad: '/assets/flags/Flag_of_Chad.svg',
  mauritania: '/assets/flags/Flag_of_Mauritania.svg',
}

/* ── Feature type discriminators ── */

const FEATURE_TYPE = {
  TERRITORY: 'territory',
  ZONE: 'zone',
  NEIGHBOUR: 'neighbour',
} as const

/* ── Zone type visual configuration ── */

interface ZoneTypeConfig {
  label: string
  color: string
  fillOpacity: number
  dashArray: string | undefined
  weight: number
  cssClass: string
}

const ZONE_TYPE_CONFIG: Record<ZoneType, ZoneTypeConfig> = {
  capital: {
    label: 'Capital',
    color: '#7ea8d4',
    fillOpacity: 0.10,
    dashArray: undefined,
    weight: 2,
    cssClass: 'map-zone--capital',
  },
  conflict_hotspot: {
    label: 'Conflict Hotspot',
    color: '#c94040',
    fillOpacity: 0.14,
    dashArray: '6 3',
    weight: 2,
    cssClass: 'map-zone--conflict',
  },
  border_region: {
    label: 'Border Region',
    color: '#b89c4a',
    fillOpacity: 0.08,
    dashArray: '8 4 2 4',
    weight: 1.5,
    cssClass: 'map-zone--border',
  },
  remote_contested: {
    label: 'Remote / Contested',
    color: '#d47a2e',
    fillOpacity: 0.12,
    dashArray: '3 3',
    weight: 1.5,
    cssClass: 'map-zone--contested',
  },
  humanitarian_crisis: {
    label: 'Humanitarian Crisis',
    color: '#9b3a5e',
    fillOpacity: 0.16,
    dashArray: '6 2',
    weight: 2.5,
    cssClass: 'map-zone--crisis',
  },
  urban_center: {
    label: 'Urban Center',
    color: '#9370db',
    fillOpacity: 0.12,
    dashArray: undefined,
    weight: 2,
    cssClass: 'map-zone--urban',
  },
}

/* ── Strategic value visual weight ── */

interface StrategicWeight {
  weight: number
  fillBoost: number
}

const STRATEGIC_WEIGHT: Record<StrategicValue, StrategicWeight> = {
  critical: { weight: 3.0, fillBoost: 0.06 },
  high:     { weight: 2.5, fillBoost: 0.04 },
  medium:   { weight: 2.0, fillBoost: 0.02 },
  low:      { weight: 1.5, fillBoost: 0.00 },
}

/* ── Neighbour styling ── */

const NEIGHBOUR_STYLE: L.PathOptions = {
  color: '#3a3a4a',
  weight: 0.8,
  fillColor: '#1a1a24',
  fillOpacity: 0.35,
  interactive: false,
}

/* ═══════════════════════════════════════════════
   SHARED MAP INSTANCE REF (for legend → map pan)
   ═══════════════════════════════════════════════ */

const SharedMapRef: { current: L.Map | null } = { current: null }

/** Small component inside MapContainer that exposes the map instance */
function MapInstanceCapture(): null {
  const map = useMap()
  useEffect(() => {
    SharedMapRef.current = map

    let rafHandle = 0
    let timeoutA = 0
    let timeoutB = 0
    const invalidate = (): void => {
      map.invalidateSize(false)
    }
    const scheduleInvalidate = (): void => {
      if (rafHandle) window.cancelAnimationFrame(rafHandle)
      window.clearTimeout(timeoutA)
      window.clearTimeout(timeoutB)
      rafHandle = window.requestAnimationFrame(invalidate)
      timeoutA = window.setTimeout(invalidate, 120)
      timeoutB = window.setTimeout(invalidate, 420)
    }

    scheduleInvalidate()
    window.addEventListener('resize', scheduleInvalidate)
    window.addEventListener('african-mandate:start-flow', scheduleInvalidate)

    return () => {
      if (rafHandle) window.cancelAnimationFrame(rafHandle)
      window.clearTimeout(timeoutA)
      window.clearTimeout(timeoutB)
      window.removeEventListener('resize', scheduleInvalidate)
      window.removeEventListener('african-mandate:start-flow', scheduleInvalidate)
      SharedMapRef.current = null
    }
  }, [map])
  return null
}

/* ═══════════════════════════════════════════════
   SOUND EFFECTS (Tactical Audio Cues)
   ═══════════════════════════════════════════════ */

const AudioCtxRef = { ctx: null as AudioContext | null }

function getAudioCtx(): AudioContext {
  if (!AudioCtxRef.ctx) {
    AudioCtxRef.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return AudioCtxRef.ctx
}

function playSelectSound(): void {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)
  } catch {
    /* audio not available */
  }
}

function playCriticalHoverSound(): void {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.setValueAtTime(520, ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    /* audio not available */
  }
}

function playZoneHoverSound(): void {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.03, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    /* audio not available */
  }
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function territoryKeyFromFeature(feature: Feature): string | null {
  const properties = feature.properties as Record<string, unknown> | null | undefined
  if (!properties) return null

  const explicitKey = properties.key
  if (typeof explicitKey === 'string') {
    return LEGACY_KEY_TO_CANONICAL[explicitKey] ?? explicitKey
  }

  const isoA3 = properties.iso_a3
  if (typeof isoA3 === 'string' && ISO_TO_TERRITORY_KEY[isoA3]) {
    return ISO_TO_TERRITORY_KEY[isoA3]
  }

  const adm0A3 = properties.ADM0_A3
  if (typeof adm0A3 === 'string' && ISO_TO_TERRITORY_KEY[adm0A3]) {
    return ISO_TO_TERRITORY_KEY[adm0A3]
  }

  return null
}

function featureTypeFromFeature(feature: Feature): string | null {
  const properties = feature.properties as Record<string, unknown> | null | undefined
  if (!properties) return null
  const ft = properties.feature_type
  return typeof ft === 'string' ? ft : null
}

function zoneIdFromFeature(feature: Feature): string | null {
  const properties = feature.properties as Record<string, unknown> | null | undefined
  if (!properties) return null
  const zoneId = properties.zone_id
  return typeof zoneId === 'string' ? zoneId : null
}

function zoneTypeFromFeature(feature: Feature): ZoneType | null {
  const properties = feature.properties as Record<string, unknown> | null | undefined
  if (!properties) return null
  const zt = properties.zone_type
  if (typeof zt === 'string' && zt in ZONE_TYPE_CONFIG) return zt as ZoneType
  return null
}

function strategicValueFromFeature(feature: Feature): StrategicValue {
  const properties = feature.properties as Record<string, unknown> | null | undefined
  if (!properties) return 'medium'
  const sv = properties.strategic_value
  if (typeof sv === 'string' && sv in STRATEGIC_WEIGHT) return sv as StrategicValue
  return 'medium'
}

function territoryFromState(
  territoryState: Record<TerritoryKey, TerritoryState> | undefined,
  territoryKey: string | null
): TerritoryState | undefined {
  if (!territoryState || !territoryKey) return undefined
  if (!Object.prototype.hasOwnProperty.call(territoryState, territoryKey)) return undefined
  return territoryState[territoryKey as TerritoryKey]
}

function resolveTerritoryFlagUrls(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  territoryKey: string | null
): { primary: string | null; fallback: string | null } {
  if (!territoryKey) return { primary: null, fallback: null }
  const fallback =
    Object.prototype.hasOwnProperty.call(TERRITORY_FLAG_FALLBACK, territoryKey)
      ? TERRITORY_FLAG_FALLBACK[territoryKey as TerritoryKey]
      : null

  const territoryRecord = content?.territories.territories.find(
    (item) => item.territory_key === territoryKey
  )
  const primary = territoryRecord?.flag_url
    ? territoryRecord.flag_url.startsWith('/')
      ? territoryRecord.flag_url
      : `/${territoryRecord.flag_url}`
    : null

  return {
    primary: primary ?? fallback,
    fallback,
  }
}

function territoryFlagMarkup(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  territoryKey: string | null,
  territoryName: string
): string {
  const { primary, fallback } = resolveTerritoryFlagUrls(content, territoryKey)
  if (!primary) return ''
  if (fallback && fallback !== primary) {
    return (
      `<img class="map-tooltip-flag" src="${primary}" alt="${territoryName} flag"` +
      ` onerror="this.onerror=null;this.src='${fallback}'" />`
    )
  }
  return `<img class="map-tooltip-flag" src="${primary}" alt="${territoryName} flag" />`
}

/** Inject multiple SVG hatch/fill patterns into the map container */
function ensureHatchPatterns(map: L.Map): void {
  const container = map.getContainer()
  if (container.querySelector('#sahel-hatch-defs')) return

  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('id', 'sahel-hatch-defs')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'

  const defs = document.createElementNS(svgNS, 'defs')

  /* Critical territory hatch */
  const criticalPattern = document.createElementNS(svgNS, 'pattern')
  criticalPattern.setAttribute('id', 'hatch-critical')
  criticalPattern.setAttribute('patternUnits', 'userSpaceOnUse')
  criticalPattern.setAttribute('width', '8')
  criticalPattern.setAttribute('height', '8')
  criticalPattern.setAttribute('patternTransform', 'rotate(45)')
  const criticalLine = document.createElementNS(svgNS, 'line')
  criticalLine.setAttribute('x1', '0')
  criticalLine.setAttribute('y1', '0')
  criticalLine.setAttribute('x2', '0')
  criticalLine.setAttribute('y2', '8')
  criticalLine.setAttribute('stroke', 'rgba(168, 50, 50, 0.35)')
  criticalLine.setAttribute('stroke-width', '2')
  criticalPattern.appendChild(criticalLine)
  defs.appendChild(criticalPattern)

  /* Conflict hotspot hatch — dense diagonal */
  const conflictPattern = document.createElementNS(svgNS, 'pattern')
  conflictPattern.setAttribute('id', 'hatch-conflict')
  conflictPattern.setAttribute('patternUnits', 'userSpaceOnUse')
  conflictPattern.setAttribute('width', '6')
  conflictPattern.setAttribute('height', '6')
  conflictPattern.setAttribute('patternTransform', 'rotate(45)')
  const conflictLine = document.createElementNS(svgNS, 'line')
  conflictLine.setAttribute('x1', '0')
  conflictLine.setAttribute('y1', '0')
  conflictLine.setAttribute('x2', '0')
  conflictLine.setAttribute('y2', '6')
  conflictLine.setAttribute('stroke', 'rgba(201, 64, 64, 0.25)')
  conflictLine.setAttribute('stroke-width', '1.5')
  conflictPattern.appendChild(conflictLine)
  defs.appendChild(conflictPattern)

  /* Humanitarian crisis hatch — cross-hatch */
  const crisisPattern = document.createElementNS(svgNS, 'pattern')
  crisisPattern.setAttribute('id', 'hatch-crisis')
  crisisPattern.setAttribute('patternUnits', 'userSpaceOnUse')
  crisisPattern.setAttribute('width', '8')
  crisisPattern.setAttribute('height', '8')
  const crisisLine1 = document.createElementNS(svgNS, 'line')
  crisisLine1.setAttribute('x1', '0')
  crisisLine1.setAttribute('y1', '0')
  crisisLine1.setAttribute('x2', '8')
  crisisLine1.setAttribute('y2', '8')
  crisisLine1.setAttribute('stroke', 'rgba(155, 58, 94, 0.20)')
  crisisLine1.setAttribute('stroke-width', '1')
  const crisisLine2 = document.createElementNS(svgNS, 'line')
  crisisLine2.setAttribute('x1', '8')
  crisisLine2.setAttribute('y1', '0')
  crisisLine2.setAttribute('x2', '0')
  crisisLine2.setAttribute('y2', '8')
  crisisLine2.setAttribute('stroke', 'rgba(155, 58, 94, 0.20)')
  crisisLine2.setAttribute('stroke-width', '1')
  crisisPattern.appendChild(crisisLine1)
  crisisPattern.appendChild(crisisLine2)
  defs.appendChild(crisisPattern)

  /* Remote contested — dotted */
  const contestedPattern = document.createElementNS(svgNS, 'pattern')
  contestedPattern.setAttribute('id', 'hatch-contested')
  contestedPattern.setAttribute('patternUnits', 'userSpaceOnUse')
  contestedPattern.setAttribute('width', '6')
  contestedPattern.setAttribute('height', '6')
  const contestedCircle = document.createElementNS(svgNS, 'circle')
  contestedCircle.setAttribute('cx', '3')
  contestedCircle.setAttribute('cy', '3')
  contestedCircle.setAttribute('r', '0.8')
  contestedCircle.setAttribute('fill', 'rgba(212, 122, 46, 0.25)')
  contestedPattern.appendChild(contestedCircle)
  defs.appendChild(contestedPattern)

  svg.appendChild(defs)
  container.appendChild(svg)
}

/* ═══════════════════════════════════════════════
   INLINE SVG ICONS (no emoji, no external deps)
   ═══════════════════════════════════════════════ */

function RadarIcon(): ReactNode {
  return (
    <svg className="map-legend-radar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gold)' }}>
      <circle cx="12" cy="12" r="10" opacity="0.3" />
      <circle cx="12" cy="12" r="6" opacity="0.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  )
}

function ChevronIcon({ collapsed }: { collapsed: boolean }): ReactNode {
  return (
    <svg className={`map-legend-section-chevron${collapsed ? ' is-collapsed' : ''}`} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,2 7,5 3,8" />
    </svg>
  )
}

function ShieldIcon(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L2 4v4c0 3.3 2.6 6.4 6 7 3.4-.6 6-3.7 6-7V4L8 1z" />
    </svg>
  )
}

function CrosshairIcon(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5" />
      <line x1="8" y1="1" x2="8" y2="4" />
      <line x1="8" y1="12" x2="8" y2="15" />
      <line x1="1" y1="8" x2="4" y2="8" />
      <line x1="12" y1="8" x2="15" y2="8" />
    </svg>
  )
}

/* ── Zone type icons for legend and markers ── */

function CapitalIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="10" height="9" rx="1" />
      <polyline points="3,6 8,2 13,6" />
      <line x1="8" y1="9" x2="8" y2="12" />
    </svg>
  )
}

function ConflictIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="4" x2="8" y2="9" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

function BorderIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="1" x2="8" y2="15" strokeDasharray="2 2" />
      <polyline points="4,5 8,3 12,5" />
      <polyline points="4,11 8,13 12,11" />
    </svg>
  )
}

function ContestedIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" strokeDasharray="3 2" />
      <line x1="5" y1="5" x2="11" y2="11" />
      <line x1="11" y1="5" x2="5" y2="11" />
    </svg>
  )
}

function CrisisIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L1 14h14L8 1z" />
      <line x1="8" y1="6" x2="8" y2="10" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" />
    </svg>
  )
}

function UrbanIcon(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14.5V2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12.5" />
      <line x1="5" y1="4" x2="7" y2="4" />
      <line x1="9" y1="4" x2="11" y2="4" />
      <line x1="5" y1="7" x2="7" y2="7" />
      <line x1="9" y1="7" x2="11" y2="7" />
      <line x1="5" y1="10" x2="7" y2="10" />
      <line x1="9" y1="10" x2="11" y2="10" />
      <path d="M1 14.5h14" />
    </svg>
  )
}

function zoneTypeIcon(zoneType: ZoneType): ReactNode {
  switch (zoneType) {
    case 'capital': return <CapitalIcon />
    case 'conflict_hotspot': return <ConflictIcon />
    case 'border_region': return <BorderIcon />
    case 'remote_contested': return <ContestedIcon />
    case 'humanitarian_crisis': return <CrisisIcon />
    case 'urban_center': return <UrbanIcon />
    default: return null
  }
}

/* ═══════════════════════════════════════════════
   SPARKLINE (tiny inline SVG)
   ═══════════════════════════════════════════════ */

function Sparkline({ values, color }: { values: number[]; color: string }): ReactNode {
  if (values.length < 2) return null

  const width = 40
  const height = 14
  const padding = 1
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2)
      const y = height - padding - ((v - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="map-legend-sparkline" viewBox={`0 0 ${width} ${height}`}>
      <polyline className="map-legend-sparkline-line" points={points} stroke={color} />
    </svg>
  )
}

/* ═══════════════════════════════════════════════
   COLLAPSIBLE SECTION WRAPPER
   ═══════════════════════════════════════════════ */

function LegendSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}): ReactNode {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="map-legend-section">
      <div
        className="map-legend-section-header"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="map-legend-section-title">{title}</span>
        <ChevronIcon collapsed={!open} />
      </div>
      <div className={`map-legend-section-body${open ? '' : ' is-collapsed'}`}>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   NEIGHBOUR GEOJSON LAYER (greyed-out context)
   ═══════════════════════════════════════════════ */

function NeighbourGeoJSONLayer(): null {
  const map = useMap()
  const layerRef = useRef<L.GeoJSON | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    fetch(GEOJSON_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`)
        return res.json()
      })
      .then((geojson: FeatureCollection) => {
        if (cancelled) return

        if (layerRef.current && map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current)
          layerRef.current = null
        }

        const neighbourFeatures: FeatureCollection = {
          type: 'FeatureCollection',
          features: geojson.features.filter(
            (f) => featureTypeFromFeature(f) === FEATURE_TYPE.NEIGHBOUR
          ),
        }

        if (neighbourFeatures.features.length === 0) return

        const layer = L.geoJSON(neighbourFeatures, {
          style: () => NEIGHBOUR_STYLE,
          onEachFeature: (feature, layerNode) => {
            const props = feature.properties as Record<string, unknown> | null
            const name = props?.name ?? 'Unknown'
            layerNode.bindTooltip(`${name}`, {
              direction: 'center',
              opacity: 0.7,
              className: 'map-neighbour-tooltip',
              permanent: false,
            })
          },
        })
        layer.addTo(map)
        /* Ensure neighbours render beneath territories */
        layer.bringToBack()
        layerRef.current = layer
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return
        console.error('MapView: failed to load neighbour features', err)
      })

    return () => {
      cancelled = true
      controller.abort()
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map])

  return null
}

/* ═══════════════════════════════════════════════
   TERRITORY GEOJSON LAYER
   ═══════════════════════════════════════════════ */

function SahelGeoJSONLayer(): null {
  const map = useMap()
  const layerRef = useRef<L.GeoJSON | null>(null)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const setSelectedTerritory = useUiStore((s) => s.setSelectedTerritory)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)
  const mapLayers = useUiStore((s) => s.mapLayers)
  const content = useGameStore((s) => s.state.content)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    if (!mapLayers.territories) {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
      return undefined
    }

    ensureHatchPatterns(map)

    fetch(GEOJSON_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`)
        return res.json()
      })
      .then((geojson: FeatureCollection) => {
        if (cancelled) return

        if (layerRef.current && map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current)
          layerRef.current = null
        }

        /* Filter to territory features only */
        const territoryFeatures: FeatureCollection = {
          type: 'FeatureCollection',
          features: geojson.features.filter(
            (f) => featureTypeFromFeature(f) === FEATURE_TYPE.TERRITORY
          ),
        }

        const layer = L.geoJSON(territoryFeatures, {
          style: (feature) => {
            const territoryKey = feature ? territoryKeyFromFeature(feature) : null
            const territory = territoryFromState(territoryState, territoryKey)
            const status: TerritoryStatus = territory?.status ?? 'moderate'
            const isSelected = territoryKey !== null && territoryKey === selectedTerritoryKey
            const isCritical = status === 'critical' || status === 'high'
            const fillOpacityByStatus: Record<TerritoryStatus, number> = {
              low: 0.18,
              moderate: 0.24,
              high: 0.30,
              critical: 0.36,
            }

            return {
              color: STATUS_COLORS[status],
              weight: isSelected ? 3.4 : 2.2,
              fillColor: STATUS_COLORS[status],
              fillOpacity: isSelected
                ? Math.min(fillOpacityByStatus[status] + 0.16, 0.55)
                : fillOpacityByStatus[status],
              dashArray: status === 'critical' ? '6 3' : status === 'high' ? '4 3' : undefined,
              className: `map-territory-status map-territory-status--${status}${isCritical ? ' map-hatch-overlay' : ''}`,
            }
          },
          onEachFeature: (feature, layerNode) => {
            const territoryKey = territoryKeyFromFeature(feature)
            if (!territoryKey) return

            const territory = territoryFromState(territoryState, territoryKey)
            const territoryName = territory
              ? territory.name
              : resolveTerritoryName(content, territoryKey)
            const status = territory?.status ?? 'moderate'
            const stability = territory?.stability ?? '—'
            const insurgency = territory?.insurgency ?? '—'

            const props = feature.properties as Record<string, unknown> | null
            const population =
              territory?.population ??
              (typeof props?.population === 'number' ? props.population : undefined)
            const capital = props?.capital ?? ''
            const zoneIds = (props?.zone_ids as string[]) ?? []
            const flagHtml = territoryFlagMarkup(content, territoryKey, territoryName)

            layerNode.bindTooltip(
              `<div class="map-territory-tooltip">` +
              `<div class="map-tooltip-title-row">` +
              `${flagHtml}` +
              `<div class="map-tooltip-title">${territoryName}</div>` +
              `</div>` +
              `<div class="map-tooltip-row">Status: <span style="color:${STATUS_COLORS[status]}">${status.toUpperCase()}</span></div>` +
              `<div class="map-tooltip-row">Stability: ${stability} &middot; Insurgency: ${insurgency}</div>` +
              (capital ? `<div class="map-tooltip-row map-tooltip-dim">Capital: ${capital}</div>` : '') +
              (population !== undefined
                ? `<div class="map-tooltip-row map-tooltip-dim">Pop: ${Number(population).toLocaleString()}</div>`
                : '') +
              `<div class="map-tooltip-row map-tooltip-dim">Zones: ${zoneIds.length}</div>` +
              `</div>`,
              { direction: 'top', opacity: 0.95, className: 'map-enhanced-tooltip' }
            )

            layerNode.on('mouseover', () => {
              if (status === 'critical') playCriticalHoverSound()
            })

            layerNode.on('click', () => {
              playSelectSound()
              setSelectedTerritory(territoryKey)
              setSelectedZone(null)
              openModal('territory_overview')
            })
          },
        })
        layer.addTo(map)
        layerRef.current = layer
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return
        console.error('MapView: failed to load sahel_countries.geojson', err)
      })

    return () => {
      cancelled = true
      controller.abort()
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [
    content, map, mapLayers.territories, selectedTerritoryKey,
    setSelectedTerritory, setSelectedZone, openModal, territoryState,
  ])

  return null
}

/* ═══════════════════════════════════════════════
   ZONE GEOJSON LAYER (filled zone polygons)
   ═══════════════════════════════════════════════ */

function ZoneGeoJSONLayer(): null {
  const map = useMap()
  const layerRef = useRef<L.GeoJSON | null>(null)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const mapLayers = useUiStore((s) => s.mapLayers)
  const threatThreshold = useUiStore((s) => s.mapThreatThreshold)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedTerritory = useUiStore((s) => s.setSelectedTerritory)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)
  const zonesById = useMemo(
    () => new Map((content?.zones?.zones ?? []).map((zone) => [zone.zone_id, zone])),
    [content]
  )

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    if (!mapLayers.zones) {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
      return undefined
    }

    ensureHatchPatterns(map)

    fetch(GEOJSON_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`)
        return res.json()
      })
      .then((geojson: FeatureCollection) => {
        if (cancelled) return

        if (layerRef.current && map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current)
          layerRef.current = null
        }

        /* Filter to zone features only */
        const zoneFeatures: FeatureCollection = {
          type: 'FeatureCollection',
          features: geojson.features.filter(
            (f) => featureTypeFromFeature(f) === FEATURE_TYPE.ZONE
          ),
        }

        if (zoneFeatures.features.length === 0) return

        const layer = L.geoJSON(zoneFeatures, {
          style: (feature) => {
            if (!feature) return {}

            const zoneId = zoneIdFromFeature(feature)
            const zoneData = zoneId ? zonesById.get(zoneId) : undefined
            const zoneType = zoneData?.zone_type ?? zoneTypeFromFeature(feature) ?? 'border_region'
            const strategicValue = zoneData?.strategic_value ?? strategicValueFromFeature(feature)
            const typeConfig = ZONE_TYPE_CONFIG[zoneType]
            const stratWeight = STRATEGIC_WEIGHT[strategicValue]

            /* Merge threat-based color from game state if available */
            const zoneRuntime = zoneId && zoneState ? zoneState[zoneId] : undefined
            const threatLevel = zoneRuntime?.threat_level ?? 0
            const threatStatus = threatLevelToStatus(threatLevel)
            const isSelected = zoneId !== null && zoneId === selectedZoneId

            /* Critical-only filter */
            if (mapLayers.criticalOnly && threatLevel < threatThreshold) {
              return {
                color: 'transparent',
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 0,
                interactive: false,
              }
            }

            /* Blend zone-type base color with threat status color */
            const borderColor = zoneRuntime ? STATUS_COLORS[threatStatus] : typeConfig.color
            const fillColor = zoneRuntime ? STATUS_COLORS[threatStatus] : typeConfig.color

            /* Determine CSS class for hatch pattern */
            let className = typeConfig.cssClass
            if (zoneType === 'conflict_hotspot') className += ' map-hatch-conflict'
            else if (zoneType === 'humanitarian_crisis') className += ' map-hatch-crisis'
            else if (zoneType === 'remote_contested') className += ' map-hatch-contested'

            return {
              color: borderColor,
              weight: isSelected ? stratWeight.weight + 1 : typeConfig.weight,
              fillColor: fillColor,
              fillOpacity: isSelected
                ? Math.min((typeConfig.fillOpacity + stratWeight.fillBoost) * 0.55 + 0.12, 0.32)
                : Math.max((typeConfig.fillOpacity + stratWeight.fillBoost) * 0.55, 0.045),
              dashArray: typeConfig.dashArray,
              className: className,
            }
          },
          onEachFeature: (feature, layerNode) => {
            const zoneId = zoneIdFromFeature(feature)
            if (!zoneId) return

            const props = feature.properties as Record<string, unknown> | null
            const zoneData = zonesById.get(zoneId)
            const territoryKey = zoneData?.territory_key ?? ((props?.territory_key as string) ?? '')
            const zoneType = zoneData?.zone_type ?? zoneTypeFromFeature(feature) ?? 'border_region'
            const typeConfig = ZONE_TYPE_CONFIG[zoneType]
            const population = zoneData?.population
            const ethnicGroups = zoneData?.ethnic_groups ?? ((props?.ethnic_groups as string[]) ?? [])
            const multiEthnic = zoneData?.multi_ethnic ?? (props?.multi_ethnic === true)
            const strategicValue = zoneData?.strategic_value ?? strategicValueFromFeature(feature)
            const adjacentZones = zoneData?.adjacent_zones ?? ((props?.adjacent_zones as string[]) ?? [])

            /* Runtime state */
            const zoneRuntime = zoneState ? zoneState[zoneId] : undefined
            const threatLevel = zoneRuntime?.threat_level ?? 0
            const stability = zoneRuntime?.stability ?? '—'
            const insurgency = zoneRuntime?.insurgency ?? '—'
            const displaced = zoneRuntime?.displaced ?? 0
            const threatStatus = threatLevelToStatus(threatLevel)

            const zoneName = resolveZoneName(content, zoneId)
            const territoryName = territoryKey ? resolveTerritoryName(content, territoryKey) : 'Unknown territory'
            const flagHtml = territoryFlagMarkup(content, territoryKey, territoryName)

            const ethnicLabel = ethnicGroups.length > 0
              ? ethnicGroups.map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(', ')
              : ''

            layerNode.bindTooltip(
              `<div class="map-zone-tooltip">` +
              `<div class="map-tooltip-title">${zoneName}</div>` +
              `<div class="map-tooltip-territory">` +
              `${flagHtml}` +
              `<span>${territoryName}</span>` +
              `</div>` +
              `<div class="map-tooltip-type" style="color:${typeConfig.color}">${typeConfig.label}</div>` +
              `<div class="map-tooltip-row">Threat: <span style="color:${STATUS_COLORS[threatStatus]}">${threatLevel}</span> &middot; Stability: ${stability}</div>` +
              `<div class="map-tooltip-row">Insurgency: ${insurgency}</div>` +
              (population !== undefined
                ? `<div class="map-tooltip-row map-tooltip-dim">Pop: ${population.toLocaleString()}</div>`
                : '') +
              (ethnicLabel ? `<div class="map-tooltip-row map-tooltip-dim">${multiEthnic ? 'Multi-ethnic' : 'Ethnic'}: ${ethnicLabel}</div>` : '') +
              `<div class="map-tooltip-row map-tooltip-dim">Strategic: ${strategicValue} &middot; Adjacent: ${adjacentZones.length}</div>` +
              (displaced > 0 ? `<div class="map-tooltip-row map-tooltip-displaced">Displaced: ${displaced.toLocaleString()}</div>` : '') +
              `</div>`,
              { direction: 'top', opacity: 0.95, className: 'map-enhanced-tooltip' }
            )

            layerNode.on('mouseover', () => {
              const status = threatLevelToStatus(threatLevel)
              if (status === 'critical') playCriticalHoverSound()
              else playZoneHoverSound()
            })

            layerNode.on('click', () => {
              playSelectSound()
              setSelectedTerritory(territoryKey)
              setSelectedZone(zoneId)
              openModal('zone_detail')
            })
          },
        })
        layer.addTo(map)
        layerRef.current = layer
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return
        console.error('MapView: failed to load zone features', err)
      })

    return () => {
      cancelled = true
      controller.abort()
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [
    content, map, mapLayers.zones, mapLayers.criticalOnly, openModal, selectedZoneId,
    setSelectedTerritory, setSelectedZone, threatThreshold, zoneState, zonesById,
  ])

  return null
}

/* ═══════════════════════════════════════════════
   TERRITORY POPUP CONTENT
   ═══════════════════════════════════════════════ */

function TerritoryPopupContent({
  territory,
  zoneCount,
  onOpen,
}: {
  territory: TerritoryState
  zoneCount: number
  onOpen: () => void
}): ReactNode {
  const status = territory.status

  return (
    <div className="map-popup-card" data-status={status}>
      <div className="map-popup-header">
        <span className="map-popup-title">{territory.name}</span>
        <span className="map-popup-badge" data-status={status}>{status}</span>
      </div>
      <div className="map-popup-stats">
        <div className="map-popup-stat-row">
          <span className="map-popup-stat-label">Stability</span>
          <div className="map-popup-stat-bar">
            <div className="map-popup-stat-fill" data-metric="stability" style={{ width: `${Math.min(100, Math.max(0, territory.stability))}%` }} />
          </div>
          <span className="map-popup-stat-value">{territory.stability}</span>
        </div>
        <div className="map-popup-stat-row">
          <span className="map-popup-stat-label">Insurgency</span>
          <div className="map-popup-stat-bar">
            <div className="map-popup-stat-fill" data-metric="insurgency" style={{ width: `${Math.min(100, Math.max(0, territory.insurgency))}%` }} />
          </div>
          <span className="map-popup-stat-value">{territory.insurgency}</span>
        </div>
      </div>
      <div className="map-popup-meta">
        <span className="map-popup-meta-item">
          Zones: <span className="map-popup-meta-count">{zoneCount}</span>
        </span>
      </div>
      <button type="button" className="map-popup-btn" onClick={onOpen}>
        Open Territory Overview
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TERRITORY MARKERS
   ═══════════════════════════════════════════════ */

function TerritoryMarkers(): ReactNode {
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const mapLayers = useUiStore((s) => s.mapLayers)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const setSelectedTerritory = useUiStore((s) => s.setSelectedTerritory)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)

  if (!mapLayers.territories) return null
  if (!territoryState || Object.keys(territoryState).length === 0) return null

  return (
    <>
      {Object.entries(territoryState).map(([territoryKey, territory]) => {
        const isSelected = selectedTerritoryKey === territoryKey
        const zoneCount = Object.values(zoneState ?? {}).filter(
          (zone) => zone.territory_key === territoryKey
        ).length

        return (
          <CircleMarker
            key={territoryKey}
            center={[territory.coords.lat, territory.coords.lon]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              color: STATUS_COLORS[territory.status],
              fillColor: STATUS_COLORS[territory.status],
              fillOpacity: isSelected ? 0.9 : 0.7,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => {
                playSelectSound()
                setSelectedTerritory(territoryKey)
                setSelectedZone(null)
                openModal('territory_overview')
              },
              mouseover: () => {
                if (territory.status === 'critical') playCriticalHoverSound()
              },
            }}
          >
            <Popup>
              <TerritoryPopupContent
                territory={territory}
                zoneCount={zoneCount}
                onOpen={() => {
                  setSelectedTerritory(territoryKey)
                  setSelectedZone(null)
                  openModal('territory_overview')
                }}
              />
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

/* ═══════════════════════════════════════════════
   ZONE POPUP CONTENT (Enhanced with ethnic data)
   ═══════════════════════════════════════════════ */

function ZonePopupContent({
  zoneName,
  territoryName,
  zone,
  status,
  zoneType,
  ethnicGroups,
  population,
  strategicValue,
  onOpen,
}: {
  zoneName: string
  territoryName: string
  zone: ZoneState
  status: TerritoryStatus
  zoneType: ZoneType | null
  ethnicGroups: string[]
  population: number | undefined
  strategicValue: StrategicValue
  onOpen: () => void
}): ReactNode {
  const typeConfig = zoneType ? ZONE_TYPE_CONFIG[zoneType] : null

  return (
    <div className="map-popup-card" data-status={status}>
      <div className="map-popup-header">
        <span className="map-popup-title">{zoneName}</span>
        <span className="map-popup-badge" data-status={status}>{status}</span>
      </div>
      {typeConfig && (
        <div className="map-popup-zone-type" style={{ color: typeConfig.color }}>
          {zoneType ? zoneTypeIcon(zoneType) : null}
          <span>{typeConfig.label}</span>
          <span className="map-popup-strategic-badge" data-value={strategicValue}>
            {strategicValue}
          </span>
        </div>
      )}
      <div className="map-popup-stats">
        <div className="map-popup-stat-row">
          <span className="map-popup-stat-label">Threat</span>
          <div className="map-popup-stat-bar">
            <div className="map-popup-stat-fill" data-metric="threat" style={{ width: `${Math.min(100, Math.max(0, zone.threat_level))}%` }} />
          </div>
          <span className="map-popup-stat-value">{zone.threat_level}</span>
        </div>
        <div className="map-popup-stat-row">
          <span className="map-popup-stat-label">Stability</span>
          <div className="map-popup-stat-bar">
            <div className="map-popup-stat-fill" data-metric="stability" style={{ width: `${Math.min(100, Math.max(0, zone.stability))}%` }} />
          </div>
          <span className="map-popup-stat-value">{zone.stability}</span>
        </div>
        <div className="map-popup-stat-row">
          <span className="map-popup-stat-label">Insurgency</span>
          <div className="map-popup-stat-bar">
            <div className="map-popup-stat-fill" data-metric="insurgency" style={{ width: `${Math.min(100, Math.max(0, zone.insurgency))}%` }} />
          </div>
          <span className="map-popup-stat-value">{zone.insurgency}</span>
        </div>
      </div>
      <div className="map-popup-meta">
        <span className="map-popup-meta-item">
          Territory: <span className="map-popup-meta-count">{territoryName}</span>
        </span>
        {population !== undefined && (
          <span className="map-popup-meta-item">
            Population: <span className="map-popup-meta-count">{population.toLocaleString()}</span>
          </span>
        )}
        <span className="map-popup-meta-item">
          Displaced: <span className="map-popup-meta-count">{zone.displaced.toLocaleString()}</span>
        </span>
        {zone.incidents.length > 0 && (
          <span className="map-popup-meta-item">
            Incidents: <span className="map-popup-meta-count">{zone.incidents.length}</span>
          </span>
        )}
      </div>
      {ethnicGroups.length > 0 && (
        <div className="map-popup-ethnic">
          <span className="map-popup-ethnic-label">Ethnic Groups:</span>
          <div className="map-popup-ethnic-tags">
            {ethnicGroups.map((group) => (
              <span key={group} className="map-popup-ethnic-tag">
                {group.charAt(0).toUpperCase() + group.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="map-popup-btn" onClick={onOpen}>
        Open Zone Detail
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ZONE MARKERS (centroid labels atop zone polygons)
   ═══════════════════════════════════════════════ */

function ZoneMarkers(): ReactNode {
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)
  const threatThreshold = useUiStore((s) => s.mapThreatThreshold)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedTerritory = useUiStore((s) => s.setSelectedTerritory)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)

  if (!mapLayers.zones) return null
  if (!zoneState || !zones || Object.keys(zoneState).length === 0) return null

  return (
    <>
      {Object.entries(zoneState).map(([zoneId, zone]) => {
        if (mapLayers.criticalOnly && zone.threat_level < threatThreshold) return null

        const zoneData = zones.find((item) => item.zone_id === zoneId)
        const coords = zoneData?.coords
        if (!coords) return null

        const status = threatLevelToStatus(zone.threat_level)
        const territoryName = resolveTerritoryName(content, zone.territory_key)
        const isSelected = selectedZoneId === zoneId
        const zoneType = zoneData?.zone_type ?? null
        const ethnicGroups = zoneData?.ethnic_groups ?? []
        const population = zoneData?.population
        const strategicValue = zoneData?.strategic_value ?? 'medium'

        return (
          <CircleMarker
            key={zoneId}
            center={[coords.lat, coords.lon]}
            radius={isSelected ? 9 : 6}
            pathOptions={{
              color: STATUS_COLORS[status],
              fillColor: STATUS_COLORS[status],
              fillOpacity: isSelected ? 0.95 : 0.8,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => {
                playSelectSound()
                setSelectedTerritory(zone.territory_key)
                setSelectedZone(zoneId)
                openModal('zone_detail')
              },
              mouseover: () => {
                if (status === 'critical') playCriticalHoverSound()
              },
            }}
          >
            <Popup>
              <ZonePopupContent
                zoneName={resolveZoneName(content, zoneId)}
                territoryName={territoryName}
                zone={zone}
                status={status}
                zoneType={zoneType}
                ethnicGroups={ethnicGroups}
                population={population}
                strategicValue={strategicValue}
                onOpen={() => {
                  setSelectedTerritory(zone.territory_key)
                  setSelectedZone(zoneId)
                  openModal('zone_detail')
                }}
              />
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

/* ═══════════════════════════════════════════════
   ZONE TYPE LABEL MARKERS (DivIcon labels at centroids)
   ═══════════════════════════════════════════════ */

function ZoneTypeLabelMarkers(): null {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)
  const threatThreshold = useUiStore((s) => s.mapThreatThreshold)

  useEffect(() => {
    markersRef.current.forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m)
    })
    markersRef.current = []

    if (!mapLayers.zones || !zones) return

    zones.forEach((zoneData) => {
      const coords = zoneData.coords
      if (!coords) return

      const zoneType = zoneData.zone_type
      if (!zoneType || !(zoneType in ZONE_TYPE_CONFIG)) return

      const typeConfig = ZONE_TYPE_CONFIG[zoneType]
      const zoneRuntime = zoneState ? zoneState[zoneData.zone_id] : undefined
      const threatLevel = zoneRuntime?.threat_level ?? 0

      if (mapLayers.criticalOnly && threatLevel < threatThreshold) return

      const iconClass = `map-zone-label-icon map-zone-label-icon--${zoneType}`
      const icon = L.divIcon({
        className: '',
        html: `<div class="${iconClass}" style="color:${typeConfig.color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      const marker = L.marker([coords.lat, coords.lon], {
        icon,
        interactive: false,
        pane: 'overlayPane',
      })
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => {
        if (map.hasLayer(m)) map.removeLayer(m)
      })
      markersRef.current = []
    }
  }, [map, mapLayers.zones, mapLayers.criticalOnly, threatThreshold, zones, zoneState])

  return null
}

/* ═══════════════════════════════════════════════
   PULSE OVERLAY (DivIcon-based, zoom-safe animations)
   Uses L.marker with L.divIcon so CSS animations never
   interfere with Leaflet's SVG path transform system.
   ═══════════════════════════════════════════════ */

function PulseOverlay(): null {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)

  useEffect(() => {
    /* Clean previous */
    markersRef.current.forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m)
    })
    markersRef.current = []

    /* Territory pulse rings */
    if (mapLayers.territories && territoryState) {
      Object.entries(territoryState).forEach(([key, territory]) => {
        const isSelected = selectedTerritoryKey === key
        const needsPulse =
          isSelected ||
          territory.status === 'critical' ||
          territory.status === 'high'

        if (!needsPulse) return

        const cssClass = isSelected
          ? 'map-pulse-ring map-pulse-ring--selected'
          : territory.status === 'critical'
            ? 'map-pulse-ring map-pulse-ring--critical'
            : 'map-pulse-ring map-pulse-ring--high'

        const size = isSelected ? 32 : 26

        const icon = L.divIcon({
          className: '',
          html: `<div class="${cssClass}" style="width:${size}px;height:${size}px;"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = L.marker(
          [territory.coords.lat, territory.coords.lon],
          { icon, interactive: false, pane: 'overlayPane' }
        )
        marker.addTo(map)
        markersRef.current.push(marker)
      })
    }

    /* Zone pulse rings */
    if (mapLayers.zones && zoneState && zones) {
      Object.entries(zoneState).forEach(([zoneId, zone]) => {
        const zoneData = zones.find((item) => item.zone_id === zoneId)
        const coords = zoneData?.coords
        if (!coords) return

        const status = threatLevelToStatus(zone.threat_level)
        const isSelected = selectedZoneId === zoneId
        const needsPulse =
          isSelected || status === 'critical' || status === 'high'

        if (!needsPulse) return

        const cssClass = isSelected
          ? 'map-pulse-ring map-pulse-ring--selected'
          : status === 'critical'
            ? 'map-pulse-ring map-pulse-ring--critical'
            : 'map-pulse-ring map-pulse-ring--high'

        const size = isSelected ? 24 : 18

        const icon = L.divIcon({
          className: '',
          html: `<div class="${cssClass}" style="width:${size}px;height:${size}px;"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = L.marker(
          [coords.lat, coords.lon],
          { icon, interactive: false, pane: 'overlayPane' }
        )
        marker.addTo(map)
        markersRef.current.push(marker)
      })
    }

    return () => {
      markersRef.current.forEach((m) => {
        if (map.hasLayer(m)) map.removeLayer(m)
      })
      markersRef.current = []
    }
  }, [
    map, mapLayers.territories, mapLayers.zones, territoryState,
    zoneState, zones, selectedTerritoryKey, selectedZoneId,
  ])

  return null
}

/* ═══════════════════════════════════════════════
   INCIDENT MARKERS
   ═══════════════════════════════════════════════ */

function IncidentMarkers(): ReactNode {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)

  useEffect(() => {
    markersRef.current.forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m)
    })
    markersRef.current = []

    if (!mapLayers.zones || !zoneState || !zones) return

    Object.entries(zoneState).forEach(([zoneId, zone]) => {
      if (!zone.incidents || zone.incidents.length === 0) return

      const zoneData = zones.find((item) => item.zone_id === zoneId)
      const coords = zoneData?.coords
      if (!coords) return

      const isCritical = zone.threat_level >= 75
      const incidentCount = zone.incidents.length
      const territoryKey = zoneData?.territory_key ?? null
      const territoryName = territoryKey ? resolveTerritoryName(content, territoryKey) : 'Unknown territory'
      const flagHtml = territoryFlagMarkup(content, territoryKey, territoryName)

      const icon = L.divIcon({
        className: 'map-incident-marker',
        html: isCritical
          ? '<div class="map-incident-diamond"></div>'
          : '<div class="map-incident-triangle"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      const marker = L.marker([coords.lat, coords.lon], { icon, interactive: true })
      marker.bindTooltip(
        `<div class="map-zone-tooltip">` +
        `<div class="map-tooltip-title">${resolveZoneName(content, zoneId)}</div>` +
        `<div class="map-tooltip-territory">` +
        `${flagHtml}` +
        `<span>${territoryName}</span>` +
        `</div>` +
        `<div class="map-tooltip-row">${incidentCount > 1 ? 'Incidents' : 'Incident'}: ${incidentCount}</div>` +
        `<div class="map-tooltip-row">Threat: ${zone.threat_level}</div>` +
        `</div>`,
        { direction: 'top', opacity: 0.95, className: 'map-enhanced-tooltip' }
      )
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => {
        if (map.hasLayer(m)) map.removeLayer(m)
      })
      markersRef.current = []
    }
  }, [map, zoneState, zones, content, mapLayers.zones])

  return null
}

/* ═══════════════════════════════════════════════
   ADJACENCY LINES (zone-to-zone network topology)
   ═══════════════════════════════════════════════ */

function AdjacencyLines(): ReactNode {
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)

  if (!mapLayers.zones) return null
  if (!zoneState || !zones) return null

  const coordsMap: Record<string, { lat: number; lon: number }> = {}
  zones.forEach((z) => {
    if (z.coords) coordsMap[z.zone_id] = z.coords
  })

  /* Deduplicate edges: only draw A→B once, not both A→B and B→A */
  const drawnEdges = new Set<string>()
  const lines: { key: string; positions: [number, number][]; color: string; isSelected: boolean }[] = []

  zones.forEach((zoneData) => {
    const fromId = zoneData.zone_id
    const fromCoords = coordsMap[fromId]
    if (!fromCoords) return

    const adjacentZones = (zoneData.adjacent_zones as string[]) ?? []
    const fromRuntime = zoneState[fromId]
    const fromThreat = fromRuntime?.threat_level ?? 0

    adjacentZones.forEach((toId) => {
      const edgeKey = [fromId, toId].sort().join('--')
      if (drawnEdges.has(edgeKey)) return
      drawnEdges.add(edgeKey)

      const toCoords = coordsMap[toId]
      if (!toCoords) return

      const toRuntime = zoneState[toId]
      const toThreat = toRuntime?.threat_level ?? 0

      /* Use the higher threat color for the link */
      const maxThreat = Math.max(fromThreat, toThreat)
      const maxStatus = threatLevelToStatus(maxThreat)
      const isSelected = selectedZoneId === fromId || selectedZoneId === toId

      lines.push({
        key: `adj-${edgeKey}`,
        positions: [
          [fromCoords.lat, fromCoords.lon],
          [toCoords.lat, toCoords.lon],
        ],
        color: STATUS_COLORS[maxStatus],
        isSelected,
      })
    })
  })

  return (
    <>
      {lines.map((line) => (
        <Polyline
          key={line.key}
          positions={line.positions}
          pathOptions={{
            color: line.color,
            weight: line.isSelected ? 2 : 1,
            opacity: line.isSelected ? 0.55 : 0.20,
            dashArray: '4 6',
            className: `map-adjacency-line${line.isSelected ? ' is-selected' : ''}`,
          }}
        />
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════
   CONNECTION LINES (territory-to-zone spokes)
   Kept as a secondary layer behind adjacency lines.
   ═══════════════════════════════════════════════ */

function ConnectionLines(): ReactNode {
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)

  if (!mapLayers.zones || !mapLayers.territories) return null
  if (!territoryState || !zoneState || !zones) return null

  const lines: { key: string; positions: [number, number][]; color: string }[] = []

  Object.entries(zoneState).forEach(([zoneId, zone]) => {
    const territory = territoryFromState(territoryState, zone.territory_key)
    if (!territory) return

    const zoneData = zones.find((item) => item.zone_id === zoneId)
    const coords = zoneData?.coords
    if (!coords) return

    const status = threatLevelToStatus(zone.threat_level)
    lines.push({
      key: `conn-${zoneId}`,
      positions: [
        [territory.coords.lat, territory.coords.lon],
        [coords.lat, coords.lon],
      ],
      color: STATUS_COLORS[status],
    })
  })

  return (
    <>
      {lines.map((line) => (
        <Polyline
          key={line.key}
          positions={line.positions}
          pathOptions={{
            color: line.color,
            weight: 1,
            opacity: 0.15,
            dashArray: '6 4',
            className: 'map-connection-line',
          }}
        />
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════
   MINIMAP
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   FOG OF WAR
   ═══════════════════════════════════════════════ */

function FogOfWarOverlay(): ReactNode {
  return <div className="map-fog-overlay" />
}

/* ═══════════════════════════════════════════════
   LEGEND CONTROLS — FULL TACTICAL OPS PANEL
   ═══════════════════════════════════════════════ */

function MapLegendControls(): ReactNode {
  const mapLayers = useUiStore((s) => s.mapLayers)
  const setMapLayer = useUiStore((s) => s.setMapLayer)
  const clearMapSelection = useUiStore((s) => s.clearMapSelection)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedTerritory = useUiStore((s) => s.setSelectedTerritory)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const threatThreshold = useUiStore((s) => s.mapThreatThreshold)
  const setMapThreatThreshold = useUiStore((s) => s.setMapThreatThreshold)
  const openModal = useUiStore((s) => s.openModal)
  const content = useGameStore((s) => s.state.content)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const currentTurn = useGameStore((s) => s.state.session.turn)

  /* ── Computed aggregates ── */
  const stats = useMemo(() => {
    const territories = territoryState ? Object.values(territoryState) : []
    const zones = zoneState ? Object.values(zoneState) : []
    const totalTerritories = territories.length
    const totalZones = zones.length
    const criticalZones = zones.filter((z) => z.threat_level >= 75).length
    const totalIncidents = zones.reduce((sum, z) => sum + (z.incidents?.length ?? 0), 0)
    const totalDisplaced = zones.reduce((sum, z) => sum + (z.displaced ?? 0), 0)

    const statusCounts: Record<TerritoryStatus, number> = { low: 0, moderate: 0, high: 0, critical: 0 }
    territories.forEach((t) => {
      if (statusCounts[t.status] !== undefined) statusCounts[t.status]++
    })

    return { totalTerritories, totalZones, criticalZones, totalIncidents, totalDisplaced, statusCounts }
  }, [territoryState, zoneState])

  /* ── Zone type counts ── */
  const zoneTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const zones = content?.zones?.zones ?? []
    zones.forEach((z: { zone_type?: string }) => {
      const zt = z.zone_type ?? 'unknown'
      counts[zt] = (counts[zt] ?? 0) + 1
    })
    return counts
  }, [content])

  /* ── Incident feed (most recent 5) ── */
  const incidentFeed = useMemo(() => {
    if (!zoneState) return []
    const items: { zoneId: string; zoneName: string; threatLevel: number; isCritical: boolean }[] = []
    Object.entries(zoneState).forEach(([zoneId, zone]) => {
      if (zone.incidents && zone.incidents.length > 0) {
        items.push({
          zoneId,
          zoneName: resolveZoneName(content, zoneId),
          threatLevel: zone.threat_level,
          isCritical: zone.threat_level >= 75,
        })
      }
    })
    return items.sort((a, b) => b.threatLevel - a.threatLevel).slice(0, 5)
  }, [zoneState, content])

  /* ── Territory list with synthetic sparkline data ── */
  const territoryList = useMemo(() => {
    if (!territoryState) return []
    return Object.entries(territoryState).map(([key, t]) => {
      /* Generate synthetic sparkline from stability ± random jitter */
      const base = t.stability ?? 50
      const sparkValues = Array.from({ length: 6 }, (_, i) =>
        Math.max(0, Math.min(100, base + (Math.sin(i * 1.2 + base * 0.1) * 12) + (i - 3) * 2))
      )
      return { key, territory: t, sparkValues }
    })
  }, [territoryState])

  /* ── Pan to territory on quick-list click ── */
  const handleTerritoryClick = useCallback(
    (territoryKey: string, coords: { lat: number; lon: number }) => {
      playSelectSound()
      setSelectedTerritory(territoryKey)
      setSelectedZone(null)

      if (SharedMapRef.current) {
        SharedMapRef.current.flyTo([coords.lat, coords.lon], 7, { duration: 0.8 })
      }
    },
    [setSelectedTerritory, setSelectedZone]
  )

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'l':
          setMapLayer('territories', !mapLayers.territories)
          break
        case 'z':
          setMapLayer('zones', !mapLayers.zones)
          break
        case 'escape':
          clearMapSelection()
          break
        case 'c':
          if (mapLayers.zones) setMapLayer('criticalOnly', !mapLayers.criticalOnly)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mapLayers, setMapLayer, clearMapSelection])

  /* ── Selection display name ── */
  const selectionName = selectedZoneId
    ? resolveZoneName(content, selectedZoneId)
    : selectedTerritoryKey
      ? resolveTerritoryName(content, selectedTerritoryKey)
      : null

  const hasSelection = selectedTerritoryKey !== null || selectedZoneId !== null

  return (
    <div className="map-legend-panel">
      {/* ── Header Bar ── */}
      <div className="map-legend-header">
        <RadarIcon />
        <span className="map-legend-title">Sahel Command</span>
        <span className="map-legend-turn-badge">Turn {currentTurn}</span>
      </div>

      <div className="map-legend-body">
        {/* ═══ INTEL SUMMARY (Live Stat Counters) ═══ */}
        <LegendSection title="Intel Summary" defaultOpen={false}>
          <div className="map-legend-stat-grid">
            <div className="map-legend-stat-card">
              <span className="map-legend-stat-number">{stats.totalTerritories}</span>
              <span className="map-legend-stat-desc">Territories</span>
            </div>
            <div className="map-legend-stat-card">
              <span className="map-legend-stat-number">{stats.totalZones}</span>
              <span className="map-legend-stat-desc">Zones</span>
            </div>
            <div className={`map-legend-stat-card${stats.criticalZones > 0 ? ' is-alert' : ''}`}>
              <span className={`map-legend-stat-number${stats.criticalZones > 0 ? ' is-critical' : ''}`}>
                {stats.criticalZones}
              </span>
              <span className="map-legend-stat-desc">Critical</span>
            </div>
            <div className={`map-legend-stat-card${stats.totalIncidents > 0 ? ' is-alert' : ''}`}>
              <span className={`map-legend-stat-number${stats.totalIncidents > 0 ? ' is-critical' : ''}`}>
                {stats.totalIncidents}
              </span>
              <span className="map-legend-stat-desc">Incidents</span>
            </div>
            <div className="map-legend-stat-card full-width">
              <span className="map-legend-stat-desc">Displaced</span>
              <span className="map-legend-stat-number">{stats.totalDisplaced.toLocaleString()}</span>
            </div>
          </div>
        </LegendSection>

        {/* ═══ LAYERS & FILTERS ═══ */}
        <LegendSection title="Layers" defaultOpen={false}>
          <label className="map-legend-toggle">
            <input
              type="checkbox"
              checked={mapLayers.territories}
              onChange={(event) => setMapLayer('territories', event.target.checked)}
            />
            <span>Territories</span>
          </label>
          <label className="map-legend-toggle">
            <input
              type="checkbox"
              checked={mapLayers.zones}
              onChange={(event) => setMapLayer('zones', event.target.checked)}
            />
            <span>Zones</span>
          </label>
          <label className="map-legend-toggle">
            <input
              type="checkbox"
              checked={mapLayers.criticalOnly}
              onChange={(event) => setMapLayer('criticalOnly', event.target.checked)}
              disabled={!mapLayers.zones}
            />
            <span>Critical only</span>
          </label>

          {/* Threat-Level Slider */}
          {mapLayers.zones && mapLayers.criticalOnly && (
            <div className="map-legend-slider-row">
              <div className="map-legend-slider-header">
                <span className="map-legend-slider-label">Threat Threshold</span>
                <span className="map-legend-slider-value">{threatThreshold}</span>
              </div>
              <input
                type="range"
                className="map-legend-slider-input"
                min={0}
                max={100}
                value={threatThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setMapThreatThreshold(val)
                }}
              />
            </div>
          )}
        </LegendSection>

        {/* ═══ STATUS KEY (with counts) ═══ */}
        <LegendSection title="Status Key" defaultOpen={false}>
          {(['low', 'moderate', 'high', 'critical'] as TerritoryStatus[]).map((status) => (
            <div className="map-legend-status-row" key={status}>
              <div className="map-legend-status-dot" data-status={status} />
              <span className="map-legend-status-label">{status}</span>
              <span className="map-legend-status-count">{stats.statusCounts[status]}</span>
            </div>
          ))}
        </LegendSection>

        {/* ═══ ZONE TYPE KEY (new section) ═══ */}
        <LegendSection title="Zone Types" defaultOpen={false}>
          {(Object.entries(ZONE_TYPE_CONFIG) as [ZoneType, ZoneTypeConfig][]).map(([zoneType, config]) => (
            <div className="map-legend-zonetype-row" key={zoneType}>
              <div className="map-legend-zonetype-icon" style={{ color: config.color }}>
                {zoneTypeIcon(zoneType)}
              </div>
              <span className="map-legend-zonetype-label">{config.label}</span>
              <span className="map-legend-zonetype-count">{zoneTypeCounts[zoneType] ?? 0}</span>
            </div>
          ))}
        </LegendSection>

        {/* ═══ TERRITORY QUICK-LIST (with sparklines) ═══ */}
        <LegendSection title="Territories" defaultOpen={false}>
          <div className="map-legend-territory-list">
            {territoryList.map(({ key, territory, sparkValues }) => (
              <div
                key={key}
                className={`map-legend-territory-item${selectedTerritoryKey === key ? ' is-selected' : ''}`}
                onClick={() => handleTerritoryClick(key, territory.coords)}
              >
                <div
                  className="map-legend-territory-dot"
                  style={{ background: STATUS_COLORS[territory.status] }}
                />
                <span className="map-legend-territory-name">{territory.name}</span>
                <Sparkline values={sparkValues} color={STATUS_COLORS[territory.status]} />
                <span className="map-legend-territory-stability">{territory.stability}</span>
              </div>
            ))}
          </div>
        </LegendSection>

        {/* ═══ INCIDENT FEED ═══ */}
        <LegendSection title="Active Incidents" defaultOpen={false}>
          <div className="map-legend-feed">
            {incidentFeed.length === 0 ? (
              <div className="map-legend-feed-empty">No active incidents</div>
            ) : (
              incidentFeed.map((item, idx) => (
                <div
                  key={`${item.zoneId}-${idx}`}
                  className="map-legend-feed-item"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className={`map-legend-feed-icon${item.isCritical ? '' : ' is-warning'}`} />
                  <div className="map-legend-feed-body">
                    <div className="map-legend-feed-zone">{item.zoneName}</div>
                    <div className="map-legend-feed-meta">Threat: {item.threatLevel}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </LegendSection>

        {/* ═══ SELECTION & CONTEXTUAL ACTIONS ═══ */}
        <LegendSection title="Selection" defaultOpen={false}>
          <div className="map-selection-summary">
            <div className="map-selection-label">Active Target</div>
            <div className={`map-selection-value${selectionName ? '' : ' is-none'}`}>
              {selectionName ?? 'None'}
            </div>
          </div>

          {hasSelection && (
            <>
              <div className="map-legend-actions">
                <button
                  type="button"
                  className="map-legend-action-btn"
                  onClick={() => {
                    openModal(selectedZoneId ? 'zone_detail' : 'territory_overview')
                  }}
                >
                  <CrosshairIcon />
                  Intel
                </button>
                <button
                  type="button"
                  className="map-legend-action-btn"
                  onClick={() => {
                    openModal('action_config')
                  }}
                >
                  <ShieldIcon />
                  Deploy
                </button>
              </div>
              <button
                type="button"
                className="map-clear-selection-btn"
                onClick={clearMapSelection}
              >
                Clear selection
              </button>
            </>
          )}
        </LegendSection>
      </div>

      {/* ═══ KEYBOARD SHORTCUTS ═══ */}
      <div className="map-legend-shortcuts">
        <div className="map-legend-shortcut">
          <span className="map-legend-shortcut-key">L</span>
          <span className="map-legend-shortcut-desc">Layers</span>
        </div>
        <div className="map-legend-shortcut">
          <span className="map-legend-shortcut-key">Z</span>
          <span className="map-legend-shortcut-desc">Zones</span>
        </div>
        <div className="map-legend-shortcut">
          <span className="map-legend-shortcut-key">C</span>
          <span className="map-legend-shortcut-desc">Critical</span>
        </div>
        <div className="map-legend-shortcut">
          <span className="map-legend-shortcut-key">Esc</span>
          <span className="map-legend-shortcut-desc">Deselect</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN MAP VIEW
   ═══════════════════════════════════════════════ */

export function MapView(): ReactNode {
  return (
    <div className="map-view">
      <FogOfWarOverlay />
      <MapLegendControls />
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom
      >
        <MapInstanceCapture />
        <TileLayer
          attribution={DARK_TILE_ATTR}
          url={DARK_TILE_URL}
        />
        <NeighbourGeoJSONLayer />
        <SahelGeoJSONLayer />
        <ZoneGeoJSONLayer />
        <ConnectionLines />
        <AdjacencyLines />
        <PulseOverlay />
        <TerritoryMarkers />
        <ZoneMarkers />
        <ZoneTypeLabelMarkers />
        <IncidentMarkers />
      </MapContainer>
    </div>
  )
}
