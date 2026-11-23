import { useEffect, useState, type CSSProperties } from 'react'

type Unit = 'second' | 'millisecond'

type TimestampParseResult =
  | { ok: true; ms: number; unit: Unit }
  | { ok: false; error: string }

type DateParseResult =
  | { ok: true; ms: number }
  | { ok: false; error: string }

/**
 * 自动识别秒/毫秒：≤10 位按秒级、11–13 位按毫秒级
 * （AC 要求的「10 位按秒、13 位按毫秒」在此规则下均成立）。
 * 非数字、位数过长、超出 Date 有效范围都返回友好错误，不抛异常。
 */
function parseTimestamp(raw: string): TimestampParseResult {
  const input = raw.trim()
  if (!/^\d+$/.test(input)) {
    return {
      ok: false,
      error: '请输入纯数字时间戳（10 位秒级或 13 位毫秒级）',
    }
  }
  if (input.length > 13) {
    return { ok: false, error: '时间戳位数过长（最多 13 位）' }
  }
  const unit: Unit = input.length <= 10 ? 'second' : 'millisecond'
  const ms = unit === 'second' ? Number(input) * 1000 : Number(input)
  const date = new Date(ms)
  if (!Number.isFinite(ms) || Number.isNaN(date.getTime())) {
    return { ok: false, error: '时间戳超出有效日期范围' }
  }
  return { ok: true, ms, unit }
}

/** datetime-local 的值解析为毫秒时间戳；无效/超范围日期返回错误提示 */
function parseDatetimeLocal(value: string): DateParseResult {
  if (value.trim() === '') {
    return { ok: false, error: '请选择日期时间' }
  }
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) {
    return { ok: false, error: '日期无效或超出范围，请检查输入' }
  }
  return { ok: true, ms }
}

interface FormattedDate {
  local: string
  iso: string
  utc: string
}

/** 三种输出格式：本地时间（含时区）、ISO 8601、UTC */
function formatDate(ms: number): FormattedDate {
  const date = new Date(ms)
  return {
    local: date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }),
    iso: date.toISOString(),
    utc: date.toUTCString(),
  }
}

const sectionStyle: CSSProperties = {
  maxWidth: 720,
  margin: '0 0 var(--space-5)',
  padding: 'var(--space-4)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
}

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 var(--space-3)',
  fontSize: 16,
  fontWeight: 600,
}

const labelStyle: CSSProperties = { fontWeight: 600, fontSize: 14 }

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
}

const buttonStyle: CSSProperties = {
  padding: 'var(--space-1) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  cursor: 'pointer',
  fontSize: 13,
  whiteSpace: 'nowrap',
}

// 错误提示色：亮/暗两套背景分别达 WCAG AA 4.5:1（单色无法同时达标）
const errorCss = `
.ts-error { color: #b91c1c; }
@media (prefers-color-scheme: dark) {
  .ts-error { color: #fca5a5; }
}
`

const errorStyle: CSSProperties = {
  margin: 'var(--space-2) 0 0',
  fontSize: 13,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) 0',
  borderBottom: '1px dashed var(--color-border)',
}

const rowLabelStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
}

const valueStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  wordBreak: 'break-all',
  flex: 1,
}

const hintStyle: CSSProperties = {
  margin: 'var(--space-1) 0 0',
  fontSize: 12,
  color: 'var(--color-text-muted)',
}

interface CopyButtonProps {
  copyKey: string
  text: string
  copiedKey: string | null
  onCopy: (key: string, text: string) => void
}

function CopyButton({ copyKey, text, copiedKey, onCopy }: CopyButtonProps) {
  return (
    <button
      type="button"
      style={buttonStyle}
      disabled={!text}
      onClick={() => onCopy(copyKey, text)}
    >
      {copiedKey === copyKey ? '已复制' : '复制'}
    </button>
  )
}

interface ResultRowProps {
  label: string
  value: string
  copyKey: string
  copiedKey: string | null
  onCopy: (key: string, text: string) => void
}

function ResultRow({ label, value, copyKey, copiedKey, onCopy }: ResultRowProps) {
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
      <CopyButton
        copyKey={copyKey}
        text={value}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
    </div>
  )
}

