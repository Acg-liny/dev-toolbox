import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOOL,
  resolveTool,
  tools,
  type ToolDescriptor,
} from '../src/tools/registry'

const EXPECTED_TOOLS: { id: string; name: string; file: string }[] = [
  { id: 'json-formatter', name: 'JSON 格式化', file: 'JsonFormatter.tsx' },
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    file: 'TimestampConverter.tsx',
  },
  { id: 'base64-tool', name: 'Base64 编解码', file: 'Base64Tool.tsx' },
  { id: 'regex-tester', name: '正则测试', file: 'RegexTester.tsx' },
  { id: 'uuid-generator', name: 'UUID 生成器', file: 'UuidGenerator.tsx' },
]

const srcToolsDir = join(__dirname, '..', 'src', 'tools')

describe('AC-3 每个工具独立文件、注册表挂载', () => {
  it('AC-3: 注册表包含 5 个工具，id 唯一', () => {
    expect(tools).toHaveLength(5)
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const expected of EXPECTED_TOOLS) {
      expect(ids).toContain(expected.id)
    }
  })

  it('AC-3: 每个工具有独立的组件文件且被注册表引用', () => {
    for (const expected of EXPECTED_TOOLS) {
      const filePath = join(srcToolsDir, expected.file)
      expect(existsSync(filePath), `${expected.file} 应存在`).toBe(true)
      const source = readFileSync(filePath, 'utf8')
      // 每个文件自包含默认导出，不引用其他工具文件
      expect(source).toMatch(/export default function/)
      expect(source).not.toMatch(/from ['"]\.\//)

      const tool = tools.find((t) => t.id === expected.id)
      expect(tool, `${expected.id} 应已注册`).toBeDefined()
      expect(tool!.name).toBe(expected.name)
      expect(typeof tool!.component).toBe('function')
    }
  })

  it('AC-3: 每个空壳组件渲染自身标题与「开发中」占位', () => {
    for (const tool of tools as readonly ToolDescriptor[]) {
      cleanup()
      render(<tool.component />)
      expect(
        screen.getByRole('heading', { level: 2, name: tool.name }),
      ).toBeInTheDocument()
      expect(screen.getByText('开发中')).toBeInTheDocument()
    }
  })

  it('AC-3: resolveTool 解析合法 hash / 未知 id 回落默认工具', () => {
    expect(resolveTool('#regex-tester').id).toBe('regex-tester')
    expect(resolveTool('regex-tester').id).toBe('regex-tester')
    expect(resolveTool('#unknown').id).toBe(DEFAULT_TOOL.id)
    expect(resolveTool('').id).toBe(DEFAULT_TOOL.id)
  })
})

describe('AC-4 无第三方 UI 依赖', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
  ) as { dependencies: Record<string, string> }

  it('AC-4: dependencies 仅含 react / react-dom', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      'react',
      'react-dom',
    ])
  })
})
