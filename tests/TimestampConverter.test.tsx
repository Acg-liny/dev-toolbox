import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TimestampConverter from '../src/tools/TimestampConverter'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // 还原 jsdom 默认（无 navigator.clipboard）
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
  })
})

/** 页面上「复制」按钮很多，按行取：label 所在的最近一行容器 */
function getRow(label: string, container?: HTMLElement): HTMLElement {
  const labelEl = container ? within(container).getByText(label) : screen.getByText(label)
  const row = labelEl.closest('div')
  if (!row) throw new Error(`未找到 ${label} 所在的行`)
  return row as HTMLElement
}

/** 「秒级/毫秒级时间戳」行在当前时间与日期转时间戳两个区块重名，限定在日期区块内取 */
function getDtRow(label: string): HTMLElement {
  const region = screen.getByRole('region', { name: '日期转时间戳' })
  return getRow(label, region)
}

describe('AC-1 当前时间实时刷新（1s）', () => {
  it('AC-1: 渲染当前秒级/毫秒级时间戳，1s 后自动刷新', () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
      ],
    })
    vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'))

    render(<TimestampConverter />)
    const region = screen.getByRole('region', { name: '当前时间' })

    const t0 = Date.now()
    const sec0 = Math.floor(t0 / 1000)
    expect(within(region).getByText(String(sec0))).toBeInTheDocument()
    expect(within(region).getByText(String(t0))).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const t1 = Date.now()
    expect(t1).toBe(t0 + 1000)
    expect(within(region).getByText(String(Math.floor(t1 / 1000)))).toBeInTheDocument()
    expect(within(region).getByText(String(t1))).toBeInTheDocument()
    // 旧值已被替换
    expect(
      within(region).queryByText(String(sec0)),
    ).not.toBeInTheDocument()
  })
})

describe('AC-1 复制按钮', () => {
  it('AC-1: 点击秒级行的复制按钮，将秒级时间戳写入剪贴板并显示「已复制」', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<TimestampConverter />)
    const region = screen.getByRole('region', { name: '当前时间' })
    const sec = Math.floor(Date.now() / 1000)
    const row = within(region).getByText(String(sec)).closest('div')!

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '复制' }))

    expect(await within(row as HTMLElement).findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(String(sec))
  })

  it('AC-1: 剪贴板不可用时给出复制失败提示，不崩溃', async () => {
    // jsdom 默认无 navigator.clipboard
    render(<TimestampConverter />)
    const region = screen.getByRole('region', { name: '当前时间' })
    const sec = Math.floor(Date.now() / 1000)
    const row = within(region).getByText(String(sec)).closest('div')!

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '复制' }))

    expect(
      await screen.findByRole('alert', { name: '' }),
    ).toHaveTextContent('复制失败，请手动选择文本后复制')
  })
})

describe('AC-2 秒/毫秒自动识别', () => {
  it('AC-2: 10 位时间戳识别为秒级并换算正确', () => {
    render(<TimestampConverter />)
    fireEvent.change(screen.getByLabelText('时间戳'), {
      target: { value: '1700000000' },
    })

    expect(screen.getByText('已识别：秒级')).toBeInTheDocument()
    expect(screen.getByText('2023-11-14T22:13:20.000Z')).toBeInTheDocument()
    expect(screen.getByText('Tue, 14 Nov 2023 22:13:20 GMT')).toBeInTheDocument()
  })

  it('AC-2: 13 位时间戳识别为毫秒级并保留毫秒精度', () => {
    render(<TimestampConverter />)
    fireEvent.change(screen.getByLabelText('时间戳'), {
      target: { value: '1700000000123' },
    })

    expect(screen.getByText('已识别：毫秒级')).toBeInTheDocument()
    expect(screen.getByText('2023-11-14T22:13:20.123Z')).toBeInTheDocument()
  })

  it('AC-2: 同一时刻的 10 位秒与 13 位毫秒输入输出一致', () => {
    render(<TimestampConverter />)
    const input = screen.getByLabelText('时间戳')

    fireEvent.change(input, { target: { value: '1700000000' } })
    const isoFromSeconds = screen.getByText(/^\d{4}-\d{2}-\d{2}T/).textContent

    fireEvent.change(input, { target: { value: '1700000000000' } })
    const isoFromMillis = screen.getByText(/^\d{4}-\d{2}-\d{2}T/).textContent

    expect(isoFromSeconds).toBe('2023-11-14T22:13:20.000Z')
    expect(isoFromMillis).toBe(isoFromSeconds)
  })
})

