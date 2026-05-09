'use client'
import { useRef, useState } from 'react'

interface Props {
  onDelete: () => void
  children: React.ReactNode
  disabled?: boolean
}

export default function SwipeToDelete({ onDelete, children, disabled }: Props) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [sildim, setSildim] = useState(false)
  const THRESHOLD = 72

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return
    startX.current = e.touches[0].clientX
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null || disabled) return
    const dx = startX.current - e.touches[0].clientX
    if (dx > 0) setOffset(Math.min(dx, 88))
    else setOffset(0)
  }

  function onTouchEnd() {
    if (offset >= THRESHOLD) setOffset(88)
    else setOffset(0)
    startX.current = null
  }

  function handleDelete() {
    setSildim(true)
    setTimeout(() => onDelete(), 250)
  }

  if (sildim) return null

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
      {/* Sil butonu — sadece offset > 0 olunca görünür */}
      {offset > 0 && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '88px',
          background: '#ef4444', display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: '0 16px 16px 0',
        }}>
          <button onClick={handleDelete} style={{
            color: '#fff', fontSize: '12px', fontWeight: 800,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
          }}>
            <span style={{ fontSize: '20px' }}>🗑</span>
            Sil
          </button>
        </div>
      )}

      {/* İçerik */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: startX.current === null ? 'transform .2s ease' : 'none',
          position: 'relative', zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}
