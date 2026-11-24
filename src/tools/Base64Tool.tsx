import { useEffect, useState, type CSSProperties } from 'react'

type Mode = 'encode' | 'decode'
type CopiedField = 'input' | 'output' | null

interface ConversionResult {
  output: string
  error: string | null
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/

/** 文本 → Base64：TextEncoder 保证 UTF-8（中文/emoji）安全 */
function encodeText(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/** Base64 → 文本：非法输入抛出带原因的 Error，由调用方转成友好提示 */
function decodeBase64(encoded: string): string {
  const cleaned = encoded.replace(/\s+/g, '')
  if (cleaned.length % 4 === 1) {
    throw new Error('长度非法（不能被 4 整除的末尾余 1 位），请确认输入完整')
  }
  if (!BASE64_PATTERN.test(cleaned)) {
    throw new Error('含非法字符，只允许 A-Z、a-z、0-9、+、/ 与末尾的 =')
  }
  const binary = atob(cleaned)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  try {
    // fatal: true —— 非 UTF-8 字节序列按非法输入报错，而不是替换字符
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('解码结果不是有效的 UTF-8 文本')
  }
}

function convert(mode: Mode, input: string): ConversionResult {
  // 编码模式仅在完全空串时短路（纯空白是合法输入，如 " " → "IA=="）；
  // 解码模式维持 trim 短路，纯空白视为未输入
  const isEmpty = mode === 'encode' ? input === '' : input.trim() === ''
  if (isEmpty) {
    return { output: '', error: null }
  }
  try {
    return {
      output: mode === 'encode' ? encodeText(input) : decodeBase64(input),
      error: null,
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return {
      output: '',
      error: mode === 'encode' ? `编码失败：${detail}` : `非法 Base64 输入：${detail}`,
    }
  }
}

const labelStyle: CSSProperties = { fontWeight: 600, fontSize: 14 }

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 140,
  padding: 'var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  resize: 'vertical',
}

const buttonStyle: CSSProperties = {
  padding: 'var(--space-1) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  cursor: 'pointer',
  fontSize: 13,
}

const noticeStyle: CSSProperties = {
  display: 'inline-block',
  margin: 0,
  padding: 'var(--space-1) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-badge-bg)',
  color: 'var(--color-badge-text)',
  fontSize: 13,
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<CopiedField>(null)
  const [copyError, setCopyError] = useState('')

  const { output, error } = convert(mode, input)

  useEffect(() => {
    if (copied === null) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy(field: Exclude<CopiedField, null>, text: string) {
    if (!text) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
    } catch {
      setCopyError('复制失败，请手动选择文本后复制')
    }
  }

  // 复制失败提示不驻留：输入或模式变化时清空
  function handleModeChange(next: Mode) {
    setMode(next)
    setCopyError('')
  }

  function handleInputChange(value: string) {
    setInput(value)
    setCopyError('')
  }

  const isEncode = mode === 'encode'
  const inputLabel = isEncode ? '原文文本' : 'Base64 文本'
  const outputLabel = isEncode ? 'Base64 结果' : '解码结果'
  const inputPlaceholder = isEncode
    ? '输入要编码的文本（支持中文、emoji）'
    : '粘贴要解码的 Base64 字符串'
  const outputPlaceholder = isEncode ? '编码结果将显示在这里' : '解码结果将显示在这里'

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Base64 编解码</h2>

      <fieldset
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          margin: '0 0 var(--space-4)',
          padding: 0,
          border: 'none',
        }}
      >
        <legend style={labelStyle}>模式</legend>
        <label>
          <input
            type="radio"
            name="base64-mode"
            value="encode"
            checked={isEncode}
            onChange={() => handleModeChange('encode')}
          />
          编码（文本 → Base64）
        </label>
        <label>
          <input
            type="radio"
            name="base64-mode"
            value="decode"
            checked={!isEncode}
            onChange={() => handleModeChange('decode')}
          />
          解码（Base64 → 文本）
        </label>
      </fieldset>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-2)',
        }}
      >
        <label htmlFor="base64-input" style={labelStyle}>
          {inputLabel}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span aria-live="polite" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {copied === 'input' ? '已复制' : ''}
          </span>
          <button
            type="button"
            style={buttonStyle}
            disabled={!input}
            onClick={() => void handleCopy('input', input)}
          >
            复制输入
          </button>
        </div>
      </div>
      <textarea
        id="base64-input"
        style={textareaStyle}
        value={input}
        rows={8}
        placeholder={inputPlaceholder}
        onChange={(event) => handleInputChange(event.target.value)}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: 'var(--space-4) 0 var(--space-2)',
        }}
      >
        <label htmlFor="base64-output" style={labelStyle}>
          {outputLabel}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span aria-live="polite" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {copied === 'output' ? '已复制' : ''}
          </span>
          <button
            type="button"
            style={buttonStyle}
            disabled={!output}
            onClick={() => void handleCopy('output', output)}
          >
            复制输出
          </button>
        </div>
      </div>
      <textarea
        id="base64-output"
        style={textareaStyle}
        value={output}
        rows={8}
        readOnly
        placeholder={outputPlaceholder}
      />

      {(error || copyError) && (
        <p role="alert" style={{ ...noticeStyle, marginTop: 'var(--space-3)' }}>
          {error ?? copyError}
        </p>
      )}
    </div>
  )
}
