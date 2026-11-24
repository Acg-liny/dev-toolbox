import { useEffect, useState, type CSSProperties } from 'react'

const MIN_COUNT = 1
const MAX_COUNT = 50
const DEFAULT_COUNT = 5
const COPY_FEEDBACK_MS = 2000
/** 「全部复制」在 copiedKey 中的占位键（不可能与真实 UUID 冲突） */
const COPY_ALL_KEY = 'all'

/** 将输入收敛到 1–50 的合法数量；非法数字回落默认值 */
function clampCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COUNT
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.trunc(value)))
}

/** 批量生成 UUID v4（crypto.randomUUID 保证版本位 4、变体位 10xx） */
function generateUuids(count: number): string[] {
  return Array.from({ length: count }, () => crypto.randomUUID())
}

const baseButton: CSSProperties = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 14,
  cursor: 'pointer',
}

const primaryButton: CSSProperties = {
  ...baseButton,
  background: 'var(--color-accent)',
  borderColor: 'var(--color-accent)',
  color: 'var(--color-accent-contrast)',
}

const numberInput: CSSProperties = {
  width: 84,
  padding: '6px 8px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 14,
}

const mutedTextStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
}

export default function UuidGenerator() {
  const [count, setCount] = useState(DEFAULT_COUNT)
  /** 输入框原始文本：允许清空/越界中间态，失焦或越界时回填合法值 */
  const [countInput, setCountInput] = useState(String(DEFAULT_COUNT))
  const [uuids, setUuids] = useState<string[]>(() =>
    generateUuids(DEFAULT_COUNT),
  )
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')

  // 复制成功后 2 秒收起「已复制」反馈
  useEffect(() => {
    if (copiedKey === null) return
    const timer = window.setTimeout(() => setCopiedKey(null), COPY_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [copiedKey])

  function regenerateUuids(nextCount: number) {
    setUuids(generateUuids(nextCount))
    setCopiedKey(null)
  }

  /** 同步数量并按新数量重新生成 */
  function applyCount(next: number) {
    setCount(next)
    regenerateUuids(next)
  }

  function handleCountInputChange(raw: string) {
    setCountInput(raw)
    const parsed = Number.parseInt(raw, 10)
    // 清空等临时输入不更新数量，失焦时回填
    if (Number.isNaN(parsed)) return
    const next = clampCount(parsed)
    // 越界立即收敛显示值（1 和 50 为边界）
    if (next !== parsed) setCountInput(String(next))
    if (next !== count) applyCount(next)
  }

  function handleSliderChange(raw: string) {
    const next = clampCount(Number(raw))
    setCountInput(String(next))
    if (next !== count) applyCount(next)
  }

  async function handleCopy(key: string, text: string) {
    if (!text) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
    } catch {
      setCopyError('复制失败，请手动选择文本后复制')
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>UUID 生成器</h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-3)',
          margin: 'var(--space-4) 0',
        }}
      >
        <label
          htmlFor="uuid-count"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          生成数量
        </label>
        <input
          id="uuid-count"
          type="number"
          min={MIN_COUNT}
          max={MAX_COUNT}
          value={countInput}
          onChange={(event) => handleCountInputChange(event.target.value)}
          onBlur={() => setCountInput(String(count))}
          style={numberInput}
        />
        <input
          type="range"
          min={MIN_COUNT}
          max={MAX_COUNT}
          value={count}
          onChange={(event) => handleSliderChange(event.target.value)}
          aria-label="生成数量滑块"
          style={{ flex: '1 1 160px', minWidth: 120, accentColor: 'var(--color-accent)' }}
        />
        <span style={mutedTextStyle}>范围 1 – 50</span>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginLeft: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => regenerateUuids(count)}
            style={baseButton}
          >
            重新生成
          </button>
          <button
            type="button"
            onClick={() => void handleCopy(COPY_ALL_KEY, uuids.join('\n'))}
            style={primaryButton}
          >
            {copiedKey === COPY_ALL_KEY ? '已复制' : '全部复制'}
          </button>
        </div>
      </div>

      {copyError && (
        <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>
          {copyError}
        </p>
      )}

      <p style={{ ...mutedTextStyle, margin: '0 0 var(--space-2)' }}>
        共 {uuids.length} 条，点击「复制」可复制单条
      </p>

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {uuids.map((uuid) => (
          <li
            key={uuid}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
            }}
          >
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                wordBreak: 'break-all',
              }}
            >
              {uuid}
            </code>
            <button
              type="button"
              onClick={() => void handleCopy(uuid, uuid)}
              style={{ ...baseButton, flexShrink: 0 }}
            >
              {copiedKey === uuid ? '已复制' : '复制'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
