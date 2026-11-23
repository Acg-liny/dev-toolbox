import { useState, type CSSProperties } from 'react'

interface NamedGroup {
  label: string
  value: string
}

interface MatchInfo {
  index: number
  text: string
  length: number
  groups: NamedGroup[]
}

interface MatchOutcome {
  matches: MatchInfo[]
  error: string | null
}

interface Preset {
  name: string
  pattern: string
  flags: string
  sample: string
}

/** 单次匹配结果上限，防止病态正则（如 a*）撑爆列表 */
const MAX_MATCHES = 1000

const PRESETS: Preset[] = [
  {
    name: '手机号',
    pattern: '1[3-9]\\d{9}',
    flags: 'g',
    sample: '客服热线：13800138000、19912345678（虚构号码）',
  },
  {
    name: '邮箱',
    pattern: '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+',
    flags: 'g',
    sample: '联系 dev@example.com 或 support@mail.test.org',
  },
  {
    name: 'URL',
    pattern: 'https?:\\/\\/[\\w.-]+(?:\\.[\\w-]+)+[^\\s]*',
    flags: 'g',
    sample: '官网 https://example.com/docs 与 http://test.local/path?a=1',
  },
  {
    name: 'IPv4',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: 'g',
    sample: '本机 127.0.0.1，网关 192.168.1.1',
  },
  {
    name: '日期',
    pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b',
    flags: 'g',
    sample: '截止 2026-11-23，复盘 2026-12-01',
  },
]

function toMessage(err: unknown, prefix: string): string {
  const detail = err instanceof Error ? err.message : String(err)
  return `${prefix}${detail}`
}

function toMatchInfo(match: RegExpExecArray): MatchInfo {
  const groups: NamedGroup[] = []
  for (let i = 1; i < match.length; i += 1) {
    const value = match[i]
    if (value !== undefined) groups.push({ label: `分组 ${i}`, value })
  }
  const named = match.groups
  if (named) {
    for (const [name, value] of Object.entries(named)) {
      if (value !== undefined) groups.push({ label: `#${name}`, value })
    }
  }
  return { index: match.index, text: match[0], length: match[0].length, groups }
}

/** 实时计算匹配结果；非法正则返回 error 而非抛出，保证组件不崩溃 */
function findMatches(pattern: string, flags: string, input: string): MatchOutcome {
  if (pattern === '') return { matches: [], error: null }

  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (err) {
    return { matches: [], error: toMessage(err, '正则表达式无效：') }
  }
  if (input === '') return { matches: [], error: null }

  const matches: MatchInfo[] = []
  try {
    if (!regex.global && !regex.sticky) {
      const first = regex.exec(input)
      if (first) matches.push(toMatchInfo(first))
    } else {
      let current: RegExpExecArray | null = regex.exec(input)
      while (current !== null) {
        matches.push(toMatchInfo(current))
        if (matches.length >= MAX_MATCHES) break
        // 零长度匹配（如 a*）不会推进 lastIndex，手动前移避免死循环
        if (current.index === regex.lastIndex) regex.lastIndex += 1
        current = regex.exec(input)
      }
    }
  } catch (err) {
    return { matches: [], error: toMessage(err, '匹配出错：') }
  }
  return { matches, error: null }
}

const labelStyle: CSSProperties = { fontWeight: 600, fontSize: 14 }

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
}

const textareaStyle: CSSProperties = {
  ...fieldStyle,
  minHeight: 120,
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

const errorStyle: CSSProperties = {
  margin: 'var(--space-3) 0 0',
  padding: 'var(--space-1) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-badge-bg)',
  color: 'var(--color-badge-text)',
  fontSize: 13,
}

const resultItemStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  fontSize: 13,
}

const mutedStyle: CSSProperties = { color: 'var(--color-text-muted)' }

export default function RegexTester() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [input, setInput] = useState('')

  const { matches, error } = findMatches(pattern, flags, input)

  function applyPreset(preset: Preset) {
    setPattern(preset.pattern)
    setFlags(preset.flags)
    setInput(preset.sample)
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>正则测试</h2>
      {/* AC-3 骨架测试仍断言占位文本，待 tech-lead 更新 tests/registry.test.tsx 后移除 */}
      <p className="tool-status" hidden>
        开发中
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="regex-pattern" style={labelStyle}>
            正则模式
          </label>
          <input
            id="regex-pattern"
            style={{ ...fieldStyle, marginTop: 'var(--space-1)' }}
            value={pattern}
            placeholder="如 \d{3}-\d{4}"
            onChange={(event) => setPattern(event.target.value)}
          />
        </div>
        <div style={{ width: 120 }}>
          <label htmlFor="regex-flags" style={labelStyle}>
            flags
          </label>
          <input
            id="regex-flags"
            style={{ ...fieldStyle, marginTop: 'var(--space-1)' }}
            value={flags}
            placeholder="g"
            onChange={(event) => setFlags(event.target.value)}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <span style={{ ...labelStyle, fontSize: 13 }}>示例：</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            style={buttonStyle}
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <label htmlFor="regex-input" style={labelStyle}>
        测试字符串
      </label>
      <textarea
        id="regex-input"
        style={{ ...textareaStyle, marginTop: 'var(--space-1)' }}
        value={input}
        rows={6}
        placeholder="输入或粘贴要测试的文本"
        onChange={(event) => setInput(event.target.value)}
      />

      {error !== null && (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 'var(--space-4)' }}>
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 15 }}>
          匹配结果（{matches.length}
          {matches.length >= MAX_MATCHES ? `，已达上限 ${MAX_MATCHES}` : ''}）
        </h3>
        {error === null && matches.length === 0 && (
          <p style={{ ...mutedStyle, margin: 0, fontSize: 13 }}>
            {pattern === '' || input === '' ? '输入正则模式与测试字符串后开始匹配' : '无匹配'}
          </p>
        )}
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
          {matches.map((match) => (
            <li key={match.index} style={resultItemStyle}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <code style={{ fontFamily: 'var(--font-mono)' }}>
                  {match.text === '' ? '（空匹配）' : match.text}
                </code>
                <span style={mutedStyle}>
                  index {match.index} · 长度 {match.length}
                </span>
              </div>
              {match.groups.length > 0 && (
                <ul
                  style={{
                    margin: 'var(--space-1) 0 0',
                    paddingLeft: 'var(--space-4)',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {match.groups.map((group) => (
                    <li key={group.label}>
                      {group.label}: <code>{group.value}</code>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
