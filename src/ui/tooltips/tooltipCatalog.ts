import tooltipDatasetJson from '../../data/ui_tooltips.json'

export interface UiTooltipDefinition {
  id: string
  title: string
  description: string
}

interface UiTooltipDataset {
  version: string
  schema_version: string
  updated_at: string
  tooltips: UiTooltipDefinition[]
}

const tooltipDataset = tooltipDatasetJson as UiTooltipDataset
const tooltipIndex = new Map<string, UiTooltipDefinition>(
  tooltipDataset.tooltips.map((entry) => [entry.id, entry] as const)
)

export function resolveUiTooltip(id: string | null | undefined): UiTooltipDefinition | null {
  if (!id) return null
  return tooltipIndex.get(id) ?? null
}

export function listUiTooltips(): UiTooltipDefinition[] {
  return [...tooltipDataset.tooltips]
}
