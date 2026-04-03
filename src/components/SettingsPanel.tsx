import { useState } from 'react';
import type { Language, LLMConfig } from '@/types';
import { t } from '@/i18n';

interface SettingsPanelProps {
  config: LLMConfig;
  onUpdate: (updates: Partial<LLMConfig>) => void;
  language: Language;
}

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (faster, cheaper)' },
];

export function SettingsPanel({ config, onUpdate, language }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) {
    return (
      <button className="btn btn-ghost btn-sm settings-toggle" onClick={() => setIsOpen(true)}>
        ⚙ {t('settings.button', language)}
      </button>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <span className="settings-title">{t('settings.title', language)}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setIsOpen(false)}>✕</button>
      </div>

      <div className="settings-field">
        <label className="settings-label">{t('settings.proxyUrl', language)}</label>
        <input
          type="url"
          className="settings-input"
          value={config.proxyUrl}
          onChange={(e) => onUpdate({ proxyUrl: e.target.value })}
          placeholder="https://your-worker.your-subdomain.workers.dev"
        />
        <span className="settings-hint">{t('settings.proxyHint', language)}</span>
      </div>

      <div className="settings-field">
        <label className="settings-label">{t('settings.apiKey', language)}</label>
        <div className="settings-key-row">
          <input
            type={showKey ? 'text' : 'password'}
            className="settings-input"
            value={config.apiKey}
            onChange={(e) => onUpdate({ apiKey: e.target.value })}
            placeholder="sk-ant-..."
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        <span className="settings-hint">{t('settings.keyHint', language)}</span>
      </div>

      <div className="settings-field">
        <label className="settings-label">{t('settings.model', language)}</label>
        <select
          className="settings-select"
          value={config.model}
          onChange={(e) => onUpdate({ model: e.target.value })}
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {config.apiKey && config.proxyUrl && (
        <div className="settings-status settings-status-ok">
          ✓ {t('settings.configured', language)}
        </div>
      )}
    </div>
  );
}
