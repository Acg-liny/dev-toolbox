import { useEffect, useState } from 'react'
import { resolveTool, tools, type ToolDescriptor } from './tools/registry'

function readToolFromHash(): ToolDescriptor {
  return resolveTool(window.location.hash)
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolDescriptor>(readToolFromHash)

  useEffect(() => {
    const onHashChange = () => {
      setActiveTool(readToolFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const ActiveTool = activeTool.component

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">开发者工具箱</span>
      </header>
      <div className="app-body">
        <nav className="sidebar" aria-label="工具导航">
          <ul className="tool-list">
            {tools.map((tool) => (
              <li key={tool.id}>
                <a
                  className="tool-link"
                  href={`#${tool.id}`}
                  aria-current={tool.id === activeTool.id ? 'page' : undefined}
                >
                  <span className="tool-link-name">{tool.name}</span>
                  <span className="tool-link-desc">{tool.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="content">
          <ActiveTool />
        </main>
      </div>
    </div>
  )
}
