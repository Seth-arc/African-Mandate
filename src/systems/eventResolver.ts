/**
 * Runtime event resolver.
 * - Evaluates trigger_conditions from events content
 * - Applies event effects and flags
 * - Tracks active/deadline events
 * - Refreshes intel feed entries authored via intel_reports.generated_by
 */

import type {
  ActionDefinition,
  ActionLogEntry,
  ActiveEventState,
  AuditStatus,
  EventData,
  EventLogEntry,
  GameState,
  Metrics,
  OversightLevel,
  Resources,
  ZoneData,
  ZoneState,
} from '../state/types'
import { upsertIntelFeedByGenerator } from './intelResolver'

const METRIC_KEYS: (keyof Metrics)[] = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
]

const RESOURCE_KEYS: (keyof Resources)[] = [
  'budget',
  'political_capital',
  'personnel',
  'intel_points',
  'time_months',
]

const DEFAULT_OVERSIGHT: OversightLevel = 'none'
const DEFAULT_AUDIT_STATUS: AuditStatus = 'none'

const STRING_KEYWORDS = new Set([
  'active',
  'resolved',
  'none',
  'pending',
  'passed',
  'failed',
  'success',
  'failure',
])

interface RuntimeSignals {
  intel_report_generated: boolean
  intel_report_upgrade: boolean
}

interface EventResolutionResult {
  state: GameState
  deadlineFailReason?: string
}

type TokenKind =
  | 'identifier'
  | 'number'
  | 'string'
  | 'boolean'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'comma'
  | 'dot'
  | 'keyword'

interface Token {
  kind: TokenKind
  value: string
}

type OperandNode =
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'variable'; path: string[] }

type ConditionNode =
  | { kind: 'or'; left: ConditionNode; right: ConditionNode }
  | { kind: 'and'; left: ConditionNode; right: ConditionNode }
  | { kind: 'comparison'; left: OperandNode; operator: string; right: OperandNode }
  | { kind: 'membership'; operand: OperandNode; list: OperandNode[] }
  | { kind: 'flag'; operand: OperandNode }
  | { kind: 'streak'; comparison: Extract<ConditionNode, { kind: 'comparison' }>; turns: number }
  | { kind: 'history'; comparison: Extract<ConditionNode, { kind: 'comparison' }>; turns: number }

interface ZoneEvalContext {
  runtime: ZoneState
  staticZone?: ZoneData
}

interface EvalContext {
  state: GameState
  turn: number
  derived: Record<string, string | number | boolean>
  zone?: ZoneEvalContext
  rng: number
}

const TRIGGER_AST_CACHE = new Map<string, ConditionNode>()

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampResource(value: number): number {
  return Math.max(0, Math.round(value))
}

function getActFromTurn(turn: number): number {
  return Math.floor((turn - 1) / 4) + 1
}

function getActTurnRange(turn: number): { start: number; end: number } {
  const act = getActFromTurn(turn)
  const start = (act - 1) * 4 + 1
  const end = start + 3
  return { start, end }
}

function hashToUnitInterval(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const normalized = (hash >>> 0) / 4294967295
  return Math.max(0, Math.min(1, normalized))
}

function tokenize(input: string): Token[] {
  const out: Token[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index]
    if (char === undefined) break

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '(') {
      out.push({ kind: 'lparen', value: char })
      index += 1
      continue
    }
    if (char === ')') {
      out.push({ kind: 'rparen', value: char })
      index += 1
      continue
    }
    if (char === '[') {
      out.push({ kind: 'lbracket', value: char })
      index += 1
      continue
    }
    if (char === ']') {
      out.push({ kind: 'rbracket', value: char })
      index += 1
      continue
    }
    if (char === ',') {
      out.push({ kind: 'comma', value: char })
      index += 1
      continue
    }
    if (char === '.') {
      out.push({ kind: 'dot', value: char })
      index += 1
      continue
    }

    if (char === '\'' || char === '"') {
      const quote = char
      let value = ''
      index += 1
      while (index < input.length) {
        const next = input[index]
        if (next === undefined) break
        if (next === quote) {
          index += 1
          break
        }
        value += next
        index += 1
      }
      out.push({ kind: 'string', value })
      continue
    }

    if (char === '=' || char === '!' || char === '<' || char === '>') {
      const one = char
      const two = `${one}${input[index + 1] ?? ''}`
      if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
        out.push({ kind: 'operator', value: two })
        index += 2
      } else if (one === '<' || one === '>') {
        out.push({ kind: 'operator', value: one })
        index += 1
      } else {
        index += 1
      }
      continue
    }

    if (/\d/.test(char)) {
      let value = char
      index += 1
      while (index < input.length) {
        const next = input[index]
        if (!next || !/[\d.]/.test(next)) {
          break
        }
        value += next
        index += 1
      }
      out.push({ kind: 'number', value })
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      let value = char
      index += 1
      while (index < input.length) {
        const next = input[index]
        if (!next || !/[A-Za-z0-9_]/.test(next)) {
          break
        }
        value += next
        index += 1
      }
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === 'false') {
        out.push({ kind: 'boolean', value: lower })
      } else if (
        lower === 'and' ||
        lower === 'or' ||
        lower === 'in' ||
        lower === 'for' ||
        lower === 'consecutive' ||
        lower === 'turns' ||
        lower === 'last'
      ) {
        out.push({ kind: 'keyword', value: lower })
      } else {
        out.push({ kind: 'identifier', value })
      }
      continue
    }

    index += 1
  }

  return out
}

