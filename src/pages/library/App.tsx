import { useEffect, useState } from 'react'
import { loadMistakes } from '../../shared/storage'
import type { MistakeItem, MistakesStore } from '../../shared/types'

const STATUS_LABEL: Record<MistakeItem['status'], string> = {
  processing: '🔄 解析中',
  success: '✅ 成功',
  failed: '❌ 失败',
}

const STATUS_COLOR: Record<MistakeItem['status'], string> = {
  processing: '#f59e0b',
  success: '#22c55e',
  failed: '#ef4444',
}

export default function LibraryApp() {
  const [store, setStore] = useState<MistakesStore | null>(null)

  useEffect(() => {
    loadMistakes().then(setStore)
  }, [])

  // Poll while any item is still processing
  useEffect(() => {
    if (!store) return
    const hasProcessing = store.itemOrder.some(
      (id) => store.itemsById[id]?.status === 'processing',
    )
    if (!hasProcessing) return
    const timer = setInterval(() => {
      loadMistakes().then(setStore)
    }, 2000)
    return () => clearInterval(timer)
  }, [store])

  const items = store
    ? store.itemOrder.map((id) => store.itemsById[id]).filter(Boolean)
    : []

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', margin: '0 0 8px' }}>📚 题库</h1>
      <p style={{ color: '#666', margin: '0 0 24px', fontSize: '14px' }}>
        共 {items.length} 条题目
      </p>

      {items.length === 0 ? (
        <div
          style={{
            border: '2px dashed #e0e0e0',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            color: '#999',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <p>暂无题目。在 Popup 中截图并粘贴后，题目将出现在这里。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                gap: '16px',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {item.imageDataUrl && (
                <img
                  src={item.imageDataUrl}
                  alt="题目截图"
                  style={{
                    width: '120px',
                    height: '90px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    flexShrink: 0,
                    border: '1px solid #eee',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: STATUS_COLOR[item.status],
                    background: `${STATUS_COLOR[item.status]}18`,
                    marginBottom: '8px',
                  }}
                >
                  {STATUS_LABEL[item.status]}
                </div>
                {item.status !== 'processing' && (
                  <>
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.question || '（无题目内容）'}
                    </p>
                    {item.answer && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#555',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        <strong>答案：</strong>
                        {item.answer}
                      </p>
                    )}
                  </>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#aaa' }}>
                  {new Date(item.createdAt).toLocaleString('zh-CN')} · {item.sourceRegion}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
