import { useEffect, useRef, useState, useMemo, useCallback, type ReactNode } from 'react'
import { MapContainer, TileLayer, useMap, CircleMarker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'
import { useGameStore } from '../state/gameStore'
import { useUiStore } from '../state/uiStore'
import { resolveTerritoryName, resolveZoneName, threatLevelToStatus } from '../state/selectors'
import type { TerritoryKey, TerritoryState, TerritoryStatus, ZoneState } from '../state/types'

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

/* ═══════════════════════════════════════════════
   SHARED MAP INSTANCE REF (for legend → map pan)
   ═══════════════════════════════════════════════ */

const SharedMapRef: { current: L.Map | null } = { current: null }

/** Small component inside MapContainer that exposes the map instance */
function MapInstanceCapture(): null {
  const map = useMap()
  useEffect(() => {
    SharedMapRef.current = map
    return () => {
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

function territoryFromState(
  territoryState: Record<TerritoryKey, TerritoryState> | undefined,
  territoryKey: string | null
): TerritoryState | undefined {
  if (!territoryState || !territoryKey) return undefined
  if (!Object.prototype.hasOwnProperty.call(territoryState, territoryKey)) return undefined
  return territoryState[territoryKey as TerritoryKey]
}

function ensureHatchPattern(map: L.Map): void {
  const container = map.getContainer()
  if (container.querySelector('#sahel-hatch-defs')) return

  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('id', 'sahel-hatch-defs')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'

  const defs = document.createElementNS(svgNS, 'defs')
  const pattern = document.createElementNS(svgNS, 'pattern')
  pattern.setAttribute('id', 'hatch-critical')
  pattern.setAttribute('patternUnits', 'userSpaceOnUse')
  pattern.setAttribute('width', '8')
  pattern.setAttribute('height', '8')
  pattern.setAttribute('patternTransform', 'rotate(45)')

  const line = document.createElementNS(svgNS, 'line')
  line.setAttribute('x1', '0')
  line.setAttribute('y1', '0')
  line.setAttribute('x2', '0')
  line.setAttribute('y2', '8')
  line.setAttribute('stroke', 'rgba(168, 50, 50, 0.35)')
  line.setAttribute('stroke-width', '2')

  pattern.appendChild(line)
  defs.appendChild(pattern)
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
  defaultOpen = true,
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
   GEOJSON LAYER
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

    ensureHatchPattern(map)

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

        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const territoryKey = feature ? territoryKeyFromFeature(feature) : null
            const territory = territoryFromState(territoryState, territoryKey)
            const status: TerritoryStatus = territory?.status ?? 'moderate'
            const isSelected = territoryKey !== null && territoryKey === selectedTerritoryKey
            const isCritical = status === 'critical' || status === 'high'

            return {
              color: STATUS_COLORS[status],
              weight: isSelected ? 3 : 1.5,
              fillColor: STATUS_COLORS[status],
              fillOpacity: isSelected ? 0.25 : isCritical ? 0.14 : 0.08,
              dashArray: isCritical ? '6 3' : undefined,
              className: isCritical ? 'map-hatch-overlay' : undefined,
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

            layerNode.bindTooltip(
              `<b>${territoryName}</b><br/>` +
              `Status: <span style="color:${STATUS_COLORS[status]}">${status.toUpperCase()}</span><br/>` +
              `Stability: ${stability} &middot; Insurgency: ${insurgency}`,
              { direction: 'top', opacity: 0.95, className: '' }
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
   ZONE POPUP CONTENT
   ═══════════════════════════════════════════════ */

function ZonePopupContent({
  zoneName,
  territoryName,
  zone,
  status,
  onOpen,
}: {
  zoneName: string
  territoryName: string
  zone: ZoneState
  status: TerritoryStatus
  onOpen: () => void
}): ReactNode {
  return (
    <div className="map-popup-card" data-status={status}>
      <div className="map-popup-header">
        <span className="map-popup-title">{zoneName}</span>
        <span className="map-popup-badge" data-status={status}>{status}</span>
      </div>
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
        <span className="map-popup-meta-item">
          Displaced: <span className="map-popup-meta-count">{zone.displaced.toLocaleString()}</span>
        </span>
        {zone.incidents.length > 0 && (
          <span className="map-popup-meta-item">
            Incidents: <span className="map-popup-meta-count">{zone.incidents.length}</span>
          </span>
        )}
      </div>
      <button type="button" className="map-popup-btn" onClick={onOpen}>
        Open Zone Detail
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ZONE MARKERS
   ═══════════════════════════════════════════════ */

function ZoneMarkers(): ReactNode {
  const zoneState = useGameStore((s) => s.state.zone_state)
  const content = useGameStore((s) => s.state.content)
  const zones = content?.zones?.zones
  const mapLayers = useUiStore((s) => s.mapLayers)
  const threatThreshold = 75
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
        `<b>${incidentCount > 1 ? 'Incidents' : 'Incident'}</b><br/>Zone: ${resolveZoneName(content, zoneId)}<br/>Count: ${incidentCount}<br/>Threat: ${zone.threat_level}`,
        { direction: 'top', opacity: 0.95 }
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
   CONNECTION LINES
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
            opacity: 0.25,
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

function MinimapControl(): null {
  const map = useMap()
  const minimapRef = useRef<L.Map | null>(null)
  const viewportRef = useRef<L.Rectangle | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = L.DomUtil.create('div', 'map-minimap-container')
    container.id = 'minimap-container'
    map.getContainer().appendChild(container)
    containerRef.current = container

    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)

    const minimap = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    }).setView(MAP_CENTER, 3)

    L.tileLayer(DARK_TILE_URL, { attribution: '' }).addTo(minimap)
    minimapRef.current = minimap

    const updateViewport = (): void => {
      const bounds = map.getBounds()
      if (viewportRef.current) {
        viewportRef.current.setBounds(bounds)
      } else {
        viewportRef.current = L.rectangle(bounds, {
          color: '#d4af37',
          weight: 1.5,
          fillColor: 'rgba(212, 175, 55, 0.08)',
          fillOpacity: 1,
          className: 'map-minimap-viewport',
          interactive: false,
        }).addTo(minimap)
      }
    }

    updateViewport()
    map.on('moveend zoomend', updateViewport)

    return () => {
      map.off('moveend zoomend', updateViewport)
      if (minimapRef.current) { minimapRef.current.remove(); minimapRef.current = null }
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current)
        containerRef.current = null
      }
      viewportRef.current = null
    }
  }, [map])

  return null
}

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
  const openModal = useUiStore((s) => s.openModal)
  const content = useGameStore((s) => s.state.content)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const currentTurn = useGameStore((s) => s.state.session.turn)

  /* Threat slider local state (falls back to uiStore if wired) */
  const [threatThreshold, setThreatThreshold] = useState(75)

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
        <LegendSection title="Intel Summary" defaultOpen={true}>
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
        <LegendSection title="Layers" defaultOpen={true}>
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
                  setThreatThreshold(val)
                  /* If uiStore has a setThreatThreshold, wire it here */
                }}
              />
            </div>
          )}
        </LegendSection>

        {/* ═══ STATUS KEY (with counts) ═══ */}
        <LegendSection title="Status Key" defaultOpen={true}>
          {(['low', 'moderate', 'high', 'critical'] as TerritoryStatus[]).map((status) => (
            <div className="map-legend-status-row" key={status}>
              <div className="map-legend-status-dot" data-status={status} />
              <span className="map-legend-status-label">{status}</span>
              <span className="map-legend-status-count">{stats.statusCounts[status]}</span>
            </div>
          ))}
        </LegendSection>

        {/* ═══ TERRITORY QUICK-LIST (with sparklines) ═══ */}
        <LegendSection title="Territories" defaultOpen={true}>
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
        <LegendSection title="Active Incidents" defaultOpen={true}>
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
        <LegendSection title="Selection" defaultOpen={true}>
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
        scrollWheelZoom
      >
        <MapInstanceCapture />
        <TileLayer
          attribution={DARK_TILE_ATTR}
          url={DARK_TILE_URL}
        />
        <SahelGeoJSONLayer />
        <ConnectionLines />
        <PulseOverlay />
        <TerritoryMarkers />
        <ZoneMarkers />
        <IncidentMarkers />
        <MinimapControl />
      </MapContainer>
    </div>
  )
}