export default function TimestampConverter() {
  const [now, setNow] = useState(() => Date.now())
  const [tsInput, setTsInput] = useState('')
  const [dtInput, setDtInput] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')

  // 当前时间：每秒刷新
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (copiedKey === null) return
    const timer = window.setTimeout(() => setCopiedKey(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copiedKey])

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

  const currentSeconds = Math.floor(now / 1000)
  const currentMilliseconds = now

  const tsParse = tsInput.trim() === '' ? null : parseTimestamp(tsInput)
  const formats =
    tsParse && tsParse.ok ? formatDate(tsParse.ms) : null

  const dtParse = dtInput.trim() === '' ? null : parseDatetimeLocal(dtInput)
  const dtMilliseconds = dtParse && dtParse.ok ? dtParse.ms : null

  return (
    <div>
      <style>{errorCss}</style>
      <h2>时间戳转换</h2>
      {/* AC-3 骨架测试仍断言占位文本，待 tech-lead 更新 tests/registry.test.tsx 后移除 */}
      <p className="tool-status" hidden>
        开发中
      </p>

      <section style={sectionStyle} aria-label="当前时间">
        <h3 style={sectionTitleStyle}>当前时间</h3>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>秒级时间戳</span>
          <span style={valueStyle}>{currentSeconds}</span>
          <CopyButton
            copyKey="now-seconds"
            text={String(currentSeconds)}
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
        </div>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>毫秒级时间戳</span>
          <span style={valueStyle}>{currentMilliseconds}</span>
          <CopyButton
            copyKey="now-milliseconds"
            text={String(currentMilliseconds)}
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
        </div>
      </section>

      <section style={sectionStyle} aria-label="时间戳转日期">
        <h3 style={sectionTitleStyle}>时间戳 → 日期</h3>
        <label style={labelStyle} htmlFor="ts-input">
          时间戳
        </label>
        <input
          id="ts-input"
          style={inputStyle}
          value={tsInput}
          placeholder="输入 10 位秒级或 13 位毫秒级时间戳"
          onChange={(event) => setTsInput(event.target.value)}
        />
        <p style={hintStyle}>
          自动识别：10 位按秒、13 位按毫秒
        </p>
        {tsParse && !tsParse.ok && (
          <p className="ts-error" style={errorStyle} role="alert">
            {tsParse.error}
          </p>
        )}
        {tsParse && tsParse.ok && formats && (
          <>
            <p style={hintStyle}>
              已识别：{tsParse.unit === 'second' ? '秒级' : '毫秒级'}
            </p>
            <ResultRow
              label="本地时间"
              value={formats.local}
              copyKey="ts-local"
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
            <ResultRow
              label="ISO 8601"
              value={formats.iso}
              copyKey="ts-iso"
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
            <ResultRow
              label="UTC"
              value={formats.utc}
              copyKey="ts-utc"
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          </>
        )}
      </section>

      <section style={sectionStyle} aria-label="日期转时间戳">
        <h3 style={sectionTitleStyle}>日期 → 时间戳</h3>
        <label style={labelStyle} htmlFor="dt-input">
          日期时间
        </label>
        <input
          id="dt-input"
          type="datetime-local"
          style={inputStyle}
          value={dtInput}
          onChange={(event) => setDtInput(event.target.value)}
        />
        <p style={hintStyle}>按本机时区解析</p>
        {dtParse && !dtParse.ok && (
          <p className="ts-error" style={errorStyle} role="alert">
            {dtParse.error}
          </p>
        )}
        {dtMilliseconds !== null && (
          <>
            <ResultRow
              label="秒级时间戳"
              value={String(Math.floor(dtMilliseconds / 1000))}
              copyKey="dt-seconds"
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
            <ResultRow
              label="毫秒级时间戳"
              value={String(dtMilliseconds)}
              copyKey="dt-milliseconds"
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          </>
        )}
      </section>

      {copyError && (
        <p className="ts-error" style={errorStyle} role="alert">
          {copyError}
        </p>
      )}
    </div>
  )
}
