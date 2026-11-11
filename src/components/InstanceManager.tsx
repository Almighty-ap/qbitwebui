import { useState, useEffect, useCallback } from 'react'
import {
	Search,
	FolderOpen,
	Trash2,
	Rss,
	FileText,
	ArrowLeftRight,
	AlertTriangle,
	ChevronLeft,
	ChevronRight,
	ArrowDown,
	ArrowUp,
	Server,
	Settings,
	Pencil,
	BarChart3,
	Globe,
} from 'lucide-react'
import {
	getInstances,
	createInstance,
	updateInstance,
	deleteInstance,
	type Instance,
	type CreateInstanceData,
} from '../api/instances'
import { logout, changePassword } from '../api/auth'
import { Header } from './Header'
import { SettingsPanel } from './SettingsPanel'
import { SearchPanel } from './SearchPanel'
import { FileBrowser } from './FileBrowser'
import { OrphanManager } from './OrphanManager'
import { RSSManager } from './RSSManager'
import { LogViewer } from './LogViewer'
import { CrossSeedManager } from './CrossSeedManager'
import { Statistics } from './Statistics'
import { NetworkTools } from './NetworkTools'
import { Checkbox } from './ui'
import { formatSpeed, formatSize } from '../utils/format'
import { useI18n, translateError } from '../i18n'

type Tab = 'dashboard' | 'tools'
type Tool = 'indexers' | 'files' | 'orphans' | 'rss' | 'logs' | 'cross-seed' | 'statistics' | 'network' | null

interface InstanceStats {
	id: number
	label: string
	online: boolean
	total: number
	downloading: number
	seeding: number
	paused: number
	error: number
	dlSpeed: number
	upSpeed: number
	allTimeDownload: number
	allTimeUpload: number
	freeSpaceOnDisk: number
}

