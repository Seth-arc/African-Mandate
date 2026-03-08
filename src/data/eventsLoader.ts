import type { EventsContent, EventData, EventEffectsData, EventOutcomeData, PenaltyBundleData } from '../state/types'

type YamlValue = string | number | boolean | null | YamlObject | YamlArray
interface YamlObject {
  [key: string]: YamlValue
}
interface YamlArray extends Array<YamlValue> {}

function isYamlObject(value: YamlValue): value is YamlObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseScalar(value: string): YamlValue {
  const trimmed = value.trim()
  if (trimmed === 'null') return null
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === '{}') return {}
  if (trimmed === '[]') return []
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)

  const quote = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  if ((quote === '"' || quote === "'") && last === quote) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function lineIndent(line: string): number {
  let index = 0
  while (index < line.length && line[index] === ' ') {
    index += 1
  }
  return index
}

function splitKeyValue(text: string): { key: string; value: string | null } | null {
  const delimiter = text.indexOf(':')
  if (delimiter <= 0) return null
  const key = text.slice(0, delimiter).trim()
  const rawValue = text.slice(delimiter + 1)
  const value = rawValue.trim()
  return {
    key,
    value: value.length === 0 ? null : value,
  }
}

function looksLikeKeyValue(text: string): boolean {
  return splitKeyValue(text) !== null
}

function nextSignificantLine(lines: string[], fromIndex: number): number {
  let index = fromIndex
  while (index < lines.length) {
    const trimmed = lines[index]?.trim() ?? ''
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      return index
    }
    index += 1
  }
  return lines.length
}

function consumeScalarContinuation(
  lines: string[],
  startIndex: number,
  parentIndent: number,
  initial: string
): { value: string; nextIndex: number } {
  let value = initial
  let index = startIndex + 1
  while (index < lines.length) {
    const raw = lines[index]
    if (!raw) {
      index += 1
      continue
    }
    const trimmed = raw.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      index += 1
      continue
    }
    const indent = lineIndent(raw)
    if (indent <= parentIndent) {
      break
    }
    if (trimmed.startsWith('- ') || looksLikeKeyValue(trimmed)) {
      break
    }
    value = `${value} ${trimmed}`
    index += 1
  }
  return { value, nextIndex: index }
}

function parseObjectBlock(
  lines: string[],
  startIndex: number,
  indent: number,
  seed?: YamlObject
): { value: YamlObject; nextIndex: number } {
  const result: YamlObject = seed ?? {}
  let index = startIndex

  while (index < lines.length) {
    index = nextSignificantLine(lines, index)
    if (index >= lines.length) break

    const raw = lines[index] ?? ''
    const currentIndent = lineIndent(raw)
    if (currentIndent < indent) break
    if (currentIndent > indent) break

    const trimmed = raw.trim()
    if (trimmed.startsWith('- ')) break

    const keyValue = splitKeyValue(trimmed)
    if (!keyValue) break
    const { key, value } = keyValue

    if (value === null) {
      const nestedStart = nextSignificantLine(lines, index + 1)
      if (nestedStart < lines.length) {
        const nestedLine = lines[nestedStart] ?? ''
        const nestedIndent = lineIndent(nestedLine)
        const nestedTrimmed = nestedLine.trim()
        const sameIndentSequence = nestedIndent === currentIndent && nestedTrimmed.startsWith('- ')
        if (nestedIndent > currentIndent || sameIndentSequence) {
          const nested = parseYamlBlock(lines, nestedStart, nestedIndent)
          result[key] = nested.value
          index = nested.nextIndex
          continue
        }
      }
      result[key] = null
      index += 1
      continue
    }

    const scalar = consumeScalarContinuation(lines, index, currentIndent, value)
    result[key] = parseScalar(scalar.value)
    index = scalar.nextIndex
  }

  return { value: result, nextIndex: index }
}

function parseArrayBlock(
  lines: string[],
  startIndex: number,
  indent: number
): { value: YamlValue[]; nextIndex: number } {
  const items: YamlValue[] = []
  let index = startIndex

  while (index < lines.length) {
    index = nextSignificantLine(lines, index)
    if (index >= lines.length) break

    const raw = lines[index] ?? ''
    const currentIndent = lineIndent(raw)
    if (currentIndent < indent) break
    if (currentIndent !== indent) break

    const trimmed = raw.trim()
    if (!trimmed.startsWith('- ')) break

    const entryText = trimmed.slice(2).trim()

    if (entryText.length === 0) {
      const nestedStart = nextSignificantLine(lines, index + 1)
      if (nestedStart < lines.length && lineIndent(lines[nestedStart] ?? '') > currentIndent) {
        const nested = parseYamlBlock(lines, nestedStart, lineIndent(lines[nestedStart] ?? ''))
        items.push(nested.value)
        index = nested.nextIndex
        continue
      }
      items.push(null)
      index += 1
      continue
    }

    const keyValue = splitKeyValue(entryText)
    if (keyValue) {
      const objectItem: YamlObject = {}
      if (keyValue.value === null) {
        const nestedStart = nextSignificantLine(lines, index + 1)
        if (nestedStart < lines.length && lineIndent(lines[nestedStart] ?? '') > currentIndent) {
          const nested = parseYamlBlock(lines, nestedStart, lineIndent(lines[nestedStart] ?? ''))
          objectItem[keyValue.key] = nested.value
          index = nested.nextIndex
        } else {
          objectItem[keyValue.key] = null
          index += 1
        }
      } else {
        const scalar = consumeScalarContinuation(lines, index, currentIndent, keyValue.value)
        objectItem[keyValue.key] = parseScalar(scalar.value)
        index = scalar.nextIndex
      }

      const childStart = nextSignificantLine(lines, index)
      if (childStart < lines.length) {
        const childIndent = lineIndent(lines[childStart] ?? '')
        if (childIndent > currentIndent) {
          const merged = parseObjectBlock(lines, childStart, childIndent, objectItem)
          items.push(merged.value)
          index = merged.nextIndex
          continue
        }
      }

      items.push(objectItem)
      continue
    }

    const scalar = consumeScalarContinuation(lines, index, currentIndent, entryText)
    items.push(parseScalar(scalar.value))
    index = scalar.nextIndex
  }

  return { value: items, nextIndex: index }
}