describe('AC-3 三种日期格式输出（本地 + ISO + UTC）', () => {
  it('AC-3: 1700000000123 输出本地时间、ISO 8601、UTC 三种格式', () => {
    render(<TimestampConverter />)
    fireEvent.change(screen.getByLabelText('时间戳'), {
      target: { value: '1700000000123' },
    })

    // ISO 8601 —— 与时区无关的精确断言
    expect(screen.getByText('ISO 8601')).toBeInTheDocument()
    expect(screen.getByText('2023-11-14T22:13:20.123Z')).toBeInTheDocument()

    // UTC —— 与时区无关的精确断言
    expect(screen.getByText('UTC')).toBeInTheDocument()
    expect(screen.getByText('Tue, 14 Nov 2023 22:13:20 GMT')).toBeInTheDocument()

    // 本地时间 —— 用 Date 的本地字段推导，不依赖测试机时区
    const d = new Date(1700000000123)
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(screen.getByText('本地时间')).toBeInTheDocument()
    const localText = getRow('本地时间').textContent ?? ''
    expect(localText).toContain(String(d.getFullYear()))
    expect(localText).toContain(
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    )
    // 含时区标识
    expect(localText).toMatch(/GMT|UTC|[+-]\d{2}|时/)
  })
})

describe('AC-2/AC-4 日期 → 时间戳', () => {
  it('AC-2: datetime-local 输入换算出秒级与毫秒级时间戳', () => {
    render(<TimestampConverter />)
    const dtInput = screen.getByLabelText('日期时间')
    fireEvent.change(dtInput, { target: { value: '2023-11-15T06:13:20' } })

    const ms = new Date('2023-11-15T06:13:20').getTime()
    expect(Number.isNaN(ms)).toBe(false)

    expect(within(getDtRow('秒级时间戳')).getByText(String(Math.floor(ms / 1000)))).toBeInTheDocument()
    expect(within(getDtRow('毫秒级时间戳')).getByText(String(ms))).toBeInTheDocument()
  })

  it('AC-4: 未选择日期时不输出时间戳也不报错', () => {
    render(<TimestampConverter />)
    const region = screen.getByRole('region', { name: '日期转时间戳' })
    expect(within(region).queryByText(/^\d{10,}$/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('AC-4 非法输入与超范围日期不崩溃', () => {
  it('AC-4: 时间戳输入非数字 → 友好提示，不崩溃', () => {
    render(<TimestampConverter />)
    fireEvent.change(screen.getByLabelText('时间戳'), {
      target: { value: 'abc不是数字' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '请输入纯数字时间戳（10 位秒级或 13 位毫秒级）',
    )
    expect(screen.queryByText(/^\d{4}-\d{2}-\d{2}T/)).not.toBeInTheDocument()
  })

  it('AC-4: 时间戳输入带小数/负号 → 友好提示，不崩溃', () => {
    render(<TimestampConverter />)
    const input = screen.getByLabelText('时间戳')

    fireEvent.change(input, { target: { value: '1.700000000' } })
    expect(screen.getByRole('alert')).toHaveTextContent('请输入纯数字时间戳')

    fireEvent.change(input, { target: { value: '-1700000000' } })
    expect(screen.getByRole('alert')).toHaveTextContent('请输入纯数字时间戳')
  })

  it('AC-4: 超过 13 位时间戳 → 友好提示，不崩溃', () => {
    render(<TimestampConverter />)
    fireEvent.change(screen.getByLabelText('时间戳'), {
      target: { value: '12345678901234567890' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('时间戳位数过长（最多 13 位）')
    expect(screen.queryByText(/^\d{4}-\d{2}-\d{2}T/)).not.toBeInTheDocument()
  })

  it('AC-4: 超范围日期（datetime-local 拒绝）→ 无输出、不崩溃，且恢复后可用', () => {
    render(<TimestampConverter />)
    const dtInput = screen.getByLabelText('日期时间') as HTMLInputElement

    // 2 月 30 日不存在：浏览器会把非法值清空，绝不能崩溃
    fireEvent.change(dtInput, { target: { value: '2026-02-30T10:00' } })
    expect(dtInput.value).toBe('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const dtRegion = screen.getByRole('region', { name: '日期转时间戳' })
    expect(within(dtRegion).queryByText(/^\d{10,}$/)).not.toBeInTheDocument()

    // 恢复输入合法值后功能正常
    fireEvent.change(dtInput, { target: { value: '2026-11-23T10:00' } })
    const ms = new Date('2026-11-23T10:00').getTime()
    expect(within(getDtRow('毫秒级时间戳')).getByText(String(ms))).toBeInTheDocument()
  })

  it('AC-4: 非法时间戳后输入合法值可恢复', () => {
    render(<TimestampConverter />)
    const input = screen.getByLabelText('时间戳')

    fireEvent.change(input, { target: { value: 'xyz' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '1700000000' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('2023-11-14T22:13:20.000Z')).toBeInTheDocument()
  })
})
