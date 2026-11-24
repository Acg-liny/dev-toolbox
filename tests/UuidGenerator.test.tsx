import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UuidGenerator from '../src/tools/UuidGenerator'

/** UUID v4：版本位固定 4，变体位为 10xx（8/9/a/b） */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** 收集结果列表中当前展示的全部 UUID（DOM 顺序） */
function listUuids(): string[] {
  return screen
    .getAllByRole('listitem')
    .map((item) => within(item).getByText(UUID_V4).textContent ?? '')
}

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
}

const originalClipboard = Object.getOwnPropertyDescriptor(
  window.navigator,
  'clipboard',
)

afterEach(() => {
  vi.useRealTimers()
  if (originalClipboard) {
    Object.defineProperty(window.navigator, 'clipboard', originalClipboard)
  } else {
    Reflect.deleteProperty(window.navigator, 'clipboard')
  }
})

describe('BETE-7 AC-1 构建与挂载', () => {
  it('AC-1: 组件挂载后渲染 UUID 生成器界面', () => {
    render(<UuidGenerator />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'UUID 生成器' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('生成数量')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '重新生成' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '全部复制' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/共 \d+ 条/)).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.length).toBeLessThanOrEqual(50)
  })
})

describe('BETE-7 AC-2 UUID v4 格式', () => {
  it('AC-2: 生成的 UUID 满足 v4 版本位与变体位，且互不重复', () => {
    render(<UuidGenerator />)
    const uuids = listUuids()
    expect(uuids.length).toBeGreaterThan(0)
    for (const uuid of uuids) {
      expect(uuid).toMatch(UUID_V4)
    }
    expect(new Set(uuids).size).toBe(uuids.length)
  })
})

describe('BETE-7 AC-3 数量边界 1 与 50', () => {
  it('AC-3: 数量输入 1 时生成 1 条', async () => {
    const user = userEvent.setup()
    render(<UuidGenerator />)
    const input = screen.getByLabelText('生成数量')

    await user.clear(input)
    await user.type(input, '1')

    expect(input).toHaveValue(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(/共 1 条/)).toBeInTheDocument()
  })

  it('AC-3: 数量输入 50 时生成 50 条', async () => {
    const user = userEvent.setup()
    render(<UuidGenerator />)
    const input = screen.getByLabelText('生成数量')

    await user.clear(input)
    await user.type(input, '50')

    expect(input).toHaveValue(50)
    expect(screen.getAllByRole('listitem')).toHaveLength(50)
    expect(screen.getByText(/共 50 条/)).toBeInTheDocument()
  })

  it('AC-3: 越界输入立即收敛到边界（0→1，100→50）', async () => {
    const user = userEvent.setup()
    render(<UuidGenerator />)
    const input = screen.getByLabelText('生成数量')

    await user.clear(input)
    await user.type(input, '0')
    expect(input).toHaveValue(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)

    await user.clear(input)
    await user.type(input, '100')
    expect(input).toHaveValue(50)
    expect(screen.getAllByRole('listitem')).toHaveLength(50)
  })

  it('AC-3: 滑块调整同步数量输入与结果列表', () => {
    render(<UuidGenerator />)
    const slider = screen.getByLabelText('生成数量滑块')

    fireEvent.change(slider, { target: { value: '50' } })
    expect(screen.getByLabelText('生成数量')).toHaveValue(50)
    expect(screen.getAllByRole('listitem')).toHaveLength(50)

    fireEvent.change(slider, { target: { value: '1' } })
    expect(screen.getByLabelText('生成数量')).toHaveValue(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})

describe('BETE-7 AC-5 无新增第三方运行时依赖', () => {
  it('AC-5: package.json dependencies 仅含 react / react-dom', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> }
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      'react',
      'react-dom',
    ])
  })
})

describe('BETE-7 功能：复制与重新生成', () => {
  it('功能: 单条复制写入对应 UUID，按钮变为「已复制」', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    mockClipboard(writeText)
    render(<UuidGenerator />)

    const first = screen.getAllByRole('listitem')[0]
    const uuid = within(first).getByText(UUID_V4).textContent
    expect(uuid).toBeTruthy()

    await user.click(within(first).getByRole('button', { name: '复制' }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(uuid)
    expect(
      await within(first).findByRole('button', { name: '已复制' }),
    ).toBeInTheDocument()
  })

  it('功能: 全部复制以换行分隔写入全部 UUID', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    mockClipboard(writeText)
    render(<UuidGenerator />)

    const expected = listUuids().join('\n')
    await user.click(screen.getByRole('button', { name: '全部复制' }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(expected)
    expect(
      await screen.findByRole('button', { name: '已复制' }),
    ).toBeInTheDocument()
  })

  it('功能: 复制失败显示 role="alert" 提示，按钮不变「已复制」', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    mockClipboard(writeText)
    render(<UuidGenerator />)

    const first = screen.getAllByRole('listitem')[0]
    await user.click(within(first).getByRole('button', { name: '复制' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('复制失败，请手动选择文本后复制')
    expect(
      within(first).getByRole('button', { name: '复制' }),
    ).toBeInTheDocument()
  })

  it('功能: 重新生成替换为新的 UUID 列表且数量不变', async () => {
    const user = userEvent.setup()
    render(<UuidGenerator />)

    const before = listUuids()
    await user.click(screen.getByRole('button', { name: '重新生成' }))
    const after = listUuids()

    expect(after).toHaveLength(before.length)
    expect(new Set(after).size).toBe(after.length)
    for (const uuid of after) {
      expect(before).not.toContain(uuid)
    }
  })

  it('功能: 「已复制」反馈 2 秒后自动恢复为「复制」', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    mockClipboard(writeText)
    render(<UuidGenerator />)

    const first = screen.getAllByRole('listitem')[0]
    const button = within(first).getByRole('button', { name: '复制' })
    fireEvent.click(button)

    // 刷新微任务，让剪贴板 Promise 落定
    await act(async () => {})
    expect(button).toHaveTextContent('已复制')

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(button).toHaveTextContent('复制')
    expect(button).not.toHaveTextContent('已复制')
  })
})
