import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import BaseConverter from '../src/tools/BaseConverter'

afterEach(() => {
  cleanup()
  window.location.hash = ''
  // 还原 jsdom 默认（无 navigator.clipboard）
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
  })
})

function resultsRegion(): HTMLElement {
  return screen.getByRole('region', { name: '转换结果' })
}

/** 取四行结果中 label 所在的行（label 与结果值同处一个 row div） */
function resultRow(label: string): HTMLElement {
  const labelEl = within(resultsRegion()).getByText(label)
  const row = labelEl.closest('div')
  if (!row) throw new Error(`未找到 ${label} 所在的行`)
  return row
}

function inputBox(): HTMLInputElement {
  return screen.getByLabelText('输入值') as HTMLInputElement
}

describe('AC-1 侧边栏注册与渲染', () => {
  it('AC-1: 侧边栏出现「进制转换」，点击渲染该工具，其他工具不受影响', async () => {
    const user = userEvent.setup()
    render(<App />)

    const nav = screen.getByRole('navigation', { name: '工具导航' })
    expect(nav).toHaveTextContent('进制转换')

    await user.click(screen.getByRole('link', { name: /进制转换/ }))
    expect(
      screen.getByRole('heading', { level: 2, name: '进制转换' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#base-converter')

    // 其他工具仍可正常打开
    await user.click(screen.getByRole('link', { name: /时间戳转换/ }))
    expect(
      screen.getByRole('heading', { level: 2, name: '时间戳转换' }),
    ).toBeInTheDocument()
  })
})

describe('AC-2 默认 DEC 实时联动', () => {
  it('AC-2: 默认输入进制为 DEC，输入 255 → BIN/OCT/HEX 正确且实时更新', () => {
    render(<BaseConverter />)
    expect(screen.getByRole('radio', { name: 'DEC' })).toBeChecked()

    const input = inputBox()
    fireEvent.change(input, { target: { value: '25' } })
    expect(within(resultRow('BIN')).getByText('11001')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '255' } })
    expect(within(resultRow('BIN')).getByText('11111111')).toBeInTheDocument()
    expect(within(resultRow('OCT')).getByText('377')).toBeInTheDocument()
    expect(within(resultRow('HEX')).getByText('FF')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('AC-3 HEX 输入与大写输出', () => {
  it('AC-3: 切到 HEX 输入 ff → DEC 255 / BIN 11111111 / OCT 377，HEX 行大写', () => {
    render(<BaseConverter />)
    fireEvent.click(screen.getByRole('radio', { name: 'HEX' }))
    fireEvent.change(inputBox(), { target: { value: 'ff' } })

    expect(within(resultRow('DEC')).getByText('255')).toBeInTheDocument()
    expect(within(resultRow('BIN')).getByText('11111111')).toBeInTheDocument()
    expect(within(resultRow('OCT')).getByText('377')).toBeInTheDocument()
    // 输入小写 ff，HEX 结果行统一大写
    expect(within(resultRow('HEX')).getByText('FF')).toBeInTheDocument()
  })
})

describe('AC-4 BIN 输入', () => {
  it('AC-4: 切到 BIN 输入 1010 → DEC 10 / OCT 12 / HEX A', () => {
    render(<BaseConverter />)
    fireEvent.click(screen.getByRole('radio', { name: 'BIN' }))
    fireEvent.change(inputBox(), { target: { value: '1010' } })

    expect(within(resultRow('DEC')).getByText('10')).toBeInTheDocument()
    expect(within(resultRow('OCT')).getByText('12')).toBeInTheDocument()
    expect(within(resultRow('HEX')).getByText('A')).toBeInTheDocument()
  })
})

describe('AC-5 非法输入错误提示与恢复', () => {
  it('AC-5: HEX 输入 G → 明确错误文案，三路结果不显示错误数值，修正后恢复', () => {
    render(<BaseConverter />)
    fireEvent.click(screen.getByRole('radio', { name: 'HEX' }))
    const input = inputBox()
    fireEvent.change(input, { target: { value: 'G' } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '十六进制仅允许 0-9 和 A-F',
    )
    expect(input).toHaveAttribute('aria-describedby', 'base-converter-error')
    // 不白屏不崩溃，四行均为占位、复制禁用
    for (const label of ['BIN', 'OCT', 'DEC', 'HEX']) {
      expect(within(resultRow(label)).getByText('—')).toBeInTheDocument()
      expect(
        within(resultRow(label)).queryByRole('button'),
      ).toBeDisabled()
    }

    // 修正后自动恢复联动
    fireEvent.change(input, { target: { value: 'ff' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(resultRow('DEC')).getByText('255')).toBeInTheDocument()
  })

  it('AC-5: DEC 输入 abc → 明确错误文案，修正后恢复', () => {
    render(<BaseConverter />)
    const input = inputBox()
    fireEvent.change(input, { target: { value: 'abc' } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '十进制仅允许数字 0-9',
    )
    expect(within(resultRow('DEC')).getByText('—')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '255' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(resultRow('DEC')).getByText('255')).toBeInTheDocument()
  })

  it('AC-5: BIN 含 2、OCT 含 8 分别给出各自字符集错误', () => {
    render(<BaseConverter />)
    fireEvent.click(screen.getByRole('radio', { name: 'BIN' }))
    fireEvent.change(inputBox(), { target: { value: '102' } })
    expect(screen.getByRole('alert')).toHaveTextContent('二进制仅允许 0 和 1')

    fireEvent.click(screen.getByRole('radio', { name: 'OCT' }))
    fireEvent.change(inputBox(), { target: { value: '19' } })
    expect(screen.getByRole('alert')).toHaveTextContent('八进制仅允许 0-7')
  })
})

describe('AC-6 四行结果逐行复制', () => {
  it('AC-6: 四行各有复制按钮，剪贴板内容等于该行值并显示「已复制」', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<BaseConverter />)
    fireEvent.change(inputBox(), { target: { value: '255' } })

    const expected: [string, string][] = [
      ['BIN', '11111111'],
      ['OCT', '377'],
      ['DEC', '255'],
      ['HEX', 'FF'],
    ]
    for (const [label, value] of expected) {
      const row = resultRow(label)
      fireEvent.click(within(row).getByRole('button', { name: '复制' }))
      expect(
        await within(row).findByRole('button', { name: '已复制' }),
      ).toBeInTheDocument()
      expect(writeText).toHaveBeenLastCalledWith(value)
    }
  })

  it('AC-6: 空输入时四行为占位「—」且复制按钮禁用', () => {
    render(<BaseConverter />)
    for (const label of ['BIN', 'OCT', 'DEC', 'HEX']) {
      expect(within(resultRow(label)).getByText('—')).toBeInTheDocument()
      expect(within(resultRow(label)).queryByRole('button')).toBeDisabled()
    }
  })

  it('AC-6: 剪贴板不可用时给出复制失败提示，不崩溃', async () => {
    // jsdom 默认无 navigator.clipboard
    render(<BaseConverter />)
    fireEvent.change(inputBox(), { target: { value: '255' } })

    fireEvent.click(within(resultRow('BIN')).getByRole('button', { name: '复制' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '复制失败，请手动选择文本后复制',
    )
  })
})

describe('AC-7 DEC 超出安全整数范围', () => {
  it('AC-7: 输入 2^53 → 溢出提示，不显示任何转换结果', () => {
    render(<BaseConverter />)
    fireEvent.change(inputBox(), { target: { value: '9007199254740992' } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '数值超出 JS 安全整数范围（±2⁵³−1），无法转换',
    )
    for (const label of ['BIN', 'OCT', 'DEC', 'HEX']) {
      expect(within(resultRow(label)).getByText('—')).toBeInTheDocument()
      expect(within(resultRow(label)).queryByRole('button')).toBeDisabled()
    }
  })

  it('AC-7: 边界值 2^53−1（最大安全整数）仍可正常转换', () => {
    render(<BaseConverter />)
    fireEvent.change(inputBox(), { target: { value: '9007199254740991' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      within(resultRow('DEC')).getByText('9007199254740991'),
    ).toBeInTheDocument()
    expect(within(resultRow('BIN')).getByText('1'.repeat(53))).toBeInTheDocument()
  })
})
