import React, { useCallback, useEffect, useRef, useState } from 'react'
import { loadMistakes, loadSettings, saveMistakes } from '../../shared/storage'
import { recognizeQuestion } from '../../shared/api'
import type { MistakeItem } from '../../shared/types'

function openPage(path: string) {
  chrome.tabs.create({ url: chrome.runtime.getURL(path) })
}

function generateId(): string {
  return crypto.randomUUID()
}

async function runRecognition(id: string, imageDataUrl: string, apiKey: string): Promise<void> {
  try {
    const { question, answer } = await recognizeQuestion(imageDataUrl, apiKey)
    const store = await loadMistakes()
    if (store.itemsById[id]) {
      store.itemsById[id] = {
        ...store.itemsById[id],
        question,
        answer,
        status: 'success',
        updatedAt: Date.now(),
      }
      await saveMistakes(store)
    }
  } catch (err) {
    console.error('Recognition failed:', err)
    const store = await loadMistakes()
    if (store.itemsById[id]) {
      store.itemsById[id] = {
        ...store.itemsById[id],
        status: 'failed',
        updatedAt: Date.now(),
      }
      await saveMistakes(store)
    }
  }
}

export default function App() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus container so it receives paste events
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(reader.result as string)
      setSavedMsg('')
    }
    reader.readAsDataURL(file)
  }, [])

  async function handleSave() {
    if (!imageDataUrl) return
    setSaving(true)
    setSavedMsg('')
    try {
      const settings = await loadSettings()
      const store = await loadMistakes()
      const now = Date.now()
      const id = generateId()
      const item: MistakeItem = {
        id,
        createdAt: now,
        updatedAt: now,
        sourceRegion: settings.defaultSourceRegion,
        imageDataUrl,
        tags: [],
        question: '（识别中…）',
        answer: '',
        note: '',
        status: 'processing',
      }
      store.itemsById[id] = item
      store.itemOrder.unshift(id)
      await saveMistakes(store)
      setSavedMsg('✅ 已入库，识别中…')
      setImageDataUrl(null)

      // Async recognition — fire and forget
      runRecognition(id, imageDataUrl, settings.arkApiKey)
    } catch (err) {
      console.error('Save failed:', err)
      setSavedMsg('❌ 保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPaste={handlePaste}
      style={{ padding: '16px', fontFamily: 'sans-serif', outline: 'none' }}
    >
      <h2 style={{ margin: '0 0 8px' }}>📖 错题本</h2>
      <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px' }}>
        截图后按 Cmd+V 粘贴图片，AI 自动识别题目
      </p>

      <div
        style={{
          border: '2px dashed #d0d0d0',
          borderRadius: '8px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          overflow: 'hidden',
          background: '#fafafa',
          cursor: 'default',
        }}
      >
        {imageDataUrl ? (
          <img
            src={imageDataUrl}
            alt="截图预览"
            style={{ maxWidth: '100%', maxHeight: '200px', display: 'block' }}
          />
        ) : (
          <span style={{ color: '#aaa', fontSize: '13px' }}>
            按 Cmd+V / Ctrl+V 粘贴截图
          </span>
        )}
      </div>

      {imageDataUrl && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...btnStyle, width: '100%', marginBottom: '8px' }}
        >
          {saving ? '保存中…' : '💾 保存并识别'}
        </button>
      )}

      {savedMsg && (
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#555' }}>{savedMsg}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        <button onClick={() => openPage('library.html')} style={btnStyle}>
          📚 题库
        </button>
        <button onClick={() => openPage('export.html')} style={btnStyle}>
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
