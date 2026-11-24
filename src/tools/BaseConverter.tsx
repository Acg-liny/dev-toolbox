import { useEffect, useState, type CSSProperties } from 'react'

type Base = 'bin' | 'oct' | 'dec' | 'hex'

type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string }

const BASES: readonly Base[] = ['bin', 'oct', 'dec', 'hex']

const BASE_LABELS: Record<Base, string> = {
  bin: 'BIN',
  oct: 'OCT',
  dec: 'DEC',
  hex: 'HEX',
}

const CHARSETS: Record<Base, RegExp> = {
  bin: /^[01]+$/,
  oct: /^[0-7]+$/,
  dec: /^[0-9]+$/,
  hex: /^[0-9a-fA-F]+$/,
}

const CHARSET_ERRORS: Record<Base, string> = {
  bin: '二进制仅允许 0 和 1',
  oct: '八进制仅允许 0-7',
  dec: '十进制仅允许数字 0-9',
  hex: '十六进制仅允许 0-9 和 A-F',
}

const OVERFLOW_ERROR = '数值超出 JS 安全整数范围（±2⁵³−1），无法转换'

/**
 * 字符集校验 + BigInt 一次性范围判断（换算逻辑不引入 BigInt）。
 * 本期 charset 无 `-`/`.`，负数与小数自然落入 invalid。
 */
function parseInput(raw: string, base: Base): ParseResult {
  if (!CHARSETS[base].test(raw)) {
    return { ok: false, error: CHARSET_ERRORS[base] }
  }
  const prefixed =
    base === 'bin'
      ? `0b${raw}`
      : base === 'oct'
        ? `0o${raw}`
        : base === 'hex'
          ? `0x${raw}`
          : raw
  const big = BigInt(prefixed)
  if (big > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: OVERFLOW_ERROR }
  }
  return { ok: true, value: Number(big) }
}

type Results = Record<Base, string>

/** 换算：toString(radix)，HEX 结果统一大写（AC-3） */
function toResults(value: number): Results {
  return {
    bin: value.toString(2),
    oct: value.toString(8),
    dec: value.toString(10),
    hex: value.toString(16).toUpperCase(),
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

const labelStyle: CSSProperties = { fontWeight: 600, fontSize: 14 }

const fieldsetStyle: CSSProperties = {
  border: 'none',
  padding: 0,
  margin: '0 0 var(--space-3)',
  minWidth: 0,
}

const radioGroupStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-3)',
}

const radioLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
  fontSize: 14,
  cursor: 'pointer',
}

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

const errorStyle: CSSProperties = {
  margin: 'var(--space-2) 0 0',
  color: '#b91c1c',
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

interface BaseSelectorProps {
  value: Base
  onChange: (next: Base) => void
}

function BaseSelector({ value, onChange }: BaseSelectorProps) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend style={labelStyle}>输入进制</legend>
      <div style={radioGroupStyle}>
        {BASES.map((base) => (
          <label key={base} style={radioLabelStyle}>
            <input
              type="radio"
              name="base-converter-base"
              value={base}
              checked={value === base}
              onChange={() => onChange(base)}
            />
            {BASE_LABELS[base]}
          </label>
        ))}
      </div>
    </fieldset>
  )
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
  /** null → 显示占位「—」且禁用复制（empty / invalid 态） */
  value: string | null
  copyKey: string
  copiedKey: string | null
  onCopy: (key: string, text: string) => void
}

function ResultRow({ label, value, copyKey, copiedKey, onCopy }: ResultRowProps) {
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{label}</span>
      <span style={valueStyle}>{value ?? '—'}</span>
      <CopyButton
        copyKey={copyKey}
        text={value ?? ''}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
    </div>
  )
}

export default function BaseConverter() {
  const [base, setBase] = useState<Base>('dec')
  const [rawInput, setRawInput] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copyError, setCopyError] = useState('')

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

  // 单一输入源派生：empty / invalid / valid 三态互斥
  const trimmed = rawInput.trim()
  const parsed = trimmed === '' ? null : parseInput(trimmed, base)
  const results = parsed && parsed.ok ? toResults(parsed.value) : null
  const error = parsed && !parsed.ok ? parsed.error : null

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>进制转换</h2>

      <section style={sectionStyle} aria-label="进制转换">
        <BaseSelector value={base} onChange={setBase} />
        <label style={labelStyle} htmlFor="base-converter-input">
          输入值
        </label>
        <input
          id="base-converter-input"
          style={inputStyle}
          value={rawInput}
          placeholder="输入一个数"
          aria-describedby={error ? 'base-converter-error' : undefined}
          onChange={(event) => setRawInput(event.target.value)}
        />
        <p style={hintStyle}>按所选进制输入，四种进制结果实时更新</p>
        {error !== null && (
          <p id="base-converter-error" style={errorStyle} role="alert">
            {error}
          </p>
        )}

        <section aria-label="转换结果">
          <ResultRow
            label="BIN"
            value={results ? results.bin : null}
            copyKey="bin"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <ResultRow
            label="OCT"
            value={results ? results.oct : null}
            copyKey="oct"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <ResultRow
            label="DEC"
            value={results ? results.dec : null}
            copyKey="dec"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
          <ResultRow
            label="HEX"
            value={results ? results.hex : null}
            copyKey="hex"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
        </section>
      </section>

      {copyError !== '' && (
        <p style={errorStyle} role="alert">
          {copyError}
        </p>
      )}
    </div>
  )
}
