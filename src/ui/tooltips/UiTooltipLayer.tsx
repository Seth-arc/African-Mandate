import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSessionStore } from '../../state/sessionStore'
import { resolveUiTooltip, type UiTooltipDefinition } from './tooltipCatalog'

const TOOLTIP_ELEMENT_ID = 'ui-interface-tooltip'

interface ActiveTooltipState {
  anchor: HTMLElement
  definition: UiTooltipDefinition
}

interface TooltipPosition {
  top: number
  left: number
  placement: 'top' | 'bottom'
  ready: boolean
}

function findTooltipAnchor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null
  }
  const anchor = target.closest<HTMLElement>('[data-ui-tooltip]')
  if (!anchor) {
    return null
  }
  if (anchor.closest('.game-map-wrap')) {
    return null
  }
  return anchor
}

function addDescribedBy(anchor: HTMLElement, id: string): void {
  const existing = anchor.getAttribute('aria-describedby')
  if (!existing) {
    anchor.setAttribute('aria-describedby', id)
    return
  }
  const tokens = existing
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  if (!tokens.includes(id)) {
    tokens.push(id)
    anchor.setAttribute('aria-describedby', tokens.join(' '))
  }
}

function removeDescribedBy(anchor: HTMLElement, id: string): void {
  const existing = anchor.getAttribute('aria-describedby')
  if (!existing) {
    return
  }
  const tokens = existing
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && token !== id)
  if (tokens.length === 0) {
    anchor.removeAttribute('aria-describedby')
    return
  }
  anchor.setAttribute('aria-describedby', tokens.join(' '))
}

export function UiTooltipLayer(): ReactNode {
  const tooltipsEnabled = useSessionStore((s) => s.preferences.tooltips_enabled)
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltipState | null>(null)
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: 'top',
    ready: false,
  })
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const describedAnchorRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!tooltipsEnabled) {
      setActiveTooltip(null)
    }
  }, [tooltipsEnabled])

  useEffect(() => {
    if (!tooltipsEnabled || typeof document === 'undefined') {
      return
    }

    const showTooltip = (anchor: HTMLElement): void => {
      const definition = resolveUiTooltip(anchor.dataset.uiTooltip)
      if (!definition) {
        setActiveTooltip(null)
        return
      }
      setActiveTooltip((current) => {
        if (current?.anchor === anchor && current.definition.id === definition.id) {
          return current
        }
        return { anchor, definition }
      })
    }

    const hideTooltip = (): void => {
      setActiveTooltip(null)
    }

    const handlePointerOver = (event: PointerEvent): void => {
      const anchor = findTooltipAnchor(event.target)
      if (!anchor) {
        return
      }
      showTooltip(anchor)
    }

    const handlePointerOut = (event: PointerEvent): void => {
      const currentAnchor = findTooltipAnchor(event.target)
      const nextAnchor = findTooltipAnchor(event.relatedTarget)
      if (!currentAnchor) {
        return
      }
      if (nextAnchor) {
        if (currentAnchor === nextAnchor) {
          return
        }
        showTooltip(nextAnchor)
        return
      }
      hideTooltip()
    }

    const handleFocusIn = (event: FocusEvent): void => {
      const anchor = findTooltipAnchor(event.target)
      if (!anchor) {
        return
      }
      showTooltip(anchor)
    }

    const handleFocusOut = (event: FocusEvent): void => {
      const currentAnchor = findTooltipAnchor(event.target)
      const nextAnchor = findTooltipAnchor(event.relatedTarget)
      if (!currentAnchor) {
        return
      }
      if (nextAnchor && currentAnchor === nextAnchor) {
        return
      }
      if (nextAnchor) {
        showTooltip(nextAnchor)
        return
      }
      hideTooltip()
    }

    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    return () => {
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [tooltipsEnabled])

  useEffect(() => {
    const previousAnchor = describedAnchorRef.current
    if (previousAnchor && previousAnchor !== activeTooltip?.anchor) {
      removeDescribedBy(previousAnchor, TOOLTIP_ELEMENT_ID)
      describedAnchorRef.current = null
    }

    if (!activeTooltip) {
      return
    }

    addDescribedBy(activeTooltip.anchor, TOOLTIP_ELEMENT_ID)
    describedAnchorRef.current = activeTooltip.anchor

    return () => {
      if (describedAnchorRef.current) {
        removeDescribedBy(describedAnchorRef.current, TOOLTIP_ELEMENT_ID)
        describedAnchorRef.current = null
      }
    }
  }, [activeTooltip])

  useLayoutEffect(() => {
    if (!tooltipsEnabled || !activeTooltip || typeof window === 'undefined') {
      return
    }

    const updatePosition = (): void => {
      if (!document.body.contains(activeTooltip.anchor)) {
        setActiveTooltip(null)
        return
      }

      const tooltipElement = tooltipRef.current
      if (!tooltipElement) {
        return
      }

      const anchorRect = activeTooltip.anchor.getBoundingClientRect()
      const tooltipRect = tooltipElement.getBoundingClientRect()
      const viewportPadding = 12
      const gap = 10

      let left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding))

      const canRenderAbove = anchorRect.top - tooltipRect.height - gap >= viewportPadding
      const placement: TooltipPosition['placement'] = canRenderAbove ? 'top' : 'bottom'
      const top = canRenderAbove
        ? anchorRect.top - tooltipRect.height - gap
        : Math.min(anchorRect.bottom + gap, window.innerHeight - tooltipRect.height - viewportPadding)

      setPosition({
        top,
        left,
        placement,
        ready: true,
      })
    }

    setPosition((current) => ({ ...current, ready: false }))
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [activeTooltip, tooltipsEnabled])

  if (!tooltipsEnabled || !activeTooltip || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      id={TOOLTIP_ELEMENT_ID}
      ref={tooltipRef}
      role="tooltip"
      className={`ui-interface-tooltip ui-interface-tooltip--${position.placement}${position.ready ? ' is-ready' : ''}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="ui-interface-tooltip-title">{activeTooltip.definition.title}</div>
      <div className="ui-interface-tooltip-copy">{activeTooltip.definition.description}</div>
    </div>,
    document.body
  )
}
