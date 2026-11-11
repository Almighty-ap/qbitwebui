import { Languages } from 'lucide-react'
import { useI18n } from '../i18n'

export function LanguageSwitcher() {
	const { lang, setLang } = useI18n()

	return (
		<button
			type="button"
			onClick={() => setLang(lang === 'zh-CN' ? 'en' : 'zh-CN')}
			className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-[var(--bg-primary)]"
			style={{
				backgroundColor: 'var(--bg-tertiary)',
				borderColor: 'var(--border)',
				color: 'var(--text-secondary)',
			}}
			title={lang === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
		>
			<Languages className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
			<span>{lang === 'zh-CN' ? '中文' : 'EN'}</span>
		</button>
	)
}

export function MobileLanguageSwitcher() {
	const { lang, setLang } = useI18n()

	return (
		<button
			type="button"
			onClick={() => setLang(lang === 'zh-CN' ? 'en' : 'zh-CN')}
			className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
			style={{ backgroundColor: 'var(--bg-secondary)' }}
			title={lang === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
		>
			<span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
				{lang === 'zh-CN' ? '中' : 'EN'}
			</span>
		</button>
	)
}
