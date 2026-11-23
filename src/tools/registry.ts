import type { ComponentType } from 'react'
import Base64Tool from './Base64Tool'
import JsonFormatter from './JsonFormatter'
import RegexTester from './RegexTester'
import TimestampConverter from './TimestampConverter'
import UuidGenerator from './UuidGenerator'

export interface ToolDescriptor {
  /** URL hash 片段，如 `#json-formatter` 对应 `json-formatter` */
  id: string
  /** 侧边栏展示名称 */
  name: string
  /** 一句话描述 */
  description: string
  /** 工具组件（空壳阶段仅渲染标题与占位） */
  component: ComponentType
}

const registry: [ToolDescriptor, ...ToolDescriptor[]] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    description: '校验、格式化、压缩 JSON',
    component: JsonFormatter,
  },
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    description: '时间戳与日期互转',
    component: TimestampConverter,
  },
  {
    id: 'base64-tool',
    name: 'Base64 编解码',
    description: '文本与 Base64 互转',
    component: Base64Tool,
  },
  {
    id: 'regex-tester',
    name: '正则测试',
    description: '模式实时匹配与分组展示',
    component: RegexTester,
  },
  {
    id: 'uuid-generator',
    name: 'UUID 生成器',
    description: '批量生成 UUID v4',
    component: UuidGenerator,
  },
]

export const tools: readonly ToolDescriptor[] = registry

export const DEFAULT_TOOL: ToolDescriptor = registry[0]

/** 从 location.hash 解析当前工具，未知 id 回落到默认工具 */
export function resolveTool(hash: string): ToolDescriptor {
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  return tools.find((tool) => tool.id === id) ?? DEFAULT_TOOL
}
