import React, { useEffect, useState } from 'react'
import { loadSettings, saveSettings } from '../../shared/storage'
import type { Settings, SourceRegion } from '../../shared/types'

export default function OptionsApp() {
  const [settings, setSettings] = useState<Settings>({
    defaultSourceRegion: 'SH',
    arkApiKey: '',
  })
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastTestError, setLastTestError] = useState<string>('')
  const [lastSaveError, setLastSaveError] = useState<string>('')

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveStatus('saving')
    try {
      // Ensure API key is trimmed before saving
      const toSave = { ...settings, arkApiKey: settings.arkApiKey?.trim() ?? '' }
      setSettings(toSave)
      await saveSettings(toSave)
      // clear last save error on success
      setLastSaveError('')
      try {
        chrome.storage.local.remove('arkSaveLastError')
      } catch {}
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      const msg = error instanceof Error ? error.message : String(error)
      setLastSaveError(msg)
      try {
        chrome.storage.local.set({ arkSaveLastError: msg })
      } catch {}
      setSaveStatus('error')
    }
  }

  async function handleTestConnection() {
    setSaveStatus('saving')
    try {
      const { testArkKey } = await import('../../shared/api')
      const res = await testArkKey(settings.arkApiKey)
      alert('测试成功: ' + String(res).slice(0, 200))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
      // clear any previous test error
      setLastTestError('')
      try {
        chrome.storage.local.remove('arkTestLastError')
      } catch {}
    } catch (err) {
      console.error('测试连通性失败:', err)
      const debug = err && typeof err === 'object' ? (err as any).debugResponse ?? (err as any).message ?? String(err) : String(err)
      setLastTestError(String(debug))
      try {
        chrome.storage.local.set({ arkTestLastError: String(debug) })
      } catch {}
      alert('测试失败: ' + (err instanceof Error ? err.message : String(err)))
      setSaveStatus('error')
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '560px' }}>
      <h1 style={{ fontSize: '22px', margin: '0 0 24px' }}>⚙️ 设置</h1>
      <form onSubmit={handleSave}>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>豆包 Ark API</legend>

          <div style={fieldRow}>
            <label style={labelStyle} htmlFor="arkApiKey">API Key</label>
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <input
                id="arkApiKey"
                type={showKey ? 'text' : 'password'}
                value={settings.arkApiKey}
                onChange={e => setSettings(s => ({ ...s, arkApiKey: e.target.value }))}
                placeholder="ARK API Key"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                style={smallBtnStyle}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              style={outlineBtnStyle}
            >
              🔌 测试连通性 (Ark)
            </button>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
              请先在火山引擎 ARK 控制台确认 API 密钥格式正确
            </p>
            {lastTestError && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#a00' }}>
                <div>上次测试错误（详细）：</div>
                <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: '8px', borderRadius: '4px' }}>
{lastTestError}
</pre>
              </div>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
            用于截图识别（doubao-seed-1-6-vision-250815 + base64）
          </p>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>默认来源地区</legend>
          <div style={{ display: 'flex', gap: '24px', padding: '8px 0' }}>
            {(['SH', 'SZ'] as SourceRegion[]).map(region => (
              <label key={region} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="region"
                  value={region}
                  checked={settings.defaultSourceRegion === region}
                  onChange={() => setSettings(s => ({ ...s, defaultSourceRegion: region }))}
                />
                {region === 'SH' ? '上海 (SH)' : '深圳 (SZ)'}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <button type="submit" style={primaryBtnStyle} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? '保存中…' : '💾 保存'}
          </button>
          {saveStatus === 'saved' && <span style={{ color: '#34a853' }}>✓ 已保存</span>}
          {saveStatus === 'error' && <span style={{ color: '#ea4335' }}>保存失败，请重试</span>}
          {lastSaveError && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#a00' }}>
              <div>上次保存错误（详细）：</div>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: '8px', borderRadius: '4px' }}>
{lastSaveError}
</pre>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
}
const legendStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '14px',
  padding: '0 8px',
}
const fieldRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '12px',
}
const labelStyle: React.CSSProperties = {
  width: '72px',
  fontSize: '14px',
  fontWeight: 500,
  flexShrink: 0,
}
const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  border: '1px solid #d0d0d0',
  borderRadius: '4px',
  fontSize: '14px',
}
const smallBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d0d0d0',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
  whiteSpace: 'nowrap',
}
const outlineBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid #1a73e8',
  borderRadius: '4px',
  background: '#fff',
  color: '#1a73e8',
  cursor: 'pointer',
  fontSize: '14px',
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '6px',
  background: '#1a73e8',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
}
