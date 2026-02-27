import React from 'react'

function openPage(path: string) {
  chrome.tabs.create({ url: chrome.runtime.getURL(path) })
}

export default function App() {
  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 12px' }}>📖 错题本</h2>
      <p style={{ color: '#666', fontSize: '13px', margin: '0 0 16px' }}>
        截图后按 Cmd+V 粘贴图片，AI 自动识别题目
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => openPage('library.html')}
          style={btnStyle}
        >
          📚 题库
        </button>
        <button
          onClick={() => openPage('export.html')}
          style={btnStyle}
        >
          📄 导出 PDF
        </button>
        <button
          onClick={() => openPage('options.html')}
          style={{ ...btnStyle, background: '#f5f5f5', color: '#333' }}
        >
          ⚙️ 设置
        </button>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '6px',
  background: '#1a73e8',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '14px',
  textAlign: 'left',
}
