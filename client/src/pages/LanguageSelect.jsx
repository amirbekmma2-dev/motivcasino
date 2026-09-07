import React from 'react';
import { LANGS } from '../i18n';
import { useLang } from '../providers/LangProvider';

export default function LanguageSelect({ onBack, onSelect }) {
  const { t } = useLang();

  return (
    <div className="min-h-screen px-4 flex flex-col justify-center">
      {onBack && (
        <div className="pt-6 mb-4">
          <button onClick={onBack} className="text-tg-muted text-xl">←</button>
        </div>
      )}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black bg-gradient-to-r from-tg-gold to-orange-400 bg-clip-text text-transparent">
          🎰 motivCasino
        </h1>
        <p className="text-tg-muted mt-2">{t('language')}</p>
      </div>

      <div className="space-y-3">
        {LANGS.map((l) => (
<button
            key={l.code}
            onClick={() => onSelect && onSelect(l.code)}
            className="card w-full flex items-center gap-4 py-4 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <span className="text-3xl">{l.flag}</span>
            <span className="font-bold text-xl">{l.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}