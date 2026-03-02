import { useEffect, useState } from 'react'
import { loadMistakes, saveMistakes, loadSettings } from '../../shared/storage'
import { deleteImage } from '../../shared/imageStore'
import { recognizeQuestion } from '../../shared/api'
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

export default function DetailApp() {
  const [store, setStore] = useState<MistakesStore | null>(null)
  const [item, setItem] = useState<MistakeItem | null>(null)
  const [note, setNote] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const params = new URLSearchParams(location.search)
  const id = params.get('id')

  useEffect(() => {
    if (!id) return
    loadMistakes().then((s) => {
      setStore(s)
      const it = s.itemsById[id]
      if (it) {
        setItem(it)
        setNote(it.note ?? '')
        setTagsText((it.tags || []).join(', '))
      }
    })
  }, [id])

  // Poll when this item is processing so the UI updates automatically
  useEffect(() => {
    if (!id) return
    let timer: number | undefined
    if (item && item.status === 'processing') {
      timer = window.setInterval(async () => {
        try {
          const s = await loadMistakes()
          const it = s.itemsById[id]
          if (it && it.status !== item.status) {
            setStore(s)
            setItem(it)
            setNote(it.note ?? '')
            setTagsText((it.tags || []).join(', '))
          }
        } catch (e) {
          // ignore poll errors
        }
      }, 2000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [id, item?.status])

  if (!id) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <h1>🔍 题目详情</h1>
        <p style={{ color: '#666' }}>未指定题目 ID</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <h1>🔍 题目详情</h1>
        <p style={{ color: '#666' }}>正在加载题目…</p>
      </div>
    )
  }

  async function handleSave() {
    if (!store || !item) return
    setBusy(true)
    try {
      const updated: MistakeItem = {
        ...item,
        note: note,
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: Date.now(),
      }
      store.itemsById[item.id] = updated
      await saveMistakes(store)
      setStore({ ...store })
      setItem(updated)
      setMessage('已保存')
      setTimeout(() => setMessage(''), 1500)
    } catch (err) {
      setMessage(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRetryRecognition() {
    if (!store || !item) return
    setBusy(true)
    setMessage('重新识别中…')
    try {
      const settings = await loadSettings()
      // mark processing
      store.itemsById[item.id] = {
        ...item,
        status: 'processing',
        question: '（识别中…）',
        answer: '',
        errorMessage: '',
        updatedAt: Date.now(),
      }
      await saveMistakes(store)
      setStore({ ...store })
      setItem(store.itemsById[item.id])

      const { question, answer } = await recognizeQuestion(item.imageDataUrl, settings.arkApiKey, settings.modelId)

      store.itemsById[item.id] = {
        ...store.itemsById[item.id],
        question,
        answer,
        status: 'success',
        errorMessage: '',
        updatedAt: Date.now(),
      }
      await saveMistakes(store)
      setStore({ ...store })
      setItem(store.itemsById[item.id])
      setMessage('识别完成')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const s = await loadMistakes()
      if (item && s.itemsById[item.id]) {
        s.itemsById[item.id] = {
          ...s.itemsById[item.id],
          status: 'failed',
          errorMessage: errMsg,
          updatedAt: Date.now(),
        }
        await saveMistakes(s)
        setStore(s)
        setItem(s.itemsById[item.id])
      }
      setMessage(`识别失败：${errMsg}`)
    } finally {
      setBusy(false)
      setTimeout(() => setMessage(''), 2500)
    }
  }

  async function handleDelete() {
    if (!store || !item) return
    if (!confirm('确定要删除该题目吗？此操作不可恢复。')) return
    delete store.itemsById[item.id]
    store.itemOrder = store.itemOrder.filter((i) => i !== item.id)
    try {
      await deleteImage(item.id).catch(() => {})
    } catch (e) {
      // ignore
    }
    await saveMistakes(store)
    // navigate back to library
    location.href = 'library.html'
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>🔍 题目详情</h1>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {item.imageDataUrl && (
          <img src={item.imageDataUrl} alt="题目截图" style={{ width: 320, height: 240, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: STATUS_COLOR[item.status], background: `${STATUS_COLOR[item.status]}18`, marginBottom: 8 }}>
            {STATUS_LABEL[item.status]}
          </div>

          {item.status === 'failed' && item.errorMessage && (
            <div style={{ color: '#d00', margin: '8px 0' }}>
              <p style={{ margin: 0 }}><strong>错误原因：</strong>{item.errorMessage}</p>
              {item.debugResponse && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write('<pre>' + (item.debugResponse || '') + '</pre>'); w.document.close() } }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>查看原始响应</button>
                </div>
              )}
            </div>
          )}

          <h3 style={{ margin: '8px 0' }}>题目</h3>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>{item.question || '（无题目内容）'}</div>

          <h3 style={{ margin: '12px 0 6px' }}>参考答案</h3>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>{item.answer || '（无）'}</div>

          <h3 style={{ margin: '12px 0 6px' }}>标签（逗号分隔）</h3>
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }} />

          <h3 style={{ margin: '12px 0 6px' }}>笔记</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={6} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleSave} disabled={busy} style={{ padding: '10px 14px', borderRadius: 6, border: 'none', background: '#1a73e8', color: '#fff' }}>{busy ? '处理中…' : '💾 保存'}</button>
            <button onClick={handleRetryRecognition} disabled={busy} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>🔁 重新识别</button>
            <button onClick={handleDelete} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #eee', background: '#fff', color: '#c00' }}>删除</button>
            <div style={{ marginLeft: 'auto', color: '#777', alignSelf: 'center' }}>{new Date(item.createdAt).toLocaleString('zh-CN')} · {item.sourceRegion}</div>
          </div>

          {message && <p style={{ marginTop: 8, color: '#444' }}>{message}</p>}
        </div>
      </div>
    </div>
  )
}
