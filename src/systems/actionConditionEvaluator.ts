import type { GameState, Metrics, Resources } from '../state/types'
import { GameError } from '../state/types'
import { getActFromTurn } from './turnEngine'

type ConditionLiteral = string | number | boolean
type Comparator = '==' | '!=' | '<' | '<=' | '>' | '>='

interface AtomicCondition {
  path: string
  comparator: Comparator
  literal: ConditionLiteral
}

interface ParsedCondition {
  orGroups: AtomicCondition[][]
}

const METRIC_KEYS: ReadonlyArray<keyof Metrics> = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
]

const RESOURCE_KEYS: ReadonlyArray<keyof Resources> = [
  'budget',
  'political_capital',
  'personnel',
  'intel_points',
  'time_months',
]

const COMPARISON_RE = /^([a-zA-Z_][a-zA-Z0-9_.-]*)\s*(==|!=|<=|>=|<|>)\s*(.+)$/

function parseLiteral(rawLiteral: string): ConditionLiteral {
  const literal = rawLiteral.trim()
  const quoted = /^'([^']*)'$|^"([^"]*)"$/.exec(literal)
  if (quoted) {
    return quoted[1] ?? quoted[2] ?? ''
  }
  if (/^(true|false)$/i.test(literal)) {
    return literal.toLowerCase() === 'true'
  }
  if (/^-?\d+(?:\.\d+)?$/.test(literal)) {
    return Number(literal)
  }
  throw new GameError(`Unsupported action condition literal: ${literal}`, 'INVALID_ACTION_CONDITION')
}

function isSupportedPath(path: string): boolean {
  const [root, second, third] = path.split('.')
  if (!root) return false

  if (root === 'turn' || root === 'act') return second === undefined
  if (METRIC_KEYS.includes(root as keyof Metrics)) return second === undefined
  if (root === 'metrics' && second) return third === undefined && METRIC_KEYS.includes(second as keyof Metrics)
  if (RESOURCE_KEYS.includes(root as keyof Resources)) return second === undefined
  if (root === 'resources' && second) return third === undefined && RESOURCE_KEYS.includes(second as keyof Resources)
  if (root === 'ai_state' && second) return third === undefined && (second === 'opposition_pressure' || second === 'intel_confidence')
  if (root === 'oversight_level' && second) return third === undefined && (second === 'level' || second === 'set_on_turn')
  if (root === 'audit_status' && second) return third === undefined && (second === 'status' || second === 'set_on_turn')
  if (root === 'flags' || root === 'narrative_flags') return second !== undefined && third === undefined

  return false
}

function parseAtomicCondition(expression: string): AtomicCondition {
  const normalized = expression.trim()
  if (normalized.length === 0) {
    throw new GameError('Empty action condition segment', 'INVALID_ACTION_CONDITION')
  }
  if (/[()[\]]/.test(normalized)) {
    throw new GameError(`Unsupported action condition syntax: ${normalized}`, 'INVALID_ACTION_CONDITION')
  }

  const match = COMPARISON_RE.exec(normalized)
  if (!match) {
    throw new GameError(`Unsupported action condition: ${normalized}`, 'INVALID_ACTION_CONDITION')
  }

  const path = match[1] ?? ''
  if (!isSupportedPath(path)) {
    throw new GameError(`Unsupported action condition path: ${path}`, 'INVALID_ACTION_CONDITION')
  }

  return {
    path,
    comparator: match[2] as Comparator,
    literal: parseLiteral(match[3] ?? ''),
  }
}

function parseCondition(condition: string): ParsedCondition {
  const trimmed = condition.trim()
  if (trimmed.length === 0) {
    return { orGroups: [] }
  }

  return {
    orGroups: trimmed.split(/\s+OR\s+/i).map((orSegment) =>
      orSegment.split(/\s+AND\s+/i).map((andSegment) => parseAtomicCondition(andSegment))
    ),
  }
}

function resolvePath(state: GameState, path: string): ConditionLiteral {
  const [root, second] = path.split('.')
  if (!root) return false

  if (root === 'turn') return state.session.turn
  if (root === 'act') return getActFromTurn(state.session.turn)
  if (METRIC_KEYS.includes(root as keyof Metrics)) return state.session.metrics[root as keyof Metrics]
  if (root === 'metrics' && second && METRIC_KEYS.includes(second as keyof Metrics)) {
    return state.session.metrics[second as keyof Metrics]
  }
  if (RESOURCE_KEYS.includes(root as keyof Resources)) return state.session.resources[root as keyof Resources]
  if (root === 'resources' && second && RESOURCE_KEYS.includes(second as keyof Resources)) {
    return state.session.resources[second as keyof Resources]
  }
  if (root === 'ai_state' && second) {
    if (second === 'opposition_pressure' || second === 'intel_confidence') {
      return state.session.ai_state[second]
    }
  }
  if (root === 'oversight_level' && second) {
    if (second === 'level') return state.oversight_level?.level ?? 'none'
    if (second === 'set_on_turn') return state.oversight_level?.set_on_turn ?? 0
  }
  if (root === 'audit_status' && second) {
    if (second === 'status') return state.audit_status?.status ?? 'none'
    if (second === 'set_on_turn') return state.audit_status?.set_on_turn ?? 0
  }
  if ((root === 'flags' || root === 'narrative_flags') && second) {
    return state.narrative_flags?.[second] ?? false
  }

  return state.narrative_flags?.[root] ?? false
}

function compareValues(left: ConditionLiteral, comparator: Comparator, right: ConditionLiteral): boolean {
  if (comparator === '==' || comparator === '!=') {
    const result = left === right
    return comparator === '==' ? result : !result
  }

  if (typeof left !== 'number' || typeof right !== 'number') {
    throw new GameError('Action condition ordering comparisons require numeric operands', 'INVALID_ACTION_CONDITION')
  }

  if (comparator === '<') return left < right
  if (comparator === '<=') return left <= right
  if (comparator === '>') return left > right
  return left >= right
}

export function assertSupportedActionCondition(condition: string | undefined, label = 'action condition'): void {
  try {
    parseCondition(condition ?? '')
  } catch (error: unknown) {
    if (error instanceof GameError) {
      throw new Error(`${label}: ${error.message}`)
    }
    throw error
  }
}

export function evaluateActionCondition(state: GameState, condition: string | undefined): boolean {
  const parsed = parseCondition(condition ?? '')
  if (parsed.orGroups.length === 0) return true

  return parsed.orGroups.some((andGroup) =>
    andGroup.every((atomic) =>
      compareValues(resolvePath(state, atomic.path), atomic.comparator, atomic.literal)
    )
  )
}
