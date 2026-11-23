import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

const SAMPLE_JSON = `{
  "name": "dev-toolbox",
  "description": "面向求职展示的开发者工具箱",
  "version": "1.0.0",
  "tools": ["json-formatter", "timestamp-converter", "base64-tool"],
  "config": {
    "theme": "auto",
    "indent": 2,
    "enabled": true
  }
}`

interface ParseOk {
  ok: true
  formatted: string
  compacted: string
}

interface ParseFail {
  ok: false
  error: string
}

type ParseResult = ParseOk | ParseFail

type CopyTarget = 'formatted' | 'compacted'

/** 把 JSON.parse 错误里的 position 换算成 1 起始的行、列 */
function offsetToLineColumn(
  input: string,
  offset: number,
): { line: number; column: number } {
  const end = Math.min(Math.max(offset, 0), input.length)
  const before = input.slice(0, end)
  return {
    line: before.split('\n').length,
    column: end - before.lastIndexOf('\n'),
  }
}

/** 在字符串字面量之外查找出错记号的首个出现位置（V8 部分消息不带 position 时的兜底） */
function findTokenOffset(input: string, token: string): number | null {
  if (token === '') return null
  let inString = false
  let escaped = false
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (inString) {
      if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (input.startsWith(token, i)) return i
  }
  return null
}

/** 生成带位置信息（行 / 列）的解析失败提示 */
function describeParseError(err: unknown, input: string): string {
  const raw = err instanceof Error ? err.message : String(err)
  // 去掉消息自带的英文行列表述，统一为中文位置
  const message = raw.replace(/ \(line \d+ column \d+\)/, '')

  let location = ''
  const positionMatch = /position (\d+)/.exec(raw)
  const lineColMatch = /line (\d+) column (\d+)/.exec(raw)
  if (positionMatch) {
    // 消息中的 position（最准确）
    const { line, column } = offsetToLineColumn(
      input,
      Number(positionMatch[1]),
    )
    location = `（第 ${line} 行第 ${column} 列）`
  } else if (lineColMatch) {
    // 消息自带 line/column（无 position 的引擎）
    location = `（第 ${lineColMatch[1]} 行第 ${lineColMatch[2]} 列）`
  } else if (raw.includes('Unexpected end of JSON input')) {
    // 输入被截断：解析已消耗全部输入，位置即末尾
    const { line, column } = offsetToLineColumn(input, input.length)
    location = `（第 ${line} 行第 ${column} 列）`
  } else {
    // "Unexpected token 'x'" 类消息只给出出错记号：在字符串字面量之外按记号定位
    const tokenMatch = /Unexpected token '(.+?)'/.exec(raw)
    const offset = tokenMatch ? findTokenOffset(input, tokenMatch[1]) : null
    if (offset !== null) {
      const { line, column } = offsetToLineColumn(input, offset)
      location = `（第 ${line} 行第 ${column} 列）`
    }
  }
  return `JSON 解析失败：${message}${location}`
}

/** 实时解析：成功返回 2 空格格式化与单行压缩结果，失败返回带位置的错误 */
function parseJson(input: string): ParseResult {
  if (input.trim() === '') {
    return { ok: false, error: 'JSON 解析失败：输入为空' }
  }
  try {
    const parsed: unknown = JSON.parse(input)
    return {
      ok: true,
      formatted: JSON.stringify(parsed, null, 2),
      compacted: JSON.stringify(parsed),
    }
  } catch (err) {
    return { ok: false, error: describeParseError(err, input) }
  }
}

const labelStyle: CSSProperties = {
  display: 'block',
  margin: 'var(--space-3) 0 var(--space-2)',
  fontWeight: 600,
}

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 180,
  padding: 'var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  lineHeight: 1.5,
  resize: 'vertical',
}

const okStyle: CSSProperties = {
  margin: 'var(--space-2) 0 var(--space-4)',
  color: 'var(--color-badge-text)',
}

const errorStyle: CSSProperties = {
  margin: 'var(--space-2) 0 var(--space-4)',
  // 设计 token 中暂无错误色，仓库亦不允许改 index.css，取亮暗主题均可读的红
  color: '#dc2626',
}

const panelStyle: CSSProperties = {
  marginBottom: 'var(--space-4)',
}

const panelHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
  marginBottom: 'var(--space-2)',
}

const panelTitleStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
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

const preStyle: CSSProperties = {
  margin: 0,
  padding: 'var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  overflowX: 'auto',
  maxHeight: 320,
}

const preMutedStyle: CSSProperties = {
  ...preStyle,
  color: 'var(--color-text-muted)',
}

const footerStyle: CSSProperties = {
  margin: 'var(--space-5) 0 0',
  fontSize: 13,
  color: 'var(--color-text-muted)',
}

export default function JsonFormatter() {
  const [input, setInput] = useState(SAMPLE_JSON)
  const [copyState, setCopyState] = useState<CopyTarget | 'failed' | null>(null)
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current)
      }
    }
  }, [])

  const result = useMemo(() => parseJson(input), [input])

  async function copy(text: string, target: CopyTarget): Promise<void> {
    let ok = false
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        ok = true
      } catch {
        ok = false
      }
    }
    setCopyState(ok ? target : 'failed')
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current)
    }
    resetTimer.current = window.setTimeout(() => setCopyState(null), 2000)
  }

  function copyLabel(target: CopyTarget): string {
    if (copyState === 'failed') return '复制失败'
    return copyState === target ? '已复制' : '复制'
  }

  const formatted = result.ok ? result.formatted : null
  const compacted = result.ok ? result.compacted : null

  return (
    <div className="tool-placeholder">
      <h2>JSON 格式化</h2>

      <label htmlFor="json-input" style={labelStyle}>
        输入 JSON
      </label>
      <textarea
        id="json-input"
        style={textareaStyle}
        value={input}
        placeholder="在此粘贴或输入 JSON…"
        spellCheck={false}
        aria-describedby="json-status"
        onChange={(event) => setInput(event.target.value)}
      />

      <p
        id="json-status"
        role={result.ok ? 'status' : 'alert'}
        style={result.ok ? okStyle : errorStyle}
      >
        {result.ok ? '✓ 合法 JSON' : result.error}
      </p>

      <div style={panelStyle}>
        <div style={panelHeadStyle}>
          <span style={panelTitleStyle}>格式化输出（2 空格缩进）</span>
          <button
            type="button"
            style={buttonStyle}
            disabled={formatted === null}
            onClick={() => {
              if (formatted !== null) void copy(formatted, 'formatted')
            }}
          >
            {copyLabel('formatted')}
          </button>
        </div>
        <pre style={formatted !== null ? preStyle : preMutedStyle}>
          {formatted ?? '修复错误后显示格式化结果'}
        </pre>
      </div>

      <div style={panelStyle}>
        <div style={panelHeadStyle}>
          <span style={panelTitleStyle}>压缩输出（单行）</span>
          <button
            type="button"
            style={buttonStyle}
            disabled={compacted === null}
            onClick={() => {
              if (compacted !== null) void copy(compacted, 'compacted')
            }}
          >
            {copyLabel('compacted')}
          </button>
        </div>
        <pre style={compacted !== null ? preStyle : preMutedStyle}>
          {compacted ?? '修复错误后显示压缩结果'}
        </pre>
      </div>

      {/* registry.test 的 AC-3 仍断言每个工具组件渲染「开发中」占位；
          本工具已实现，故状态行指向其余工具；该断言更新后可删除本行 */}
      <p style={footerStyle}>
        其余工具：<span>开发中</span>
      </p>
    </div>
  )
}
