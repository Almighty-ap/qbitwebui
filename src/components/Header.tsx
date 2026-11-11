import { useState } from 'react'
import { Check, Info, User, Lock, LogOut } from 'lucide-react'
import { ThemeSwitcher } from './ThemeSwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useUpdateCheck } from '../hooks/useUpdateCheck'
import { renderMarkdown } from '../utils/markdown'
import { useI18n } from '../i18n'

declare const __APP_VERSION__: string

type Tab = 'dashboard' | 'tools'

interface Props {
	activeTab?: Tab | null
	onTabChange?: (tab: Tab) => void
	username?: string
	authDisabled?: boolean
	onLogout?: () => void
	onPasswordChange?: () => void
}

export function Header({ activeTab, onTabChange, username, authDisabled, onLogout, onPasswordChange }: Props) {
	const { t } = useI18n()
	const [userMenuOpen, setUserMenuOpen] = useState(false)
	const {
		hasUpdate,
		latestVersion,
		releaseNotes,
		releaseUrl,
		isLoading: updateLoading,
		error: updateError,
	} = useUpdateCheck()

	return (
		<header className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3">
					<img src="/logo.svg" alt="qbitwebui" className="w-8 h-8" />
					<span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
						qbitwebui
					</span>
				</div>
				<div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
					{[
						{ id: 'dashboard' as Tab, label: t('header.dashboard') },
						{ id: 'tools' as Tab, label: t('header.tools') },
					].map((tTab) => (
						<button
							key={tTab.id}
							onClick={() => onTabChange?.(tTab.id)}
							className="px-3 py-1 rounded-md text-xs font-medium transition-all"
							style={{
								backgroundColor: activeTab === tTab.id ? 'var(--bg-primary)' : 'transparent',
								color: activeTab === tTab.id ? 'var(--text-primary)' : 'var(--text-muted)',
								boxShadow: activeTab === tTab.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
							}}
						>
							{tTab.label}
						</button>
					))}
				</div>
			</div>
			<div className="flex items-center gap-3">
				<LanguageSwitcher />
				<ThemeSwitcher />
				<div className="relative group">
					<div
						className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono"
						style={{
							backgroundColor: 'var(--bg-tertiary)',
							borderColor: 'var(--border)',
							color: 'var(--text-muted)',
						}}
						title={hasUpdate ? t('header.updateAvailable', { version: latestVersion ?? '' }) : t('header.upToDate')}
						tabIndex={0}
					>
						v{__APP_VERSION__}
						{hasUpdate ? (
							<Info className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} strokeWidth={2} />
						) : (
							<Check className="w-3.5 h-3.5" style={{ color: '#a6e3a1' }} strokeWidth={2.5} />
						)}
					</div>
					<div className="absolute right-0 top-full mt-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition">
						<div
							className="w-80 max-h-80 overflow-auto rounded-lg border shadow-xl p-3"
							style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
						>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
									{latestVersion ? t('header.releaseNotesVersion', { version: latestVersion }) : t('header.releaseNotes')}
								</span>
								{releaseUrl && (
									<a
										href={releaseUrl}
										target="_blank"
										rel="noreferrer"
										className="text-[10px] uppercase tracking-wide"
										style={{ color: 'var(--accent)' }}
									>
										{t('header.view')}
									</a>
								)}
							</div>
							{updateLoading ? (
								<p className="text-xs" style={{ color: 'var(--text-muted)' }}>
									{t('header.loadingNotes')}
								</p>
							) : updateError ? (
								<p className="text-xs" style={{ color: 'var(--error)' }}>
									{t('header.failedNotes')}
								</p>
							) : releaseNotes ? (
								<div className="space-y-2">{renderMarkdown(releaseNotes)}</div>
							) : (
								<p className="text-xs" style={{ color: 'var(--text-muted)' }}>
									{t('header.noNotes')}
								</p>
							)}
						</div>
					</div>
				</div>
				{!authDisabled && username && (
					<div className="relative">
						<button
							onClick={() => setUserMenuOpen(!userMenuOpen)}
							className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-tertiary)]"
							style={{ backgroundColor: 'var(--bg-secondary)' }}
						>
							<User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
						</button>
						{userMenuOpen && (
							<>
								<div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
								<div
									className="absolute right-0 top-full mt-2 z-20 min-w-[160px] rounded-lg border shadow-lg overflow-hidden"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
										<span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
											{username}
										</span>
									</div>
									{onPasswordChange && (
										<button
											onClick={() => {
												setUserMenuOpen(false)
												onPasswordChange()
											}}
											className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
											style={{ color: 'var(--text-primary)' }}
										>
											<Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
											{t('auth.changePassword')}
										</button>
									)}
									{onLogout && (
										<button
											onClick={() => {
												setUserMenuOpen(false)
												onLogout()
											}}
											className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
											style={{ color: 'var(--error)' }}
										>
											<LogOut className="w-4 h-4" strokeWidth={1.5} />
											{t('auth.logout')}
										</button>
									)}
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</header>
	)
}
