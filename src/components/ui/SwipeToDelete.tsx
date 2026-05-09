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
  const THRESHOLD = 80

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return
    startX.current = e.touches[0].clientX
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null || disabled) return
    const dx = startX.current - e.touches[0].clientX
    if (dx > 0) setOffset(Math.min(dx, 100))
    else setOffset(0)
  }

  function onTouchEnd() {
    if (offset >= THRESHOLD) {
      setOffset(100)
    } else {
      setOffset(0)
    }
    startX.current = null
  }

  function handleDelete() {
    setSildim(true)
    setTimeout(() => onDelete(), 250)
  }

  if (sildim) return null

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
      {/* Arka plan — sil butonu */}
      <div style={{
        position: 'absolute', inset: 0, background: '#ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: '20px', borderRadius: '16px',
      }}>
        <button
          onClick={handleDelete}
          style={{ color: '#fff', fontSize: '13px', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
        >
          <span style={{ fontSize: '18px' }}>🗑</span>
          Sil
        </button>
      </div>

      {/* İçerik — sola kayan kısım */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: offset === 0 || offset === 100 ? 'transform .25s ease' : 'none',
          position: 'relative', zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}
