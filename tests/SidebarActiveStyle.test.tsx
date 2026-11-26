import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import App from '../src/App'

// 把真实 index.css 注入 jsdom，断言用户可见的选中态样式（非实现细节）
const css = readFileSync(resolve(__dirname, '../src/index.css'), 'utf8')
let styleEl: HTMLStyleElement

beforeAll(() => {
  styleEl = document.createElement('style')
  styleEl.textContent = css
  document.head.appendChild(styleEl)
})

afterAll(() => {
  styleEl.remove()
})

function linkByName(name: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(name) })
}

// jsdom 把默认 box-shadow 序列化为 'currentcolor none'，归一化为「无阴影」
function hasBoxShadow(el: HTMLElement): boolean {
  return !/none$/.test(getComputedStyle(el).boxShadow)
}

describe('AC-1 选中项更显眼（白卡浮起 + accent 左条 + 字重）', () => {
  it('AC-1: 选中项有浮起阴影，未选中项无阴影', () => {
    render(<App />)

    const selectedEl = linkByName('JSON 格式化')
    const selected = getComputedStyle(selectedEl)

    expect(hasBoxShadow(selectedEl)).toBe(true)
    expect(selected.boxShadow).toContain('inset') // accent 左条
    expect(hasBoxShadow(linkByName('时间戳转换'))).toBe(false)
  })

  it('AC-1: 选中项背景与未选中项不同（白卡从灰底浮起）', () => {
    render(<App />)

    const selected = getComputedStyle(linkByName('JSON 格式化'))
    const unselected = getComputedStyle(linkByName('时间戳转换'))

    expect(selected.backgroundColor).not.toBe(unselected.backgroundColor)
    expect(selected.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  it('AC-1: 选中项名称字重 700，未选中项为常规字重', () => {
    render(<App />)

    const selectedName = linkByName('JSON 格式化').querySelector('.tool-link-name')
    const unselectedName = linkByName('时间戳转换').querySelector('.tool-link-name')

    expect(getComputedStyle(selectedName!).fontWeight).toBe('700')
    expect(getComputedStyle(unselectedName!).fontWeight).not.toBe('700')
  })

  it('AC-1: 点击切换后阴影样式跟随新的选中项', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(linkByName('时间戳转换'))

    expect(hasBoxShadow(linkByName('时间戳转换'))).toBe(true)
    expect(hasBoxShadow(linkByName('JSON 格式化'))).toBe(false)
    expect(
      getComputedStyle(linkByName('时间戳转换').querySelector('.tool-link-name')!).fontWeight,
    ).toBe('700')
    expect(
      getComputedStyle(linkByName('JSON 格式化').querySelector('.tool-link-name')!).fontWeight,
    ).not.toBe('700')
  })
})

describe('AC-2 轻微阴影（token 化两层阴影）', () => {
  it('AC-2: 选中态阴影为两层（接触阴影 + 扩散阴影），数值轻微不夸张', () => {
    render(<App />)

    const shadow = getComputedStyle(linkByName('JSON 格式化')).boxShadow
    const layers = shadow.split(/,(?![^(]*\))/).map((s) => s.trim())

    expect(layers.length).toBeGreaterThanOrEqual(2)
    // 两层都是小距离/低透明度的轻微阴影
    expect(shadow).toContain('rgba(15, 23, 42,')
  })

  it('AC-2: 未选中与 hover 前的普通链接不带卡片阴影', () => {
    render(<App />)

    expect(hasBoxShadow(linkByName('UUID 生成器'))).toBe(false)
  })
})