function parseYamlBlock(
  lines: string[],
  startIndex: number,
  indent: number
): { value: YamlValue; nextIndex: number } {
  const line = lines[startIndex] ?? ''
  const trimmed = line.trim()
  if (trimmed.startsWith('- ')) {
    return parseArrayBlock(lines, startIndex, indent)
  }
  return parseObjectBlock(lines, startIndex, indent)
}

function asString(value: YamlValue | undefined, path: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid events.yaml at ${path}: expected string`)
  }
  return value
}

function asNumber(value: YamlValue | undefined, path: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected number`)
  }
  return value
}

function asBoolean(value: YamlValue | undefined, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid events.yaml at ${path}: expected boolean`)
  }
  return value
}

function asNumberOrNull(value: YamlValue | undefined, path: string): number | null {
  if (value === null) return null
  if (value === undefined) {
    throw new Error(`Invalid events.yaml at ${path}: expected number | null`)
  }
  return asNumber(value, path)
}

function asStringArray(value: YamlValue, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected string[]`)
  }
  return value.map((item, index) => asString(item, `${path}[${index}]`))
}

function asNumberRecord(value: YamlValue, path: string): Record<string, number> {
  if (!isYamlObject(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected object`)
  }
  const record: Record<string, number> = {}
  for (const [key, item] of Object.entries(value)) {
    record[key] = asNumber(item, `${path}.${key}`)
  }
  return record
}

function asEffects(value: YamlValue, path: string): EventEffectsData {
  if (!isYamlObject(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected effects object`)
  }
  return {
    metrics: asNumberRecord(value.metrics ?? {}, `${path}.metrics`),
    resources: asNumberRecord(value.resources ?? {}, `${path}.resources`),
  }
}

function asOutcome(value: YamlValue, path: string): EventOutcomeData {
  if (!isYamlObject(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected outcomes object`)
  }
  return {
    effects: asEffects(value.effects ?? {}, `${path}.effects`),
    followup_events: asStringArray(value.followup_events ?? [], `${path}.followup_events`),
    flags: asStringArray(value.flags ?? [], `${path}.flags`),
  }
}

function asPenaltyBundle(value: YamlValue, path: string): PenaltyBundleData {
  if (!isYamlObject(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected penalty bundle object`)
  }
  return {
    effects: asEffects(value.effects ?? {}, `${path}.effects`),
    flags: asStringArray(value.flags ?? [], `${path}.flags`),
  }
}

function asEventData(value: YamlValue, path: string): EventData {
  if (!isYamlObject(value)) {
    throw new Error(`Invalid events.yaml at ${path}: expected event object`)
  }
  return {
    event_id: asString(value.event_id, `${path}.event_id`),
    event_type: asString(value.event_type, `${path}.event_type`),
    category: asString(value.category, `${path}.category`),
    priority: asNumber(value.priority, `${path}.priority`),
    trigger_conditions: asString(value.trigger_conditions, `${path}.trigger_conditions`),
    trigger_turn: asNumber(value.trigger_turn, `${path}.trigger_turn`),
    deadline_turn: asNumberOrNull(value.deadline_turn, `${path}.deadline_turn`),
    deadline_offset: asNumberOrNull(value.deadline_offset, `${path}.deadline_offset`),
    failure_on_deadline: asBoolean(value.failure_on_deadline, `${path}.failure_on_deadline`),
    narrative_text_key: asString(value.narrative_text_key, `${path}.narrative_text_key`),
    outcomes: asOutcome(value.outcomes ?? {}, `${path}.outcomes`),
    penalty_bundle: asPenaltyBundle(value.penalty_bundle ?? {}, `${path}.penalty_bundle`),
  }
}

export function parseEventsYaml(rawYaml: string): EventsContent {
  const normalized = rawYaml.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/)
  const start = nextSignificantLine(lines, 0)
  if (start >= lines.length) {
    return { events: [] }
  }

  const parsed = parseYamlBlock(lines, start, lineIndent(lines[start] ?? ''))
  if (!isYamlObject(parsed.value)) {
    throw new Error('Invalid events.yaml root: expected object')
  }

  const eventsNode = parsed.value.events
  if (!Array.isArray(eventsNode)) {
    throw new Error('Invalid events.yaml root: expected events[]')
  }

  return {
    events: eventsNode.map((entry, index) => asEventData(entry, `events[${index}]`)),
  }
}
