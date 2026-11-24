import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('AC-1 构建产物（由 npm run build 验证，见套件说明）', () => {
  it('AC-1: 应用可在 jsdom 中挂载渲染', () => {
    render(<App />)
    expect(screen.getByText('开发者工具箱')).toBeInTheDocument()
  })
})

describe('AC-2 侧边栏切换与 hash 选中保持', () => {
  it('AC-2: 无 hash 时默认渲染第一个工具（JSON 格式化）', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'JSON 格式化' }),
    ).toBeInTheDocument()
    const defaultLink = screen.getByRole('link', { name: /JSON 格式化/ })
    expect(defaultLink).toHaveAttribute('aria-current', 'page')
  })

  it('AC-2: 侧边栏列出全部 5 个工具', () => {
    render(<App />)
    const links = screen.getByRole('navigation', { name: '工具导航' })
    for (const name of [
      'JSON 格式化',
      '时间戳转换',
      'Base64 编解码',
      '正则测试',
      'UUID 生成器',
    ]) {
      expect(links).toHaveTextContent(name)
    }
    expect(links.querySelectorAll('a.tool-link')).toHaveLength(6)
  })

  it('AC-2: 点击侧边栏切换工具并更新选中标记', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /时间戳转换/ }))

    expect(
      screen.getByRole('heading', { name: '时间戳转换' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'JSON 格式化' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /时间戳转换/ }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: /JSON 格式化/ }),
    ).not.toHaveAttribute('aria-current')
    expect(window.location.hash).toBe('#timestamp-converter')
  })

  it('AC-2: 刷新后从 location.hash 恢复选中状态', () => {
    window.location.hash = '#uuid-generator'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'UUID 生成器' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /UUID 生成器/ }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: /JSON 格式化/ }),
    ).not.toHaveAttribute('aria-current')
  })

  it('AC-2: 未知 hash 回落到默认工具', () => {
    window.location.hash = '#no-such-tool'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'JSON 格式化' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /JSON 格式化/ }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('AC-2: 依次点击多个工具都能正确切换', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: /Base64 编解码/ }))
    expect(
      screen.getByRole('heading', { name: 'Base64 编解码' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /正则测试/ }))
    expect(
      screen.getByRole('heading', { name: '正则测试' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Base64 编解码' }),
    ).not.toBeInTheDocument()
  })
})
