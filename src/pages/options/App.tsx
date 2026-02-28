import React, { useEffect, useState } from 'react'
import { loadSettings, saveSettings } from '../../shared/storage'
import type { Settings, SourceRegion } from '../../shared/types'

export default function OptionsApp() {
  const [settings, setSettings] = useState<Settings>({
    bailianApiKey: '',
    bailianAppId: '',
    defaultSourceRegion: 'SH',
    arkApiKey: '',
  })
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveStatus('saving')
    try {
      await saveSettings(settings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
    }
  }

  function handleTestConnection() {
    alert('连通性测试功能即将上线')
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '560px' }}>
      <h1 style={{ fontSize: '22px', margin: '0 0 24px' }}>⚙️ 设置</h1>
      <form onSubmit={handleSave}>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>阿里云百炼 API</legend>

          <div style={fieldRow}>
            <label style={labelStyle} htmlFor="apiKey">API Key</label>
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={settings.bailianApiKey}
                onChange={e => setSettings(s => ({ ...s, bailianApiKey: e.target.value }))}
                placeholder="sk-xxxxxxxxxxxx"
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

          <div style={fieldRow}>
            <label style={labelStyle} htmlFor="appId">App ID</label>
            <input
              id="appId"
              type="text"
              value={settings.bailianAppId}
              onChange={e => setSettings(s => ({ ...s, bailianAppId: e.target.value }))}
              placeholder="your-app-id"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              style={outlineBtnStyle}
            >
              🔌 测试连通性（占位）
            </button>
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>豆包 Ark API</legend>

          <div style={fieldRow}>
            <label style={labelStyle} htmlFor="arkApiKey">API Key</label>
            <input
              id="arkApiKey"
              type="password"
              value={settings.arkApiKey}
              onChange={e => setSettings(s => ({ ...s, arkApiKey: e.target.value }))}
              placeholder="ARK API Key"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
            用于截图识别（doubao-seed-2-0-mini-260215）
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
