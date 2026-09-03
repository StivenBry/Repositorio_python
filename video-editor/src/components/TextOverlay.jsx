import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../store/useEditorStore'

const clampPct = (v) => Math.min(100, Math.max(0, v))

// Draggable (only while the "Texto" tab is active) preview of the caption
// that gets burned in via drawtext on export. Sized/positioned as a
// percentage of the preview container — an approximation, same spirit as
// the CSS transform/filter preview for transform/color.
export default function TextOverlay({ containerRef }) {
  const text = useEditorStore((s) => s.text)
  const activeTab = useEditorStore((s) => s.activeTab)
  const updateText = useEditorStore((s) => s.updateText)
  const dragging = useRef(false)
  const [containerHeight, setContainerHeight] = useState(0)

  const draggable = activeTab === 'text'

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height))
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  const updateFromPointer = useCallback(
    (clientX, clientY) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      updateText({
        x: clampPct(((clientX - rect.left) / rect.width) * 100),
        y: clampPct(((clientY - rect.top) / rect.height) * 100),
      })
    },
    [containerRef, updateText],
  )

  if (!text.content.trim()) return null

  const onPointerDown = (e) => {
    if (!draggable) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e.clientX, e.clientY)
  }
  const onPointerMove = (e) => {
    if (!dragging.current) return
    updateFromPointer(e.clientX, e.clientY)
  }
  const stopDrag = () => {
    dragging.current = false
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      className={`absolute max-w-[85%] whitespace-pre-wrap text-center leading-tight ${
        draggable
          ? 'z-30 cursor-grab touch-none rounded outline-dashed outline-2 outline-white/60 active:cursor-grabbing'
          : 'pointer-events-none'
      }`}
      style={{
        left: `${text.x}%`,
        top: `${text.y}%`,
        transform: 'translate(-50%, -50%)',
        fontFamily: '"DejaVu Sans", sans-serif',
        fontWeight: text.bold ? 700 : 400,
        color: text.color,
        fontSize: Math.max(10, containerHeight * (text.size / 100)),
        padding: text.box ? '0.15em 0.4em' : 0,
        backgroundColor: text.box ? 'rgba(0,0,0,0.45)' : 'transparent',
      }}
    >
      {text.content}
    </div>
  )
}
