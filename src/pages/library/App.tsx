import { useEffect, useState } from 'react'
import { loadMistakes, saveMistakes } from '../../shared/storage'
import { deleteImage } from '../../shared/imageStore'
import type { MistakeItem, MistakesStore } from '../../shared/types'

const STATUS_LABEL: Record<MistakeItem['status'], string> = {
  processing: '🔄 解析中',
  success: '✅ 成功',
  failed: '❌ 失败',
}

function TagBulkControls({ onAdd, onRemove }: { onAdd: (tag: string) => Promise<void>; onRemove: (tag: string) => Promise<void> }) {
  const [addText, setAddText] = useState('')
  const [removeText, setRemoveText] = useState('')
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input placeholder="添加标签" value={addText} onChange={(e) => setAddText(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }} />
      <button onClick={() => { onAdd(addText); setAddText('') }} style={btn}>添加到选中</button>
      <input placeholder="移除标签" value={removeText} onChange={(e) => setRemoveText(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }} />
      <button onClick={() => { onRemove(removeText); setRemoveText('') }} style={btn}>从选中移除</button>
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
}

const STATUS_COLOR: Record<MistakeItem['status'], string> = {
  processing: '#f59e0b',
  success: '#22c55e',
  failed: '#ef4444',
}

export default function LibraryApp() {
  const [store, setStore] = useState<MistakesStore | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MistakeItem['status']>('all')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({})
  const [addTagTextMap, setAddTagTextMap] = useState<Record<string, string>>({})

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

  // initialize selected map when items change
  useEffect(() => {
    if (!store) return
    const m: Record<string, boolean> = {}
    store.itemOrder.forEach((id) => (m[id] = selectedMap[id] ?? false))
    setSelectedMap(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.itemOrder.join(',')])

  const filtered = items.filter((it) => {
    if (statusFilter !== 'all' && it.status !== statusFilter) return false
    if (tagFilter.trim()) {
      const t = tagFilter.trim().toLowerCase()
      if (!it.tags.some((tag) => tag.toLowerCase().includes(t))) return false
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      const hay = [it.question || '', it.answer || '', it.note || '', ...(it.tags || [])].join(' ').toLowerCase()
      return hay.includes(q)
    }
    return true
  })

  function toggleSelect(id: string) {
    setSelectedMap((s) => ({ ...s, [id]: !s[id] }))
  }

  function setAddTagText(id: string, value: string) {
    setAddTagTextMap((m) => ({ ...m, [id]: value }))
  }

  function selectAllVisible() {
    const next = { ...selectedMap }
    filtered.forEach((it) => (next[it.id] = true))
    setSelectedMap(next)
  }

  function clearSelection() {
    setSelectedMap({})
  }

  async function addTagToSelected(tag: string) {
    if (!store) return
    const t = tag.trim()
    if (!t) return
    filtered.forEach((it) => {
      if (!selectedMap[it.id]) return
      const cur = store.itemsById[it.id]
      if (!cur.tags.includes(t)) cur.tags.push(t)
      cur.updatedAt = Date.now()
      store.itemsById[it.id] = cur
    })
    await saveMistakes(store)
    setStore({ ...store })
  }

  async function removeTagFromSelected(tag: string) {
    if (!store) return
    const t = tag.trim()
    if (!t) return
    filtered.forEach((it) => {
      if (!selectedMap[it.id]) return
      const cur = store.itemsById[it.id]
      cur.tags = cur.tags.filter((x) => x !== t)
      cur.updatedAt = Date.now()
      store.itemsById[it.id] = cur
    })
    await saveMistakes(store)
    setStore({ ...store })
  }

  async function deleteSelected() {
    if (!store) return
    const ids = Object.keys(selectedMap).filter((id) => selectedMap[id])
    if (ids.length === 0) return alert('未选中任何题目')
    if (!confirm(`确定要删除 ${ids.length} 条题目？此操作不可恢复。`)) return
    ids.forEach((id) => {
      delete store.itemsById[id]
      store.itemOrder = store.itemOrder.filter((x) => x !== id)
    })
    // attempt to delete images from IndexedDB
    try {
      await Promise.all(ids.map((id) => deleteImage(id).catch(() => {})))
    } catch (e) {
      // ignore image delete errors
    }
    await saveMistakes(store)
    setStore({ ...store })
    setSelectedMap({})
  }

  async function addTagToItem(id: string, tag: string) {
    if (!store) return
    const t = tag.trim()
    if (!t) return
    const cur = store.itemsById[id]
    if (!cur.tags.includes(t)) cur.tags.push(t)
    cur.updatedAt = Date.now()
    store.itemsById[id] = cur
    await saveMistakes(store)
    setStore({ ...store })
    setAddTagText(id, '')
  }

  async function removeTagFromItem(id: string, tag: string) {
    if (!store) return
    const cur = store.itemsById[id]
    cur.tags = cur.tags.filter((x) => x !== tag)
    cur.updatedAt = Date.now()
    store.itemsById[id] = cur
    await saveMistakes(store)
    setStore({ ...store })
  }

  function openDetailInNewTab(id: string) {
    const url = chrome?.runtime?.getURL ? chrome.runtime.getURL(`detail.html?id=${id}`) : `detail.html?id=${id}`
    window.open(url, '_blank')
  }

  function escapeHtml(input: string) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function buildSingleHtml(it: MistakeItem, includeAnswers = true) {
    const style = `body{ font-family: sans-serif; padding:24px; color:#111 } .card{ max-width:800px } .q{ font-weight:600; margin:6px 0 } .a{ color:#444; margin:6px 0 } img{ max-width:100%; height:auto; display:block; margin:8px 0 }`
    const content = `
      <div class="card">
        <div class="meta">${new Date(it.createdAt).toLocaleString('zh-CN')} · ${it.sourceRegion}</div>
        ${it.imageDataUrl ? `<img src="${it.imageDataUrl}" />` : ''}
        <div class="q">题目</div>
        <div>${escapeHtml(it.question || '（无题目内容）')}</div>
        ${includeAnswers ? `<div class="q">参考答案</div><div class="a">${escapeHtml(it.answer || '（无）')}</div>` : ''}
      </div>
    `
    return `<!doctype html><html><head><meta charset="utf-8"><title>导出题目</title><style>${style}</style></head><body>${content}</body></html>`
  }

  function exportSingle(it: MistakeItem) {
    const html = buildSingleHtml(it)
    const w = window.open('', '_blank')
    if (!w) return alert('无法打开新窗口，请允许弹窗')
    w.document.write(html)
    w.document.close()
    setTimeout(() => { try { w.focus(); w.print() } catch (e) { /* ignore */ } }, 300)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', margin: '0 0 8px' }}>📚 题库</h1>
      <p style={{ color: '#666', margin: '0 0 8px', fontSize: '14px' }}>
        共 {items.length} 条题目
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px', alignItems: 'center' }}>
        <input placeholder="搜索题目/答案/笔记/标签" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
          <option value="all">全部状态</option>
          <option value="processing">解析中</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
        <input placeholder="按标签过滤" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={selectAllVisible} style={btn}>选择可见</button>
        <button onClick={clearSelection} style={btn}>清空选择</button>
        <TagBulkControls onAdd={addTagToSelected} onRemove={removeTagFromSelected} />
            <button onClick={deleteSelected} style={{ ...btn, background: '#fff', color: '#c00', borderColor: '#f3c6c6' }}>删除选中</button>
            {tagFilter && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#fef3c7', padding: '6px 10px', borderRadius: 6 }}>已按标签筛选：{tagFilter}</span>
                <button onClick={() => setTagFilter('')} style={btn}>清除</button>
              </div>
            )}
      </div>

      {filtered.length === 0 ? (
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
          <p>暂无匹配题目。在 Popup 中截图并粘贴后，题目将出现在这里。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((item) => (
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
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={!!selectedMap[item.id]} onChange={() => toggleSelect(item.id)} />
              </div>
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

                    {item.status === 'failed' && item.errorMessage && (
                      <p
                        style={{
                          margin: '0 0 6px',
                          fontSize: '12px',
                          color: '#d00',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        <strong>错误原因：</strong>
                        {item.errorMessage}
                        {item.debugResponse ? (
                          <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write('<pre>' + (item.debugResponse || '') + '</pre>'); w.document.close() } }} style={{ marginLeft: 8, padding: '2px 6px', fontSize: 12 }}>查看响应</button>
                        ) : null}
                      </p>
                    )}

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
                    {/* Tags display and quick add/remove */}
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(item.tags || []).map((tag) => (
                            <span key={tag} onClick={() => setTagFilter(tag)} style={{ background: tagFilter === tag ? '#e0f2fe' : '#f1f5f9', padding: '4px 8px', borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                              <span>{tag}</span>
                              <button onClick={(e) => { e.stopPropagation(); removeTagFromItem(item.id, tag) }} style={{ border: 'none', background: 'transparent', color: '#c00', cursor: 'pointer', padding: 0, fontSize: 12 }}>×</button>
                            </span>
                          ))}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input value={addTagTextMap[item.id] || ''} onChange={(e) => setAddTagText(item.id, e.target.value)} placeholder="添加标签" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #eee', fontSize: 12 }} />
                        <button onClick={() => addTagToItem(item.id, addTagTextMap[item.id] || '')} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}>添加</button>
                      </div>
                    </div>
                  </>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#aaa' }}>
                  {new Date(item.createdAt).toLocaleString('zh-CN')} · {item.sourceRegion}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <button onClick={() => openDetailInNewTab(item.id)} style={{ ...btn, padding: '6px 10px' }}>跳转详情</button>
                <button onClick={() => exportSingle(item)} style={{ ...btn, padding: '6px 10px' }}>导出该题</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