function SpeedGraph({ history, color }: { history: number[]; color: string }) {
	const h = 32
	const w = 80
	const values = history.length >= 5 ? history.slice(-5) : [...Array(5 - history.length).fill(0), ...history]
	const max = Math.max(...values, 1)
	const points = values.map((v, i) => `${(i / 4) * w},${h - 2 - (v / max) * (h - 4)}`).join(' ')

	return (
		<svg width={w} height={h} className="opacity-60">
			<polyline
				points={points}
				fill="none"
				stroke={color}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

interface Props {
	username: string
	onSelectInstance: (instance: Instance) => void
	onLogout: () => void
	authDisabled?: boolean
	initialTab?: Tab
	initialTool?: Tool
	onTabChange: (tab: Tab) => void
	onToolChange: (tool: Tool) => void
}

export function InstanceManager({
	username,
	onSelectInstance,
	onLogout,
	authDisabled,
	initialTab = 'dashboard',
	initialTool = null,
	onTabChange,
	onToolChange,
}: Props) {
	const { t } = useI18n()
	const tab = initialTab
	const [instances, setInstances] = useState<Instance[]>([])
	const [stats, setStats] = useState<InstanceStats[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [editingId, setEditingId] = useState<number | null>(null)
	const [formData, setFormData] = useState<CreateInstanceData>({
		label: '',
		url: '',
		qbt_username: '',
		qbt_password: '',
		skip_auth: false,
		agent_enabled: false,
		agent_url: '',
	})
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [deleteConfirm, setDeleteConfirm] = useState<Instance | null>(null)
	const [testing, setTesting] = useState(false)
	const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
	const [agentTesting, setAgentTesting] = useState(false)
	const [showPasswordModal, setShowPasswordModal] = useState(false)
	const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
	const [passwordError, setPasswordError] = useState('')
	const [changingPassword, setChangingPassword] = useState(false)
	const [dlHistory, setDlHistory] = useState<number[]>([])
	const [upHistory, setUpHistory] = useState<number[]>([])
	const [settingsInstance, setSettingsInstance] = useState<Instance | null>(null)
	const [filesEnabled, setFilesEnabled] = useState(false)
	const [autoSelectSingle, setAutoSelectSingle] = useState(
		() => localStorage.getItem('autoSelectSingleInstance') === 'true'
	)
	const [showQuickSettings, setShowQuickSettings] = useState(
		() => localStorage.getItem('showQuickSettings') !== 'false'
	)

	useEffect(() => {
		fetch('/api/config')
			.then((r) => r.json())
			.then((c) => setFilesEnabled(c.filesEnabled))
			.catch(() => {})
	}, [])

	const loadInstances = useCallback(async () => {
		try {
			const data = await getInstances()
			setInstances(data)
		} catch {
			setError(t('errors.failedToLoadInstances'))
		} finally {
			setLoading(false)
		}
	}, [])

	const loadStats = useCallback(async () => {
		const res = await fetch('/api/instances/stats', { credentials: 'include' }).catch(() => null)
		if (res?.ok) {
			setStats(await res.json())
		}
	}, [])

	useEffect(() => {
		queueMicrotask(loadInstances)
	}, [loadInstances])

	useEffect(() => {
		if (instances.length > 0) {
			queueMicrotask(loadStats)
			const interval = setInterval(loadStats, 2000)
			return () => clearInterval(interval)
		}
	}, [instances.length, loadStats])

	useEffect(() => {
		if (stats.length === 0) return
		const totalDl = stats.reduce((a, s) => a + s.dlSpeed, 0)
		const totalUp = stats.reduce((a, s) => a + s.upSpeed, 0)
		queueMicrotask(() => {
			setDlHistory((prev) => [...prev.slice(-4), totalDl])
			setUpHistory((prev) => [...prev.slice(-4), totalUp])
		})
	}, [stats])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		setSubmitting(true)
		try {
			const submitData = { ...formData }
			if (editingId && !submitData.qbt_password) {
				delete (submitData as { qbt_password?: string }).qbt_password
			}
			if (editingId) {
				await updateInstance(editingId, submitData)
			} else {
				await createInstance(submitData)
			}
			setShowForm(false)
			setEditingId(null)
			setFormData({
				label: '',
				url: '',
				qbt_username: '',
				qbt_password: '',
				skip_auth: false,
				agent_enabled: false,
				agent_url: '',
			})
			setTestResult(null)
			await loadInstances()
		} catch (err) {
			setError(err instanceof Error ? err.message : t('common.failed'))
		} finally {
			setSubmitting(false)
		}
	}

	async function handleDelete() {
		if (!deleteConfirm) return
		try {
			await deleteInstance(deleteConfirm.id)
			setDeleteConfirm(null)
			await loadInstances()
		} catch {
			setError(t('errors.failedToDeleteInstance'))
		}
	}

	async function testConnection() {
		setTesting(true)
		setTestResult(null)
		try {
			let res: Response
			if (editingId && !formData.qbt_password && !formData.skip_auth) {
				res = await fetch(`/api/instances/${editingId}/test`, {
					method: 'POST',
					credentials: 'include',
				})
			} else {
				res = await fetch('/api/instances/test', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						url: formData.url,
						username: formData.qbt_username,
						password: formData.qbt_password,
						skip_auth: formData.skip_auth,
					}),
				})
			}
			const data = await res.json()
			if (res.ok) {
				setTestResult({ success: true, message: t('instances.connectedVersion', { version: data.version }) })
			} else {
				setTestResult({ success: false, message: translateError(data.error, t) || t('errors.connectionFailed') })
			}
		} catch (err) {
			setTestResult({
				success: false,
				message: err instanceof Error ? translateError(err.message, t) : t('errors.connectionFailed'),
			})
		} finally {
			setTesting(false)
		}
	}

	const [useCustomAgentUrl, setUseCustomAgentUrl] = useState(false)

	async function handleAgentToggle(enabled: boolean) {
		setFormData({ ...formData, agent_enabled: enabled, agent_url: enabled ? formData.agent_url : '' })
		setUseCustomAgentUrl(false)
		if (!enabled) return
		if (!formData.url) return setTestResult({ success: false, message: t('errors.enterQbitUrlFirst') })

		setAgentTesting(true)
		setTestResult(null)
		try {
			const res = await fetch('/api/instances/test-agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ url: formData.url }),
			})
			const data = await res.json()
			setTestResult(
				res.ok
					? { success: true, message: t('errors.agentReachable') }
					: { success: false, message: translateError(data.error, t) || t('errors.agentNotReachableCustom') }
			)
		} catch {
			setTestResult({ success: false, message: t('errors.failedToConnectAgent') })
		} finally {
			setAgentTesting(false)
		}
	}

	async function testAgentConnection() {
		const url = formData.agent_url || formData.url
		if (!url) return setTestResult({ success: false, message: t('errors.enterQbitUrlFirst') })

		setAgentTesting(true)
		setTestResult(null)
		try {
			const res = await fetch('/api/instances/test-agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ url: formData.url, agent_url: formData.agent_url || undefined }),
			})
			const data = await res.json()
			setTestResult(
				res.ok
					? { success: true, message: t('errors.agentReachable') }
					: { success: false, message: translateError(data.error, t) || t('errors.agentNotReachable') }
			)
		} catch {
			setTestResult({ success: false, message: t('errors.failedToConnectAgent') })
		} finally {
			setAgentTesting(false)
		}
	}

	function openEdit(instance: Instance) {
		setEditingId(instance.id)
		setFormData({
			label: instance.label,
			url: instance.url,
			qbt_username: instance.qbt_username || '',
			qbt_password: '',
			skip_auth: instance.skip_auth,
			agent_enabled: instance.agent_enabled,
			agent_url: instance.agent_url || '',
		})
		setUseCustomAgentUrl(!!instance.agent_url)
		setTestResult(null)
		setShowForm(true)
	}

	function closeForm() {
		setShowForm(false)
		setEditingId(null)
		setTestResult(null)
	}

	const testButtonLabel = testing
		? t('common.testing')
		: editingId && !formData.qbt_password && !formData.skip_auth
			? t('instances.testSaved')
			: t('instances.testConnection')

	async function handleLogout() {
		await logout()
		onLogout()
	}

	function toggleAutoSelect(value: boolean) {
		setAutoSelectSingle(value)
		localStorage.setItem('autoSelectSingleInstance', String(value))
	}

	function toggleQuickSettings() {
		const next = !showQuickSettings
		setShowQuickSettings(next)
		localStorage.setItem('showQuickSettings', String(next))
	}

	async function handlePasswordChange(e: React.FormEvent) {
		e.preventDefault()
		setPasswordError('')
		if (passwordData.new !== passwordData.confirm) {
			setPasswordError(t('errors.passwordsDoNotMatch'))
			return
		}
		if (passwordData.new.length < 8) {
			setPasswordError(t('errors.passwordLength'))
			return
		}
		setChangingPassword(true)
		try {
			await changePassword(passwordData.current, passwordData.new)
			setShowPasswordModal(false)
			setPasswordData({ current: '', new: '', confirm: '' })
		} catch (err) {
			setPasswordError(err instanceof Error ? translateError(err.message, t) : t('errors.failedToChangePassword'))
		} finally {
			setChangingPassword(false)
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
				<div className="text-sm" style={{ color: 'var(--text-muted)' }}>
					{t('common.loading')}
				</div>
			</div>
		)
	}

	const displayInstances = instances.filter((i) => i.id !== editingId && i.id !== settingsInstance?.id)
	const showingPanel = showForm || settingsInstance

	return (
		<div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
			<Header
				activeTab={tab}
				onTabChange={onTabChange}
				username={username}
				authDisabled={authDisabled}
				onLogout={handleLogout}
				onPasswordChange={() => setShowPasswordModal(true)}
			/>

			<main className="max-w-6xl mx-auto p-6">
				{tab === 'tools' ? (
					initialTool ? (
						<>
							<button
								onClick={() => onToolChange(null)}
								className="flex items-center gap-2 mb-6 text-sm hover:underline"
								style={{ color: 'var(--text-muted)' }}
							>
								<ChevronLeft className="w-4 h-4" strokeWidth={2} />
								{t('tools.backToTools')}
							</button>
							{initialTool === 'indexers' && <SearchPanel />}
							{initialTool === 'files' && <FileBrowser enabled={filesEnabled} />}
							{initialTool === 'orphans' && <OrphanManager instances={instances} />}
							{initialTool === 'rss' && <RSSManager instances={instances} />}
							{initialTool === 'logs' && <LogViewer instances={instances} />}
							{initialTool === 'cross-seed' && <CrossSeedManager instances={instances} />}
							{initialTool === 'statistics' && <Statistics />}
							{initialTool === 'network' && <NetworkTools instances={instances} />}
						</>
					) : (
						<>
							<h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
								{t('header.tools')}
							</h1>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<button
									onClick={() => onToolChange('indexers')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<Search className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										Prowlarr
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.searchIndexers')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('files')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<FolderOpen className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('files.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.browseDownloads')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('orphans')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<Trash2 className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('orphans.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.cleanUpTorrents')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('rss')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<Rss className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('rss.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.feedsAutoDownload')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('logs')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<FileText className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('logs.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.applicationLogs')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('cross-seed')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)] relative"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<span className="absolute top-3 right-3 cursor-help" title={t('common.experimentalFeature')}>
										<AlertTriangle className="w-6 h-6" style={{ color: 'var(--error)' }} />
									</span>
									<ArrowLeftRight className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('crossSeed.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.findMatches')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('statistics')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<BarChart3 className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('stats.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.transferHistory')}
									</div>
								</button>
								<button
									onClick={() => onToolChange('network')}
									className="p-6 rounded-xl border text-left transition-all hover:border-[var(--accent)]"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<Globe className="w-8 h-8 mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
									<div className="font-medium" style={{ color: 'var(--text-primary)' }}>
										{t('network.title')}
									</div>
									<div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
										{t('tools.networkDiagnostics')}
									</div>
								</button>
							</div>
						</>
					)
				) : (
					<>
						{stats.length > 0 && !showingPanel && (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								{[
									{ label: t('common.all'), value: stats.reduce((a, s) => a + s.total, 0), color: 'var(--text-primary)' },
									{ label: t('status.downloading'), value: stats.reduce((a, s) => a + s.downloading, 0), color: 'var(--accent)' },
									{ label: t('status.seeding'), value: stats.reduce((a, s) => a + s.seeding, 0), color: '#a6e3a1' },
									{ label: t('status.stopped'), value: stats.reduce((a, s) => a + s.paused, 0), color: 'var(--text-muted)' },
								].map((item) => (
									<div
										key={item.label}
										className="p-4 rounded-xl border"
										style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
									>
										<div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
											{item.label}
										</div>
										<div className="text-2xl font-semibold" style={{ color: item.color }}>
											{item.value}
										</div>
									</div>
								))}
							</div>
						)}

						{stats.length > 0 && !showingPanel && (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
								<div
									className="p-4 rounded-xl border flex items-center justify-between"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<div className="flex items-center gap-3">
										<ArrowDown className="w-5 h-5" style={{ color: 'var(--accent)' }} strokeWidth={2} />
										<div>
											<div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
												{t('common.download')}
											</div>
											<div className="text-lg font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
												{formatSpeed(stats.reduce((a, s) => a + s.dlSpeed, 0))}
											</div>
										</div>
									</div>
									<SpeedGraph history={dlHistory} color="var(--accent)" />
								</div>
								<div
									className="p-4 rounded-xl border flex items-center justify-between"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<div className="flex items-center gap-3">
										<ArrowUp className="w-5 h-5" style={{ color: '#a6e3a1' }} strokeWidth={2} />
										<div>
											<div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
												{t('common.upload')}
											</div>
											<div className="text-lg font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
												{formatSpeed(stats.reduce((a, s) => a + s.upSpeed, 0))}
											</div>
										</div>
									</div>
									<SpeedGraph history={upHistory} color="#a6e3a1" />
								</div>
								<div
									className="p-4 rounded-xl border"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
										{t('stats.allTimeDownloaded')}
									</div>
									<div className="text-lg font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
										{formatSize(stats.reduce((a, s) => a + s.allTimeDownload, 0))}
									</div>
								</div>
								<div
									className="p-4 rounded-xl border"
									style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
								>
									<div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
										{t('stats.allTimeUploaded')}
									</div>
									<div className="text-lg font-medium tabular-nums" style={{ color: '#a6e3a1' }}>
										{formatSize(stats.reduce((a, s) => a + s.allTimeUpload, 0))}
									</div>
								</div>
							</div>
						)}

						<div className="flex items-center justify-between mb-6">
							<h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
								{t('instances.title')}
							</h1>
							{!showingPanel && (
								<button
									onClick={() => {
										setShowForm(true)
										setEditingId(null)
										setFormData({
											label: '',
											url: '',
											qbt_username: '',
											qbt_password: '',
											skip_auth: false,
											agent_enabled: false,
											agent_url: '',
										})
									}}
									className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
									style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
								>
									{t('instances.add')}
								</button>
							)}
						</div>

						{error && (
							<div
								className="mb-6 px-4 py-3 rounded-lg text-sm"
								style={{ backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)', color: 'var(--error)' }}
							>
								{error}
							</div>
						)}

						{showForm && (
							<div
								className="mb-6 p-6 rounded-xl border"
								style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
							>
								<h2 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
									{editingId ? t('instances.edit') : t('instances.add')}
								</h2>
								<form onSubmit={handleSubmit} className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label
												className="block text-xs font-medium mb-2 uppercase tracking-wider"
												style={{ color: 'var(--text-muted)' }}
											>
												{t('instances.label')}
											</label>
											<input
												type="text"
												value={formData.label}
												onChange={(e) => setFormData({ ...formData, label: e.target.value })}
												className="w-full px-4 py-2.5 rounded-lg border text-sm"
												style={{
													backgroundColor: 'var(--bg-tertiary)',
													borderColor: 'var(--border)',
													color: 'var(--text-primary)',
												}}
												placeholder={t('instances.labelPlaceholder')}
												required
											/>
										</div>
										<div>
											<label
												className="block text-xs font-medium mb-2 uppercase tracking-wider"
												style={{ color: 'var(--text-muted)' }}
											>
												URL
											</label>
											<input
												type="url"
												value={formData.url}
												onChange={(e) => setFormData({ ...formData, url: e.target.value })}
												className="w-full px-4 py-2.5 rounded-lg border text-sm"
												style={{
													backgroundColor: 'var(--bg-tertiary)',
													borderColor: 'var(--border)',
													color: 'var(--text-primary)',
												}}
												placeholder="http://192.168.1.100:8080"
												required
											/>
										</div>
										<div>
											<label
												className="block text-xs font-medium mb-2 uppercase tracking-wider"
												style={{ color: 'var(--text-muted)' }}
											>
												{t('instances.qbtUsername')}
											</label>
											<input
												type="text"
												value={formData.qbt_username}
												onChange={(e) => setFormData({ ...formData, qbt_username: e.target.value })}
												className="w-full px-4 py-2.5 rounded-lg border text-sm"
												style={{
													backgroundColor: 'var(--bg-tertiary)',
													borderColor: 'var(--border)',
													color: 'var(--text-primary)',
													opacity: formData.skip_auth ? 0.5 : 1,
												}}
												placeholder="admin"
												required={!formData.skip_auth}
												disabled={formData.skip_auth}
											/>
										</div>
										<div>
											<label
												className="block text-xs font-medium mb-2 uppercase tracking-wider"
												style={{ color: 'var(--text-muted)' }}
											>
												{t('instances.qbtPassword')}
											</label>
											<input
												type="password"
												value={formData.qbt_password}
												onChange={(e) => setFormData({ ...formData, qbt_password: e.target.value })}
												className="w-full px-4 py-2.5 rounded-lg border text-sm"
												style={{
													backgroundColor: 'var(--bg-tertiary)',
													borderColor: 'var(--border)',
													color: 'var(--text-primary)',
													opacity: formData.skip_auth ? 0.5 : 1,
												}}
												placeholder={editingId ? '••••••••' : '••••••••'}
												title={editingId ? t('instances.qbtPasswordLeaveBlank') : undefined}
												required={!formData.skip_auth && !editingId}
												disabled={formData.skip_auth}
											/>
										</div>
									</div>

									<Checkbox
										checked={formData.skip_auth ?? false}
										onChange={(v) => setFormData({ ...formData, skip_auth: v })}
										label={t('instances.skipAuthDesc')}
									/>

									<Checkbox
										checked={formData.agent_enabled ?? false}
										onChange={handleAgentToggle}
										label={
											<>
												{t('instances.agentLabel')}{' '}
												<a
													href="https://mkbula.github.io/qbitwebui/guide/network-agent/"
													target="_blank"
													rel="noopener noreferrer"
													className="underline"
													style={{ color: 'var(--accent)' }}
													onClick={(e) => e.stopPropagation()}
												>
													{t('instances.howToSetUp')}
												</a>
											</>
										}
									/>

									{formData.agent_enabled && (
										<div className="ml-6 space-y-2">
											<Checkbox
												checked={useCustomAgentUrl}
												onChange={(v) => {
													setUseCustomAgentUrl(v)
													if (!v) setFormData({ ...formData, agent_url: '' })
												}}
												label={t('instances.useCustomAgentUrl')}
											/>
											{useCustomAgentUrl && (
												<div className="flex items-center gap-2 max-w-md">
													<input
														type="url"
														value={formData.agent_url || ''}
														onChange={(e) => setFormData({ ...formData, agent_url: e.target.value })}
														className="flex-1 min-w-0 px-2 py-1 rounded border text-xs"
														style={{
															backgroundColor: 'var(--bg-tertiary)',
															borderColor: 'var(--border)',
															color: 'var(--text-primary)',
														}}
														placeholder="https://agent.mydomain.com"
													/>
													<button
														type="button"
														onClick={testAgentConnection}
														disabled={agentTesting || !formData.agent_url}
														className="px-2 py-1 rounded text-xs border disabled:opacity-50 shrink-0"
														style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
													>
														{agentTesting ? '...' : t('common.test')}
													</button>
												</div>
											)}
										</div>
									)}

									{testResult && (
										<div
											className="px-4 py-3 rounded-lg text-sm"
											style={{
												backgroundColor: testResult.success
													? 'color-mix(in srgb, #a6e3a1 10%, transparent)'
													: 'color-mix(in srgb, var(--error) 10%, transparent)',
												color: testResult.success ? '#a6e3a1' : 'var(--error)',
											}}
										>
											{translateError(testResult.message, t)}
										</div>
									)}

									<div className="flex gap-3">
										<button
											type="submit"
											disabled={submitting}
											className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
											style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
										>
											{submitting ? t('common.loading') : editingId ? t('common.save') : t('common.add')}
										</button>
										<button
											type="button"
											onClick={testConnection}
											disabled={
												testing ||
												!formData.url ||
												(!formData.skip_auth && (!formData.qbt_username || (!editingId && !formData.qbt_password)))
											}
											className="px-4 py-2 rounded-lg text-sm border disabled:opacity-50"
											style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
										>
											{testButtonLabel}
										</button>
										<button
											type="button"
											onClick={closeForm}
											className="px-4 py-2 rounded-lg text-sm border"
											style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
										>
											{t('common.cancel')}
										</button>
									</div>
								</form>
							</div>
						)}

						{settingsInstance && (
							<SettingsPanel instance={settingsInstance} onClose={() => setSettingsInstance(null)} />
						)}

						{displayInstances.length === 0 && !showingPanel ? (
							<div
								className="text-center py-12 rounded-xl border"
								style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
							>
								<p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
									{t('instances.noInstances')}
								</p>
								<p className="text-xs" style={{ color: 'var(--text-muted)' }}>
									{t('instances.noInstancesDesc')}
								</p>
							</div>
						) : (
							displayInstances.length > 0 && (
								<>
									<div className="grid gap-4">
										{displayInstances.map((instance) => {
											const instanceStats = stats.find((s) => s.id === instance.id)
											return (
												<div
													key={instance.id}
													className="p-4 rounded-xl border group cursor-pointer transition-colors hover:border-[var(--accent)]"
													style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
													onClick={() => onSelectInstance(instance)}
												>
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-4">
															<div
																className="w-10 h-10 rounded-lg flex items-center justify-center relative"
																style={{ backgroundColor: 'var(--bg-tertiary)' }}
															>
																<Server className="w-5 h-5" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
																{instanceStats && (
																	<div
																		className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
																		style={{
																			backgroundColor: instanceStats.online ? '#a6e3a1' : 'var(--error)',
																			borderColor: 'var(--bg-secondary)',
																		}}
																	/>
																)}
															</div>
															<div>
																<span className="font-medium" style={{ color: 'var(--text-primary)' }}>
																	{instance.label}
																</span>
																<div className="text-sm" style={{ color: 'var(--text-muted)' }}>
																	{instance.url}
																</div>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<button
																onClick={(e) => {
																	e.stopPropagation()
																	setSettingsInstance(instance)
																}}
																className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
																style={{ color: 'var(--text-muted)' }}
																title={t('settings.title')}
															>
																<Settings className="w-4 h-4" strokeWidth={1.5} />
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation()
																	openEdit(instance)
																}}
																className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
																style={{ color: 'var(--text-muted)' }}
																title={t('common.edit')}
															>
																<Pencil className="w-4 h-4" strokeWidth={1.5} />
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation()
																	setDeleteConfirm(instance)
																}}
																className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
																style={{ color: 'var(--error)' }}
																title={t('common.delete')}
															>
																<Trash2 className="w-4 h-4" strokeWidth={1.5} />
															</button>
														</div>
													</div>
													{instanceStats?.online && (
														<div
															className="mt-3 pt-3 border-t grid grid-cols-3 items-center text-xs"
															style={{ borderColor: 'var(--border)' }}
														>
															<div className="flex items-center gap-4">
																<span style={{ color: 'var(--text-muted)' }}>
																	<span style={{ color: 'var(--text-secondary)' }}>{instanceStats.total}</span> {t('instances.torrentsCount')}
																</span>
																<span style={{ color: 'var(--text-muted)' }}>
																	<span style={{ color: 'var(--accent)' }}>{instanceStats.downloading}</span> {t('common.download')}
																</span>
																<span style={{ color: 'var(--text-muted)' }}>
																	<span style={{ color: '#a6e3a1' }}>{instanceStats.seeding}</span> {t('status.seeding')}
																</span>
															</div>
															<span className="text-center" style={{ color: 'var(--text-muted)' }}>
																{t('stats.freeDiskSpace')}: {formatSize(instanceStats.freeSpaceOnDisk)}
															</span>
															<div className="flex items-center gap-3 justify-end">
																<span style={{ color: 'var(--accent)' }}>↓ {formatSpeed(instanceStats.dlSpeed)}</span>
																<span style={{ color: '#a6e3a1' }}>↑ {formatSpeed(instanceStats.upSpeed)}</span>
															</div>
														</div>
													)}
												</div>
											)
										})}
									</div>
									{instances.length === 1 && !showingPanel && (
										<div className="mt-4">
											<button
												onClick={toggleQuickSettings}
												className="flex items-center gap-1 text-xs"
												style={{ color: 'var(--text-muted)' }}
											>
												<ChevronRight
													className="w-3 h-3 transition-transform"
													style={{ transform: showQuickSettings ? 'rotate(90deg)' : 'rotate(0deg)' }}
													strokeWidth={2}
												/>
												{t('instances.defaultBehaviour')}
											</button>
											{showQuickSettings && (
												<div className="mt-2 ml-4">
													<Checkbox
														checked={autoSelectSingle}
														onChange={toggleAutoSelect}
														label={t('instances.skipDashboard')}
													/>
												</div>
											)}
										</div>
									)}
								</>
							)
						)}
					</>
				)}
			</main>

			{deleteConfirm && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
				>
					<div
						className="w-full max-w-sm rounded-xl border p-6"
						style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
					>
						<h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
							{t('instances.delete')}
						</h3>
						<p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
							{t('instances.deleteConfirm', { label: deleteConfirm.label })}
						</p>
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setDeleteConfirm(null)}
								className="px-4 py-2 rounded-lg text-sm border"
								style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={handleDelete}
								className="px-4 py-2 rounded-lg text-sm font-medium"
								style={{ backgroundColor: 'var(--error)', color: 'var(--accent-contrast)' }}
							>
								{t('common.delete')}
							</button>
						</div>
					</div>
				</div>
			)}

			{showPasswordModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
				>
					<div
						className="w-full max-w-sm rounded-xl border p-6"
						style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
					>
						<h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
							{t('auth.changePassword')}
						</h3>
						<form onSubmit={handlePasswordChange} className="space-y-4">
							<div>
								<label
									className="block text-xs font-medium mb-2 uppercase tracking-wider"
									style={{ color: 'var(--text-muted)' }}
								>
									{t('auth.currentPassword')}
								</label>
								<input
									type="password"
									value={passwordData.current}
									onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
									className="w-full px-4 py-2.5 rounded-lg border text-sm"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
									required
								/>
							</div>
							<div>
								<label
									className="block text-xs font-medium mb-2 uppercase tracking-wider"
									style={{ color: 'var(--text-muted)' }}
								>
									{t('auth.newPassword')}
								</label>
								<input
									type="password"
									value={passwordData.new}
									onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
									className="w-full px-4 py-2.5 rounded-lg border text-sm"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
									required
								/>
							</div>
							<div>
								<label
									className="block text-xs font-medium mb-2 uppercase tracking-wider"
									style={{ color: 'var(--text-muted)' }}
								>
									{t('auth.confirmPassword')}
								</label>
								<input
									type="password"
									value={passwordData.confirm}
									onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
									className="w-full px-4 py-2.5 rounded-lg border text-sm"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
									required
								/>
							</div>
							{passwordError && (
								<div
									className="px-4 py-3 rounded-lg text-sm"
									style={{
										backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)',
										color: 'var(--error)',
									}}
								>
									{passwordError}
								</div>
							)}
							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => {
										setShowPasswordModal(false)
										setPasswordData({ current: '', new: '', confirm: '' })
										setPasswordError('')
									}}
									className="px-4 py-2 rounded-lg text-sm border"
									style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
								>
									{t('common.cancel')}
								</button>
								<button
									type="submit"
									disabled={changingPassword}
									className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
									style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
								>
									{changingPassword ? t('auth.changingPassword') : t('auth.changePassword')}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}
