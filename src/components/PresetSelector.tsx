import { useState, useCallback } from 'react';
import type { Language, StylePreset, StyleProfile } from '@/types';
import { t } from '@/i18n';
import { loadPresets, savePreset, deletePreset } from '@/utils/presetStorage';
import { BUILTIN_PRESETS } from '@/data/builtinPresets';

interface PresetSelectorProps {
  language: Language;
  /** Current merged profile (needed for "save" action) */
  currentProfile: StyleProfile | null;
  /** Names of currently uploaded PDFs */
  currentFiles: string[];
  /** Called when user loads a preset */
  onLoadPreset: (preset: StylePreset) => void;
}

export function PresetSelector({
  language,
  currentProfile,
  currentFiles,
  onLoadPreset,
}: PresetSelectorProps) {
  const [userPresets, setUserPresets] = useState<StylePreset[]>(loadPresets);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');

  const refreshPresets = useCallback(() => {
    setUserPresets(loadPresets());
  }, []);

  const handleSave = useCallback(() => {
    if (!currentProfile || !saveName.trim()) return;
    savePreset(saveName.trim(), currentProfile, currentFiles);
    setSaveName('');
    setShowSaveInput(false);
    refreshPresets();
  }, [currentProfile, saveName, currentFiles, refreshPresets]);

  const handleDelete = useCallback(
    (id: string) => {
      deletePreset(id);
      refreshPresets();
    },
    [refreshPresets],
  );

  const handleLoadUserPreset = useCallback(
    (preset: StylePreset) => {
      onLoadPreset(preset);
    },
    [onLoadPreset],
  );

  const handleLoadBuiltin = useCallback(
    (builtin: (typeof BUILTIN_PRESETS)[number]) => {
      // Convert BuiltinPreset to StylePreset format
      const preset: StylePreset = {
        id: builtin.id,
        name: builtin.label,
        profile: builtin.profile,
        sourceFiles: builtin.sourceFiles,
        createdAt: '',
      };
      onLoadPreset(preset);
    },
    [onLoadPreset],
  );

  const hasBuiltins = BUILTIN_PRESETS.length > 0;

  return (
    <div className="preset-selector">
      <div className="preset-header">
        <span className="preset-title">{t('preset.title', language)}</span>
        {currentProfile && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSaveInput(!showSaveInput)}
          >
            {t('preset.save', language)}
          </button>
        )}
      </div>

      {/* Built-in presets */}
      {hasBuiltins && (
        <div className="preset-builtin-section">
          <p className="preset-section-label">{t('preset.builtinLabel', language)}</p>
          <div className="preset-builtin-grid">
            {BUILTIN_PRESETS.map((bp) => (
              <button
                key={bp.id}
                className="preset-builtin-btn"
                onClick={() => handleLoadBuiltin(bp)}
                title={`${bp.paperCount} papers · ${bp.profile.totalWords.toLocaleString()} words`}
              >
                <span className="preset-builtin-label">{bp.label}</span>
                <span className="preset-builtin-meta">
                  {bp.paperCount} {t('preset.papers', language)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save input */}
      {showSaveInput && (
        <div className="preset-save-row">
          <input
            className="settings-input preset-name-input"
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={t('preset.namePlaceholder', language)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!saveName.trim()}
          >
            {t('preset.confirm', language)}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setShowSaveInput(false);
              setSaveName('');
            }}
          >
            {t('preset.cancel', language)}
          </button>
        </div>
      )}

      {/* User-saved presets */}
      {userPresets.length > 0 && (
        <>
          {hasBuiltins && (
            <p className="preset-section-label">{t('preset.customLabel', language)}</p>
          )}
          <ul className="preset-list">
            {userPresets.map((preset) => (
              <li key={preset.id} className="preset-item">
                <button
                  className="preset-load-btn"
                  onClick={() => handleLoadUserPreset(preset)}
                  title={`${preset.sourceFiles.length} ${t('preset.files', language)} · ${new Date(preset.createdAt).toLocaleDateString()}`}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-meta">
                    {preset.profile.documentCount} {t('preset.docs', language)} · {preset.profile.totalWords.toLocaleString()} {t('preset.words', language)}
                  </span>
                </button>
                <button
                  className="profile-file-remove"
                  onClick={() => handleDelete(preset.id)}
                  title={t('preset.delete', language)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!hasBuiltins && userPresets.length === 0 && !showSaveInput && (
        <p className="preset-empty">{t('preset.empty', language)}</p>
      )}
    </div>
  );
}