class TriggerParser {
  private readonly tokens: Token[]

  private cursor = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): ConditionNode {
    const node = this.parseOrExpression()
    return node
  }

  private parseOrExpression(): ConditionNode {
    let left = this.parseAndExpression()
    while (this.matchKeyword('or')) {
      const right = this.parseAndExpression()
      left = { kind: 'or', left, right }
    }
    return left
  }

  private parseAndExpression(): ConditionNode {
    let left = this.parsePrimary()
    while (this.matchKeyword('and')) {
      const right = this.parsePrimary()
      left = { kind: 'and', left, right }
    }
    return left
  }

  private parsePrimary(): ConditionNode {
    if (this.matchKind('lparen')) {
      const inner = this.parseOrExpression()
      this.expectKind('rparen')
      return inner
    }
    return this.parseAtomic()
  }

  private parseAtomic(): ConditionNode {
    const leftOperand = this.parseOperand()
    let node: ConditionNode

    if (this.matchKeyword('in') && this.peekKind('lbracket')) {
      this.expectKind('lbracket')
      const list: OperandNode[] = []
      if (!this.peekKind('rbracket')) {
        while (true) {
          list.push(this.parseOperand())
          if (!this.matchKind('comma')) break
        }
      }
      this.expectKind('rbracket')
      node = {
        kind: 'membership',
        operand: leftOperand,
        list,
      }
    } else if (this.peekKind('operator')) {
      const operator = this.consume().value
      const rightOperand = this.parseOperand()
      node = {
        kind: 'comparison',
        left: leftOperand,
        operator,
        right: rightOperand,
      }
    } else {
      node = {
        kind: 'flag',
        operand: leftOperand,
      }
    }

    if (this.matchKeyword('for')) {
      const turns = this.parsePositiveInteger()
      this.expectKeyword('consecutive')
      this.expectKeyword('turns')
      if (node.kind !== 'comparison') {
        throw new Error('Streak conditions require a comparison expression')
      }
      node = {
        kind: 'streak',
        comparison: node,
        turns,
      }
    } else if (this.matchKeyword('in')) {
      this.expectKeyword('last')
      const turns = this.parsePositiveInteger()
      this.expectKeyword('turns')
      if (node.kind !== 'comparison') {
        throw new Error('History conditions require a comparison expression')
      }
      node = {
        kind: 'history',
        comparison: node,
        turns,
      }
    }

    return node
  }

  private parseOperand(): OperandNode {
    const token = this.consume()
    if (token.kind === 'number') {
      return { kind: 'literal', value: Number(token.value) }
    }
    if (token.kind === 'string') {
      return { kind: 'literal', value: token.value }
    }
    if (token.kind === 'boolean') {
      return { kind: 'literal', value: token.value === 'true' }
    }
    if (token.kind !== 'identifier') {
      throw new Error(`Unexpected token ${token.value}`)
    }

    const path = [token.value]
    while (this.matchKind('dot')) {
      const next = this.consume()
      if (next.kind !== 'identifier') {
        throw new Error(`Expected identifier after '.', got ${next.value}`)
      }
      path.push(next.value)
    }
    return { kind: 'variable', path }
  }

  private parsePositiveInteger(): number {
    const token = this.consume()
    if (token.kind !== 'number') {
      throw new Error(`Expected number, got ${token.value}`)
    }
    const value = Number(token.value)
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Expected positive integer, got ${token.value}`)
    }
    return Math.floor(value)
  }

  private matchKeyword(keyword: string): boolean {
    const token = this.tokens[this.cursor]
    if (!token || token.kind !== 'keyword' || token.value !== keyword) {
      return false
    }
    this.cursor += 1
    return true
  }

  private expectKeyword(keyword: string): void {
    if (!this.matchKeyword(keyword)) {
      throw new Error(`Expected keyword ${keyword}`)
    }
  }

  private peekKind(kind: TokenKind): boolean {
    const token = this.tokens[this.cursor]
    return token?.kind === kind
  }

  private matchKind(kind: TokenKind): boolean {
    if (!this.peekKind(kind)) return false
    this.cursor += 1
    return true
  }

  private expectKind(kind: TokenKind): void {
    if (!this.matchKind(kind)) {
      throw new Error(`Expected token kind ${kind}`)
    }
  }

  private consume(): Token {
    const token = this.tokens[this.cursor]
    if (!token) {
      throw new Error('Unexpected end of trigger expression')
    }
    this.cursor += 1
    return token
  }
}

function parseTriggerCondition(expression: string): ConditionNode {
  const cached = TRIGGER_AST_CACHE.get(expression)
  if (cached) {
    return cached
  }
  const tokens = tokenize(expression)
  const parser = new TriggerParser(tokens)
  const parsed = parser.parse()
  TRIGGER_AST_CACHE.set(expression, parsed)
  return parsed
}

function comparisonResult(
  left: string | number | boolean,
  operator: string,
  right: string | number | boolean
): boolean {
  const bothNumbers = typeof left === 'number' && typeof right === 'number'
  if (operator === '==') return left === right
  if (operator === '!=') return left !== right
  if (operator === '<') return bothNumbers ? left < right : false
  if (operator === '<=') return bothNumbers ? left <= right : false
  if (operator === '>') return bothNumbers ? left > right : false
  if (operator === '>=') return bothNumbers ? left >= right : false
  return false
}

function getMetricsForTurn(state: GameState, turn: number): Metrics | undefined {
  if (turn === state.session.turn) {
    return state.session.metrics
  }
  return state.metric_history?.[turn]
}

function resolveZoneStaticById(state: GameState, zoneId: string): ZoneData | undefined {
  return state.content?.zones.zones.find((zone) => zone.zone_id === zoneId)
}

function resolveVariable(path: string[], ctx: EvalContext): string | number | boolean | undefined {
  if (path.length === 0) return undefined
  const [root, second, third] = path
  if (!root) return undefined

  if (root === 'rng') return ctx.rng
  if (root === 'turn') return ctx.turn
  if (root === 'act') return getActFromTurn(ctx.turn)

  const metrics = getMetricsForTurn(ctx.state, ctx.turn)
  if (metrics && METRIC_KEYS.includes(root as keyof Metrics)) {
    return metrics[root as keyof Metrics]
  }

  if (root === 'resources' && second && RESOURCE_KEYS.includes(second as keyof Resources)) {
    return ctx.state.session.resources[second as keyof Resources]
  }
  if (RESOURCE_KEYS.includes(root as keyof Resources)) {
    return ctx.state.session.resources[root as keyof Resources]
  }

  if (root === 'ai_state' && second) {
    if (second === 'opposition_pressure' || second === 'intel_confidence') {
      return ctx.state.session.ai_state[second]
    }
  }

  if (root === 'actor_sentiments' && second && third) {
    const actor = ctx.state.actor_sentiments?.[second]
    if (!actor) return undefined
    if (third === 'relationship_score') return actor.relationship_score
    if (third === 'relationship_label') return actor.relationship_label
    if (third === 'sentiment') return actor.sentiment
    if (third === 'stance') return actor.stance
    if (third === 'dialogue_state') return actor.dialogue_state
    return undefined
  }

  if (root === 'zone') {
    if (second === undefined) return undefined
    const zoneField = second
    if (
      zoneField === 'stability' ||
      zoneField === 'insurgency' ||
      zoneField === 'civilian_support' ||
      zoneField === 'threat_level' ||
      zoneField === 'population'
    ) {
      if (!ctx.zone) return undefined
      return ctx.zone.runtime[zoneField]
    }
    if (zoneField === 'multi_ethnic') {
      return ctx.zone?.staticZone?.multi_ethnic ?? false
    }

    if (third) {
      const zoneRuntime = ctx.state.zone_state?.[zoneField]
      if (!zoneRuntime) return undefined
      if (
        third === 'stability' ||
        third === 'insurgency' ||
        third === 'civilian_support' ||
        third === 'threat_level' ||
        third === 'population'
      ) {
        return zoneRuntime[third]
      }
      if (third === 'multi_ethnic') {
        return resolveZoneStaticById(ctx.state, zoneField)?.multi_ethnic ?? false
      }
    }
    return undefined
  }

  if (root === 'territory' && second && third) {
    const territoryState = ctx.state.territory_state
    if (!territoryState || !Object.prototype.hasOwnProperty.call(territoryState, second)) {
      return undefined
    }
    const territory = territoryState[second as keyof typeof territoryState]
    if (!territory) return undefined
    if (third === 'stability' || third === 'insurgency' || third === 'population') {
      return territory[third]
    }
    if (third === 'status') {
      return territory.status
    }
    return undefined
  }

  if (root === 'corruption_flags' && second) {
    return ctx.state.corruption_flags?.[second]?.status ?? 'none'
  }

  if (root === 'audit_status' && second === 'status') {
    return ctx.state.audit_status?.status ?? DEFAULT_AUDIT_STATUS
  }

  if (root === 'oversight_level' && second === 'level') {
    return ctx.state.oversight_level?.level ?? DEFAULT_OVERSIGHT
  }

  if (path.length === 1) {
    if (STRING_KEYWORDS.has(root)) {
      return root
    }
    if (Object.prototype.hasOwnProperty.call(ctx.derived, root)) {
      return ctx.derived[root]
    }
    const flagValue = ctx.state.narrative_flags?.[root]
    if (flagValue !== undefined) {
      return flagValue
    }
  }

  return undefined
}

function resolveOperand(operand: OperandNode, ctx: EvalContext): string | number | boolean | undefined {
  if (operand.kind === 'literal') {
    return operand.value
  }
  return resolveVariable(operand.path, ctx)
}

function evaluateCondition(node: ConditionNode, ctx: EvalContext): boolean {
  if (node.kind === 'or') {
    return evaluateCondition(node.left, ctx) || evaluateCondition(node.right, ctx)
  }
  if (node.kind === 'and') {
    return evaluateCondition(node.left, ctx) && evaluateCondition(node.right, ctx)
  }
  if (node.kind === 'comparison') {
    const left = resolveOperand(node.left, ctx)
    const right = resolveOperand(node.right, ctx)
    if (left === undefined || right === undefined) return false
    return comparisonResult(left, node.operator, right)
  }
  if (node.kind === 'membership') {
    const target = resolveOperand(node.operand, ctx)
    if (target === undefined) return false
    return node.list.some((item) => {
      const value = resolveOperand(item, ctx)
      return value !== undefined && value === target
    })
  }
  if (node.kind === 'flag') {
    const value = resolveOperand(node.operand, ctx)
    return value === true
  }
  if (node.kind === 'history') {
    void node.turns
    return evaluateCondition(node.comparison, ctx)
  }

  const streakTurns = node.turns
  for (let i = 0; i < streakTurns; i += 1) {
    const checkTurn = ctx.turn - i
    if (checkTurn < 1) return false
    const turnScoped: EvalContext = {
      ...ctx,
      turn: checkTurn,
    }
    if (!evaluateCondition(node.comparison, turnScoped)) {
      return false
    }
  }
  return true
}

function triggerUsesZoneScope(expression: string): boolean {
  return /\bzone\./.test(expression)
}

function deriveActionMaps(
  state: GameState
): { actionById: Map<string, ActionDefinition> } {
  const actionById = new Map<string, ActionDefinition>()
  for (const action of state.content?.actions.actions ?? []) {
    actionById.set(action.action_id, action)
  }
  return { actionById }
}

function computeThresholdSignals(state: GameState): {
  thresholds_met_all: boolean
  thresholds_missed_count: number
} {
  const metrics = state.session.metrics
  const rules = state.config.win_conditions
  let all = true
  let missed = 0
  for (const [metricKey, rule] of Object.entries(rules)) {
    const current = metrics[metricKey as keyof Metrics]
    if (typeof current !== 'number') continue
    let ok = false
    if (rule.operator === '>=') ok = current >= rule.value
    else if (rule.operator === '<=') ok = current <= rule.value
    else if (rule.operator === '>') ok = current > rule.value
    else if (rule.operator === '<') ok = current < rule.value
    else if (rule.operator === '==') ok = current === rule.value
    if (!ok) {
      all = false
      missed += 1
    }
  }
  return {
    thresholds_met_all: all,
    thresholds_missed_count: missed,
  }
}

function computeAdjacentCriticalCount(state: GameState): number {
  const zoneState = state.zone_state
  const zoneContent = state.content?.zones.zones
  if (!zoneState || !zoneContent) return 0

  const critical = new Set(
    Object.values(zoneState)
      .filter((zone) => zone.threat_level >= 75)
      .map((zone) => zone.zone_id)
  )

  let count = 0
  const seen = new Set<string>()
  for (const zone of zoneContent) {
    if (!critical.has(zone.zone_id)) continue
    for (const adjacent of zone.adjacent_zones) {
      if (!critical.has(adjacent)) continue
      const pair = zone.zone_id < adjacent
        ? `${zone.zone_id}|${adjacent}`
        : `${adjacent}|${zone.zone_id}`
      if (seen.has(pair)) continue
      seen.add(pair)
      count += 1
    }
  }
  return count
}

function computeDerivedSignals(
  state: GameState,
  turn: number,
  runtimeSignals: RuntimeSignals
): Record<string, string | number | boolean> {
  const { actionById } = deriveActionMaps(state)
  const actionLog = state.action_log ?? []
  const actRange = getActTurnRange(turn)

  const actionCategoryEntries = actionLog
    .map((entry) => {
      const action = actionById.get(entry.action_id)
      return {
        entry,
        action,
        category: action?.category,
      }
    })

  const climate_actions_in_act2 = actionCategoryEntries.filter(
    ({ category, entry }) => category === 'climate' && entry.turn >= 5 && entry.turn <= 8
  ).length

  const idp_zones_stabilized = Object.values(state.zone_state ?? {}).filter(
    (zone) => zone.displaced > 0 && zone.threat_level <= 49
  ).length

  const humanitarian_aid_spend_high = actionCategoryEntries
    .filter(({ category, entry }) => category === 'humanitarian' && entry.turn >= turn - 1)
    .reduce((sum, { entry }) => sum + entry.costs.budget, 0) > 3_000_000

  const security_actions_without_oversight = (state.oversight_level?.level ?? DEFAULT_OVERSIGHT) === 'none'
    ? actionCategoryEntries.filter(
      ({ category, entry }) => category === 'security' && entry.turn >= turn - 2
    ).length
    : 0

  const civilian_harm_incidents = actionLog.filter(
    (entry) => entry.turn >= turn - 1 && entry.flag_additions.some((flag) => flag.includes('civilian_harm'))
  ).length

  const latestIntelTurn = (state.intel_feed ?? []).reduce((latest, item) => Math.max(latest, item.occurred_at), 0)
  const intel_report_age_turns = latestIntelTurn > 0 ? Math.max(0, turn - latestIntelTurn) : 0

  const corruption_flags_count_act = Object.values(state.corruption_flags ?? {}).filter((flag) => {
    return flag.status === 'active' && flag.created_turn >= actRange.start && flag.created_turn <= actRange.end
  }).length

  const unresolved_crisis_count = (state.active_events ?? []).filter(
    (event) => event.event_type === 'crisis' && event.status !== 'resolved'
  ).length

  const corruption_unresolved = (state.active_events ?? []).some(
    (event) => event.category === 'corruption' && event.status !== 'resolved'
  )

  const juntaActors = ['junta_burkina_traore', 'junta_mali', 'junta_niger']
  const juntaScores = juntaActors.map((actorKey) => state.actor_sentiments?.[actorKey]?.relationship_score ?? 0)
  const any_junta_relationship = juntaScores.length > 0 ? Math.max(...juntaScores) : 0
  const junta_allied_count = juntaScores.filter((score) => score > 60).length

  const wagnerPhase1Turn = state.narrative_flag_turns?.wagner_expansion_active
  const turns_since_phase1 = wagnerPhase1Turn !== undefined ? Math.max(0, turn - wagnerPhase1Turn) : 0

  const coalition_compact =
    state.narrative_flags?.coalition_compact_success === true
      ? 'success'
      : state.narrative_flags?.coalition_compact_failure === true
        ? 'failure'
        : 'none'

  const categorySpamMap = new Map<string, number>()
  for (const { category, entry } of actionCategoryEntries) {
    if (!category) continue
    if (entry.turn < turn - 3) continue
    categorySpamMap.set(category, (categorySpamMap.get(category) ?? 0) + 1)
  }
  const category_spam = Array.from(categorySpamMap.values()).some((count) => count >= 3)

  const negotiation_actions_in_last_2_turns = actionCategoryEntries.filter(({ action, entry }) => {
    if (!action || entry.turn < turn - 1) return false
    const tags = action.tags ?? []
    return tags.includes('negotiation') || action.action_id.includes('negotiation')
  }).length

  const adjacent_zones_critical = computeAdjacentCriticalCount(state)

  const thresholdSignals = computeThresholdSignals(state)
  const m19 = state.metric_snapshot_turn_19
  const m20 = state.session.metrics
  const criticalMetricsIn = (metrics: Metrics): boolean =>
    metrics.stability <= 24 ||
    metrics.insurgency >= 75 ||
    metrics.civilian_support <= 24 ||
    metrics.global_legitimacy <= 24 ||
    metrics.regional_synergy <= 24
  const critical_metrics_in_t19_t20 = m19 ? criticalMetricsIn(m19) || criticalMetricsIn(m20) : false

  let critical_zone_persists = false
  if (state.zone_threat_snapshot_turn_19 && state.zone_state) {
    for (const [zoneId, threat19] of Object.entries(state.zone_threat_snapshot_turn_19)) {
      if (threat19 >= 75 && (state.zone_state[zoneId]?.threat_level ?? 0) >= 75) {
        critical_zone_persists = true
        break
      }
    }
  }

  const any_positive_metric_high_range =
    (m20.stability >= 50 && m20.stability <= 74) ||
    (m20.civilian_support >= 50 && m20.civilian_support <= 74) ||
    (m20.global_legitimacy >= 50 && m20.global_legitimacy <= 74) ||
    (m20.regional_synergy >= 50 && m20.regional_synergy <= 74)

  const prior1 = state.metric_history?.[turn - 1]
  const prior2 = state.metric_history?.[turn - 2]
  const threeTurnCritical =
    !!prior1 &&
    !!prior2 &&
    ((prior1.stability <= 24 && prior2.stability <= 24 && m20.stability <= 24) ||
      (prior1.insurgency >= 75 && prior2.insurgency >= 75 && m20.insurgency >= 75) ||
      (prior1.civilian_support <= 24 && prior2.civilian_support <= 24 && m20.civilian_support <= 24) ||
      (prior1.global_legitimacy <= 24 && prior2.global_legitimacy <= 24 && m20.global_legitimacy <= 24) ||
      (prior1.regional_synergy <= 24 && prior2.regional_synergy <= 24 && m20.regional_synergy <= 24))

  const early_fail_triggered =
    (state.session.resources.time_months <= 0 && turn < state.session.max_turns) ||
    threeTurnCritical ||
    state.ending_type === 'mandate_revoked'

  const endgame_evaluated = turn >= state.session.max_turns && state.ending_type !== undefined

  return {
    climate_actions_in_act2,
    idp_zones_stabilized,
    humanitarian_aid_spend_high,
    security_actions_without_oversight,
    civilian_harm_incidents,
    intel_report_age_turns,
    intel_report_generated: runtimeSignals.intel_report_generated,
    intel_report_upgrade: runtimeSignals.intel_report_upgrade,
    corruption_flags_count_act,
    corruption_unresolved,
    any_junta_relationship,
    junta_allied_count,
    turns_since_phase1,
    coalition_compact,
    category_spam,
    negotiation_actions_in_last_2_turns,
    adjacent_zones_critical,
    unresolved_crisis_count,
    thresholds_met_all: thresholdSignals.thresholds_met_all,
    thresholds_missed_count: thresholdSignals.thresholds_missed_count,
    critical_metrics_in_t19_t20,
    critical_zone_persists,
    any_positive_metric_high_range,
    early_fail_triggered,
    endgame_evaluated,
    ui_event: '',
  }
}

function evaluateTriggerForEvent(
  state: GameState,
  event: EventData,
  derived: Record<string, string | number | boolean>,
  turn: number
): boolean {
  const condition = event.trigger_conditions?.trim()
  if (!condition) {
    return false
  }

  let ast: ConditionNode
  try {
    ast = parseTriggerCondition(condition)
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'unknown parser failure'
    throw new Error(`Invalid trigger_conditions for event ${event.event_id}: ${details}`)
  }

  const eventFrequencyMultiplier = state.config.event_frequency_multiplier ?? 1
  const baseRng = hashToUnitInterval(`${event.event_id}:${turn}`)
  const rng = Math.max(0, Math.min(1, baseRng / eventFrequencyMultiplier))
  if (triggerUsesZoneScope(condition)) {
    const zones = Object.values(state.zone_state ?? {})
    if (zones.length === 0) return false
    return zones.some((zoneRuntime) => {
      const zoneStatic = resolveZoneStaticById(state, zoneRuntime.zone_id)
      const ctx: EvalContext = {
        state,
        turn,
        derived,
        rng,
        zone: {
          runtime: zoneRuntime,
          staticZone: zoneStatic,
        },
      }
      return evaluateCondition(ast, ctx)
    })
  }

  const ctx: EvalContext = {
    state,
    turn,
    derived,
    rng,
  }
  return evaluateCondition(ast, ctx)
}

function applyMetricBundle(current: Metrics, deltas: Record<string, number>): Metrics {
  const next = { ...current }
  for (const key of METRIC_KEYS) {
    const delta = deltas[key]
    if (typeof delta === 'number') {
      next[key] = clampMetric(next[key] + delta)
    }
  }
  return next
}

function applyResourceBundle(current: Resources, deltas: Record<string, number>): Resources {
  const next = { ...current }
  for (const key of RESOURCE_KEYS) {
    const delta = deltas[key]
    if (typeof delta === 'number') {
      next[key] = clampResource(next[key] + delta)
    }
  }
  return next
}

function diffMetrics(before: Metrics, after: Metrics): Partial<Metrics> {
  const out: Partial<Metrics> = {}
  for (const key of METRIC_KEYS) {
    const delta = after[key] - before[key]
    if (delta !== 0) {
      out[key] = delta
    }
  }
  return out
}

function diffResources(before: Resources, after: Resources): Partial<Resources> {
  const out: Partial<Resources> = {}
  for (const key of RESOURCE_KEYS) {
    const delta = after[key] - before[key]
    if (delta !== 0) {
      out[key] = delta
    }
  }
  return out
}

function applyFlagsToState(
  state: GameState,
  flags: string[],
  turn: number
): { narrative_flags: Record<string, boolean>; narrative_flag_turns: Record<string, number> } {
  const narrative_flags = { ...(state.narrative_flags ?? {}) }
  const narrative_flag_turns = { ...(state.narrative_flag_turns ?? {}) }
  for (const flag of flags) {
    narrative_flags[flag] = true
    if (narrative_flag_turns[flag] === undefined) {
      narrative_flag_turns[flag] = turn
    }
  }
  return {
    narrative_flags,
    narrative_flag_turns,
  }
}

function withEventLogs(
  state: GameState,
  event: EventData,
  turn: number,
  source: 'trigger' | 'penalty',
  metricDeltas: Partial<Metrics>,
  resourceDeltas: Partial<Resources>,
  flags: string[]
): GameState {
  const eventLogEntry: EventLogEntry = {
    turn,
    event_id: event.event_id,
    event_type: event.event_type,
    category: event.category,
    narrative_text_key: event.narrative_text_key,
    source,
    metric_deltas: metricDeltas,
    resource_deltas: resourceDeltas,
    flag_additions: [...flags],
  }

  const actionLogEntry: ActionLogEntry = {
    turn,
    action_id: source === 'trigger' ? `event:${event.event_id}` : `event_penalty:${event.event_id}`,
    target: {},
    resolution_timing: 'end_turn',
    costs: {
      budget: 0,
      political_capital: 0,
      personnel: 0,
      intel_points: 0,
      time_months: 0,
    },
    resource_deltas: resourceDeltas,
    metric_deltas: metricDeltas,
    flag_additions: [...flags],
  }

  return {
    ...state,
    event_log: [...(state.event_log ?? []), eventLogEntry],
    action_log: [...(state.action_log ?? []), actionLogEntry],
  }
}

function registerCorruptionFlag(state: GameState, event: EventData, turn: number): GameState {
  if (event.category !== 'corruption') {
    return state
  }
  if (!event.event_id.startsWith('corruption_')) {
    return state
  }
  const flagKey = event.event_id.replace(/^corruption_/, '')
  const corruption_flags: Record<string, NonNullable<GameState['corruption_flags']>[string]> = {
    ...(state.corruption_flags ?? {}),
    [flagKey]: {
      status: 'active',
      created_turn: turn,
    },
  }
  return {
    ...state,
    corruption_flags,
  }
}

function applyEventBundle(
  state: GameState,
  event: EventData,
  bundle: { effects: { metrics: Record<string, number>; resources: Record<string, number> }; flags: string[] },
  turn: number,
  source: 'trigger' | 'penalty'
): GameState {
  const beforeMetrics = state.session.metrics
  const beforeResources = state.session.resources
  const afterMetrics = applyMetricBundle(beforeMetrics, bundle.effects.metrics)
  const afterResources = applyResourceBundle(beforeResources, bundle.effects.resources)
  const flagsApplied = applyFlagsToState(state, bundle.flags, turn)

  let nextState: GameState = {
    ...state,
    session: {
      ...state.session,
      metrics: afterMetrics,
      resources: afterResources,
    },
    narrative_flags: flagsApplied.narrative_flags,
    narrative_flag_turns: flagsApplied.narrative_flag_turns,
  }

  nextState = registerCorruptionFlag(nextState, event, turn)

  const metricDeltas = diffMetrics(beforeMetrics, afterMetrics)
  const resourceDeltas = diffResources(beforeResources, afterResources)
  return withEventLogs(nextState, event, turn, source, metricDeltas, resourceDeltas, bundle.flags)
}

function addOrRefreshIntelFeedForEvent(
  state: GameState,
  event: EventData,
  turn: number
): { state: GameState; generated: boolean; upgraded: boolean } {
  return upsertIntelFeedByGenerator(state, event.event_id, turn)
}

function deadlineFromEvent(event: EventData, turn: number): number | null {
  if (event.deadline_offset !== null) {
    return turn + event.deadline_offset
  }
  if (event.deadline_turn !== null && event.deadline_turn > 0) {
    return event.deadline_turn
  }
  return null
}

function withTriggeredActiveEvent(state: GameState, event: EventData, turn: number): GameState {
  if (event.event_type !== 'crisis') {
    return state
  }
  const deadline = deadlineFromEvent(event, turn)
  if (deadline === null && !event.failure_on_deadline) {
    return state
  }
  const active_events = [...(state.active_events ?? [])]
  if (active_events.some((item) => item.event_id === event.event_id && item.status === 'active')) {
    return state
  }
  const activeEvent: ActiveEventState = {
    event_id: event.event_id,
    event_type: event.event_type,
    category: event.category,
    trigger_turn: turn,
    deadline_turn: deadline,
    failure_on_deadline: event.failure_on_deadline,
    status: 'active',
  }
  active_events.push(activeEvent)
  return {
    ...state,
    active_events,
  }
}

function processExpiredActiveEvents(state: GameState, turn: number): EventResolutionResult {
  const active_events = [...(state.active_events ?? [])]
  if (active_events.length === 0) {
    return { state }
  }

  let nextState = state
  let deadlineFailReason: string | undefined
  const eventById = new Map((state.content?.events.events ?? []).map((event) => [event.event_id, event] as const))

  const updated: ActiveEventState[] = active_events.map((item) => {
    if (item.status !== 'active') {
      return item
    }
    if (item.deadline_turn === null || turn <= item.deadline_turn) {
      return item
    }

    const event = eventById.get(item.event_id)
    if (event) {
      nextState = applyEventBundle(nextState, event, event.penalty_bundle, turn, 'penalty')
    }
    if (item.failure_on_deadline && deadlineFailReason === undefined) {
      deadlineFailReason = `failure_on_deadline:${item.event_id}`
    }
    return {
      ...item,
      status: 'expired',
    }
  })

  return {
    state: {
      ...nextState,
      active_events: updated,
    },
    deadlineFailReason,
  }
}

function shouldSkipEvent(event: EventData): boolean {
  return event.event_type === 'ui' || event.event_type === 'tutorial'
}

function wasEventAlreadyTriggered(state: GameState, eventId: string): boolean {
  return (state.event_log ?? []).some((entry) => entry.event_id === eventId && entry.source === 'trigger')
}

/**
 * Resolve runtime events for the current state turn.
 * Returns updated state and optional deadline-based fail reason.
 */
export function resolveRuntimeEvents(state: GameState): EventResolutionResult {
  const events = state.content?.events.events ?? []
  if (events.length === 0) {
    return { state }
  }

  const turn = state.session.turn
  const sortedEvents = [...events].sort((a, b) => a.priority - b.priority)

  const expired = processExpiredActiveEvents(state, turn)
  let workingState = expired.state
  let deadlineFailReason = expired.deadlineFailReason

  const firedEventIds = new Set<string>(
    (workingState.event_log ?? [])
      .filter((entry) => entry.source === 'trigger')
      .map((entry) => entry.event_id)
  )

  const runtimeSignals: RuntimeSignals = {
    intel_report_generated: false,
    intel_report_upgrade: false,
  }

  let iteration = 0
  let progressed = true
  while (progressed && iteration < 6) {
    progressed = false
    iteration += 1
    const derivedSignals = computeDerivedSignals(workingState, turn, runtimeSignals)

    for (const event of sortedEvents) {
      if (shouldSkipEvent(event)) continue
      if (firedEventIds.has(event.event_id) || wasEventAlreadyTriggered(workingState, event.event_id)) {
        continue
      }
      if (event.trigger_turn > 0 && turn < event.trigger_turn) {
        continue
      }

      const matched = evaluateTriggerForEvent(workingState, event, derivedSignals, turn)
      if (!matched) {
        continue
      }

      workingState = applyEventBundle(workingState, event, event.outcomes, turn, 'trigger')
      workingState = withTriggeredActiveEvent(workingState, event, turn)

      const intelUpdate = addOrRefreshIntelFeedForEvent(workingState, event, turn)
      workingState = intelUpdate.state
      runtimeSignals.intel_report_generated = runtimeSignals.intel_report_generated || intelUpdate.generated
      runtimeSignals.intel_report_upgrade = runtimeSignals.intel_report_upgrade || intelUpdate.upgraded

      firedEventIds.add(event.event_id)
      progressed = true
    }
  }

  return {
    state: workingState,
    deadlineFailReason,
  }
}
