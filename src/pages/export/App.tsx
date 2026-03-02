import { useEffect, useState } from 'react'
import { loadMistakes } from '../../shared/storage'
import type { MistakeItem, MistakesStore } from '../../shared/types'

export default function ExportApp() {
  const [store, setStore] = useState<MistakesStore | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [includeAnswers, setIncludeAnswers] = useState(true)

  useEffect(() => {
    loadMistakes().then((s) => {
      setStore(s)
      const init: Record<string, boolean> = {}
      s.itemOrder.forEach((id) => (init[id] = false))
      setSelected(init)
    })
  }, [])

  const items: MistakeItem[] = store
    ? store.itemOrder.map((id) => store.itemsById[id]).filter(Boolean)
    : []

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function selectAll() {
    if (!store) return
    const s: Record<string, boolean> = {}
    store.itemOrder.forEach((id) => (s[id] = true))
    setSelected(s)
  }

  function deselectAll() {
    if (!store) return
    const s: Record<string, boolean> = {}
    store.itemOrder.forEach((id) => (s[id] = false))
    setSelected(s)
  }

  function buildPrintHtml(selectedItems: MistakeItem[]) {
    const style = `
      body{ font-family: sans-serif; padding: 24px; color:#111 }
      .card{ page-break-inside: avoid; border-bottom:1px solid #eee; padding:12px 0 }
      .q{ font-weight:600; margin:6px 0 }
      .a{ color:#444; margin:6px 0 }
      img{ max-width:100%; height:auto; display:block; margin:8px 0 }
    `
    const content = selectedItems
      .map((it) => `
        <div class="card">
          <div class="meta">${new Date(it.createdAt).toLocaleString('zh-CN')} · ${it.sourceRegion}</div>
          ${it.imageDataUrl ? `<img src="${it.imageDataUrl}" />` : ''}
          <div class="q">题目</div>
          <div>${escapeHtml(it.question || '（无题目内容）')}</div>
          ${includeAnswers ? `<div class="q">参考答案</div><div class="a">${escapeHtml(it.answer || '（无）')}</div>` : ''}
        </div>
      `)
      .join('\n')

    return `<!doctype html><html><head><meta charset="utf-8"><title>导出题目</title><style>${style}</style></head><body>${content}</body></html>`
  }

  function escapeHtml(input: string) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function selectedItemsList() {
    if (!store) return []
    return store.itemOrder.map((id) => store.itemsById[id]).filter((it) => it && selected[it.id]) as MistakeItem[]
  }

  function preview() {
    const list = selectedItemsList()
    if (list.length === 0) {
      alert('请先选择至少一条题目')
      return
    }
    const html = buildPrintHtml(list)
    const w = window.open('', '_blank')
    if (!w) {
      alert('无法打开新窗口，请允许弹窗或在浏览器设置中启用')
      return
    }
    w.document.write(html)
    w.document.close()
  }

  function exportPdf() {
    const list = selectedItemsList()
    if (list.length === 0) {
      alert('请先选择至少一条题目')
      return
    }
    const html = buildPrintHtml(list)
    const w = window.open('', '_blank')
    if (!w) {
      alert('无法打开新窗口，请允许弹窗或在浏览器设置中启用')
      return
    }
    w.document.write(html)
    w.document.close()
    // allow images to load
    setTimeout(() => {
      try {
        w.focus()
        w.print()
      } catch (err) {
        console.error(err)
      }
    }, 400)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>📄 导出 PDF</h1>
      <p style={{ color: '#666', margin: '0 0 12px' }}>选择要导出的题目，点击“预览”或“导出为 PDF”（通过浏览器打印）。</p>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={selectAll} style={btn}>全选</button>
        <button onClick={deselectAll} style={btn}>取消全选</button>
        <label style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} /> 包含参考答案</label>
        <div style={{ marginLeft: 'auto', color: '#666', alignSelf: 'center' }}>{items.length} 条题目</div>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff' }}>
        {items.length === 0 ? (
          <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>暂无题目</div>
        ) : (
          items.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #fafafa', alignItems: 'center' }}>
              <input type="checkbox" checked={!!selected[it.id]} onChange={() => toggle(it.id)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.question || '（无题目内容）'}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{new Date(it.createdAt).toLocaleString('zh-CN')} · {it.sourceRegion}</div>
              </div>
              <div style={{ width: 80, textAlign: 'right' }}>
                <button onClick={() => { setSelected((p) => ({ ...p, [it.id]: true })); preview(); }} style={{ ...btn, padding: '6px 8px' }}>预览</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={preview} style={{ ...btn, background: '#f5f5f5', color: '#333' }}>预览</button>
        <button onClick={exportPdf} style={{ ...btn, background: '#1a73e8', color: '#fff' }}>导出为 PDF</button>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
}

