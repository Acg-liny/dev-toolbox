import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Base64Tool from '../src/tools/Base64Tool'

function getInput(): HTMLTextAreaElement {
  return screen.getByLabelText<HTMLTextAreaElement>('原文文本')
}

function getOutput(): HTMLTextAreaElement {
  return screen.getByLabelText<HTMLTextAreaElement>('Base64 结果')
}

async function switchToDecode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /解码（Base64 → 文本）/ }))
}

describe('模式切换', () => {
  it('默认为编码模式，标签与占位符对应编码语义', () => {
    render(<Base64Tool />)
    expect(screen.getByRole('radio', { name: /编码（文本 → Base64）/ })).toBeChecked()
    expect(screen.getByLabelText('原文文本')).toBeInTheDocument()
    expect(screen.getByLabelText('Base64 结果')).toBeInTheDocument()
  })

  it('切换到解码模式后标签变为「Base64 文本」/「解码结果」', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await switchToDecode(user)
    expect(screen.getByRole('radio', { name: /解码（Base64 → 文本）/ })).toBeChecked()
    expect(screen.getByLabelText('Base64 文本')).toBeInTheDocument()
    expect(screen.getByLabelText('解码结果')).toBeInTheDocument()
    expect(screen.queryByLabelText('原文文本')).not.toBeInTheDocument()
  })
})

describe('AC-2 中文与 emoji 编码 → 解码往返一致', () => {
  it('编码中文得到预期 Base64', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await user.type(getInput(), '中文测试')
    expect(getOutput().value).toBe('5Lit5paH5rWL6K+V')
  })

  it('编码 emoji 得到预期 Base64', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await user.click(getInput())
    await user.paste('🎉')
    expect(getOutput().value).toBe('8J+OiQ==')
  })

  it('中文 + emoji 混排编码后切到解码模式可还原原文', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)

    const original = '中文🎉 mix 👩‍💻'
    await user.click(getInput())
    await user.paste(original)
    const encoded = getOutput().value
    expect(encoded).toBe('5Lit5paH8J+OiSBtaXgg8J+RqeKAjfCfkrs=')

    // 清空后切到解码模式，粘贴编码结果
    await user.clear(getInput())
    await switchToDecode(user)
    const decodeField = screen.getByLabelText('Base64 文本')
    await user.click(decodeField)
    await user.paste(encoded)
    expect(screen.getByLabelText('解码结果').value).toBe(original)
  })

  it('解码已知中文 Base64', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await switchToDecode(user)
    await user.type(screen.getByLabelText('Base64 文本'), '5L2g5aW9')
    expect(screen.getByLabelText('解码结果').value).toBe('你好')
  })

  it('纯空白输入编码结果正确（不被空串短路）', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)

    await user.type(getInput(), ' ')
    expect(getOutput().value).toBe('IA==')

    await user.clear(getInput())
    await user.click(getInput())
    await user.paste('\n')
    expect(getOutput().value).toBe('Cg==')
  })
})

describe('AC-3 非法 Base64 输入有错误提示且不崩溃', () => {
  it('含非法字符时显示 role=alert 提示', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await switchToDecode(user)
    await user.type(screen.getByLabelText('Base64 文本'), 'abc$def=')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('非法 Base64 输入')
    expect(alert).toHaveTextContent('非法字符')
    expect(screen.getByLabelText('解码结果').value).toBe('')
  })

  it('长度余 1 位时显示长度非法提示', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await switchToDecode(user)
    await user.type(screen.getByLabelText('Base64 文本'), 'AAAAA')
    expect(screen.getByRole('alert')).toHaveTextContent('长度非法')
  })

  it('字节序列非 UTF-8 时提示而非崩溃', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await switchToDecode(user)
    // //4= → 0xFF 0xFE，非合法 UTF-8
    await user.type(screen.getByLabelText('Base64 文本'), '//4=')
    expect(screen.getByRole('alert')).toHaveTextContent('UTF-8')
  })

  it('输入合法 Base64 后错误提示消失', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    await switchToDecode(user)
    const field = screen.getByLabelText('Base64 文本')
    await user.type(field, 'abc$')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.clear(field)
    await user.type(field, 'aGVsbG8=')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('解码结果').value).toBe('hello')
  })

  it('空白输入不报错，输出为空', async () => {
    render(<Base64Tool />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getOutput().value).toBe('')
  })
})

describe('AC-4 输入、输出均可一键复制', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>()

  // userEvent.setup() 会装自己的 clipboard stub，必须在其之后覆盖
  function setupUser() {
    const user = userEvent.setup()
    writeText.mockReset()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    return user
  }

  it('编码模式下复制输入与复制输出分别写入剪贴板并提示已复制', async () => {
    const user = setupUser()
    render(<Base64Tool />)
    await user.type(getInput(), '中文测试')

    await user.click(screen.getByRole('button', { name: '复制输入' }))
    expect(writeText).toHaveBeenLastCalledWith('中文测试')
    expect(screen.getByText('已复制')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制输出' }))
    expect(writeText).toHaveBeenLastCalledWith('5Lit5paH5rWL6K+V')
    expect(screen.getByText('已复制')).toBeInTheDocument()
  })

  it('解码模式下复制输出复制的是解码结果', async () => {
    const user = setupUser()
    render(<Base64Tool />)
    await switchToDecode(user)
    await user.type(screen.getByLabelText('Base64 文本'), '5L2g5aW9')

    await user.click(screen.getByRole('button', { name: '复制输出' }))
    expect(writeText).toHaveBeenLastCalledWith('你好')
    expect(screen.getByText('已复制')).toBeInTheDocument()
  })

  it('输入为空时复制按钮禁用', () => {
    render(<Base64Tool />)
    expect(screen.getByRole('button', { name: '复制输入' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '复制输出' })).toBeDisabled()
  })

  it('剪贴板写入失败时给出友好错误提示', async () => {
    const user = setupUser()
    writeText.mockRejectedValue(new Error('denied'))
    render(<Base64Tool />)
    await user.type(getInput(), 'abc')
    await user.click(screen.getByRole('button', { name: '复制输入' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('复制失败')
  })

  it('复制失败提示在输入变化后自动清除', async () => {
    const user = setupUser()
    writeText.mockRejectedValue(new Error('denied'))
    render(<Base64Tool />)
    await user.type(getInput(), 'abc')
    await user.click(screen.getByRole('button', { name: '复制输入' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('复制失败')

    await user.type(getInput(), 'd')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('占位文本不影响实际界面', () => {
  it('「开发中」以隐藏节点存在，界面不可见', () => {
    render(<Base64Tool />)
    const placeholder = screen.getByText('开发中')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).not.toBeVisible()
    expect(placeholder).toHaveAttribute('hidden')
  })

  it('隐藏占位不影响表单控件的可见性', async () => {
    const user = userEvent.setup()
    render(<Base64Tool />)
    expect(getInput()).toBeVisible()
    expect(getOutput()).toBeVisible()
    await user.type(getInput(), 'hello')
    expect(getOutput().value).toBe('aGVsbG8=')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
