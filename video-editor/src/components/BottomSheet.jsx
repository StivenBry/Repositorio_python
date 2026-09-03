import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp, Scissors, Type, SlidersHorizontal, Palette, Download } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import TransformTab from './tabs/TransformTab'
import TextTab from './tabs/TextTab'
import AudioTab from './tabs/AudioTab'
import ColorTab from './tabs/ColorTab'
import ExportTab from './tabs/ExportTab'

const PEEK_HEIGHT = 128
const HANDLE_HEIGHT = 22
const TABS = [
  { id: 'transform', label: 'Transformar', icon: Scissors },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'audio', label: 'Audio', icon: SlidersHorizontal },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'export', label: 'Exportar', icon: Download },
]

export default function BottomSheet() {
  const activeTab = useEditorStore((s) => s.activeTab)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const sheetExpanded = useEditorStore((s) => s.sheetExpanded)
  const setSheetExpanded = useEditorStore((s) => s.setSheetExpanded)
  const disabled = useEditorStore((s) => s.processing.status !== 'idle')

  const [expandedHeight, setExpandedHeight] = useState(420)
  const [height, setHeight] = useState(PEEK_HEIGHT)
  const [animate, setAnimate] = useState(true)
  const drag = useRef(null)

  useEffect(() => {
    const compute = () => setExpandedHeight(Math.min(window.innerHeight * 0.62, 480))
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  useEffect(() => {
    setAnimate(true)
    setHeight(sheetExpanded ? expandedHeight : PEEK_HEIGHT)
  }, [sheetExpanded, expandedHeight])

  const onPointerDown = useCallback(
    (e) => {
      drag.current = { startY: e.clientY, startHeight: height }
      setAnimate(false)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [height],
  )

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return
    const deltaY = e.clientY - drag.current.startY
    const next = Math.min(expandedHeight, Math.max(PEEK_HEIGHT, drag.current.startHeight - deltaY))
    setHeight(next)
  }, [expandedHeight])

  const endDrag = useCallback(() => {
    if (!drag.current) return
    drag.current = null
    setAnimate(true)
    setHeight((current) => {
      const shouldExpand = current > (PEEK_HEIGHT + expandedHeight) / 2
      setSheetExpanded(shouldExpand)
      return shouldExpand ? expandedHeight : PEEK_HEIGHT
    })
  }, [expandedHeight, setSheetExpanded])

  const toggleSheet = () => setSheetExpanded(!sheetExpanded)

  const handleTabClick = (id) => {
    if (id === activeTab && sheetExpanded) {
      setSheetExpanded(false)
    } else {
      setActiveTab(id)
    }
  }

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-neutral-800 bg-neutral-900/95 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur ${
        animate ? 'transition-[height] duration-300 ease-out' : ''
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      style={{ height, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        aria-label={sheetExpanded ? 'Contraer panel' : 'Expandir panel'}
        onClick={toggleSheet}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex shrink-0 cursor-grab touch-none flex-col items-center justify-center py-1.5 active:cursor-grabbing"
        style={{ height: HANDLE_HEIGHT }}
      >
        <span className="h-1.5 w-10 rounded-full bg-neutral-600" />
      </button>

      <nav className="grid shrink-0 grid-cols-5 gap-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-accent-400' : 'text-neutral-400'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-accent-500/15' : ''
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.25 : 1.9} />
              </span>
              {label}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-1">
        {activeTab === 'transform' && <TransformTab />}
        {activeTab === 'text' && <TextTab />}
        {activeTab === 'audio' && <AudioTab />}
        {activeTab === 'color' && <ColorTab />}
        {activeTab === 'export' && <ExportTab />}
      </div>

      {!sheetExpanded && (
        <button
          type="button"
          onClick={toggleSheet}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute right-4 top-1.5 text-neutral-600"
        >
          <ChevronUp size={16} />
        </button>
      )}
    </div>
  )
}
