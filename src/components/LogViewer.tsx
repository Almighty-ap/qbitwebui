import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader2, Server, FileText } from 'lucide-react'
import { type Instance } from '../api/instances'
import { getLog, getPeerLog, type LogEntry, type PeerLogEntry } from '../api/qbittorrent'
import { Select } from './ui'
import { useI18n } from '../i18n'

const LOG_TYPES = {
	1: { label: 'Normal', color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)' },
	2: { label: 'Info', color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 12%, transparent)' },
	4: { label: 'Warning', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' },
	8: { label: 'Critical', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)' },
} as const

type LogTab = 'main' | 'peers'
type SortOrder = 'newest' | 'oldest'

interface Props {
	instances: Instance[]
}

export function LogViewer({ instances }: Props) {
	const { t } = useI18n()
	const [selectedInstance, setSelectedInstance] = useState<number>(instances[0]?.id ?? 0)
	const [tab, setTab] = useState<LogTab>('main')
	const [mainLogs, setMainLogs] = useState<LogEntry[]>([])
	const [peerLogs, setPeerLogs] = useState<PeerLogEntry[]>([])
	const [loading, setLoading] = useState(false)
	const [autoRefresh, setAutoRefresh] = useState(false)
	const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
	const [filters, setFilters] = useState({ normal: true, info: true, warning: true, critical: true })
	const lastMainIdRef = useRef(-1)
	const lastPeerIdRef = useRef(-1)
	const containerRef = useRef<HTMLDivElement>(null)

	const fetchLogs = useCallback(
		async (incremental = false) => {
			if (!selectedInstance) return
			setLoading(true)
			try {
				if (tab === 'main') {
					const lastId = incremental ? lastMainIdRef.current : -1
					const entries = await getLog(selectedInstance, { ...filters, lastKnownId: lastId })
					if (entries.length > 0) {
						lastMainIdRef.current = Math.max(...entries.map((e) => e.id))
						setMainLogs((prev) => (incremental ? [...prev, ...entries] : entries))
					} else if (!incremental) {
						setMainLogs([])
					}
				} else {
					const lastId = incremental ? lastPeerIdRef.current : -1
					const entries = await getPeerLog(selectedInstance, lastId === -1 ? undefined : lastId)
					if (entries.length > 0) {
						lastPeerIdRef.current = Math.max(...entries.map((e) => e.id))
						setPeerLogs((prev) => (incremental ? [...prev, ...entries] : entries))
					} else if (!incremental) {
						setPeerLogs([])
					}
				}
			} catch {
				if (!incremental) {
					if (tab === 'main') setMainLogs([])
					else setPeerLogs([])
				}
			} finally {
				setLoading(false)
			}
		},
		[selectedInstance, tab, filters]
	)

	useEffect(() => {
		if (tab === 'main') lastMainIdRef.current = -1
		else lastPeerIdRef.current = -1
		queueMicrotask(() => {
			if (tab === 'main') setMainLogs([])
			else setPeerLogs([])
			if (selectedInstance) fetchLogs()
		})
	}, [selectedInstance, tab, filters, fetchLogs])

	useEffect(() => {
		if (!autoRefresh || !selectedInstance) return
		const interval = setInterval(() => fetchLogs(true), 5000)
		return () => clearInterval(interval)
	}, [autoRefresh, selectedInstance, fetchLogs])

	useEffect(() => {
		if (autoRefresh && containerRef.current) {
			containerRef.current.scrollTop = sortOrder === 'newest' ? 0 : containerRef.current.scrollHeight
		}
	}, [mainLogs, peerLogs, autoRefresh, sortOrder])

	const sortedMainLogs = useMemo(() => {
		return sortOrder === 'newest' ? [...mainLogs].reverse() : mainLogs
	}, [mainLogs, sortOrder])

	const sortedPeerLogs = useMemo(() => {
		return sortOrder === 'newest' ? [...peerLogs].reverse() : peerLogs
	}, [peerLogs, sortOrder])

	const logCount = tab === 'main' ? sortedMainLogs.length : sortedPeerLogs.length

	const instanceOptions = useMemo(() => instances.map((i) => ({ value: i.id, label: i.label })), [instances])

	const sortOptions: { value: SortOrder; label: string }[] = [
		{ value: 'newest', label: t('logs.newestFirst') },
		{ value: 'oldest', label: t('logs.oldestFirst') },
	]

	function formatTime(ts: number) {
		return new Date(ts * 1000).toLocaleString()
	}

	function toggleFilter(key: keyof typeof filters) {
		setFilters((f) => ({ ...f, [key]: !f[key] }))
	}

	const activeFilterCount = Object.values(filters).filter(Boolean).length

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
						{t('logs.viewer')}
					</h1>
					<p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
						{t('logs.viewerDesc')}
					</p>
				</div>
				<button
					onClick={() => fetchLogs()}
					disabled={loading || !selectedInstance}
					className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
					style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
				>
					{loading ? (
						<span className="flex items-center gap-2">
							<Loader2 className="w-4 h-4 animate-spin" />
							{t('common.loading')}
						</span>
					) : (
						t('common.refresh')
					)}
				</button>
			</div>

			<div
				className="rounded-xl border p-4 mb-4 space-y-4"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-2">
						<label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
							{t('common.instance')}
						</label>
						<Select
							value={selectedInstance}
							options={instanceOptions}
							onChange={setSelectedInstance}
							minWidth="160px"
						/>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
							{t('logs.sort')}
						</label>
						<Select value={sortOrder} options={sortOptions} onChange={setSortOrder} minWidth="130px" />
					</div>

					<div
						className="flex items-center gap-1 p-1 rounded-lg ml-auto"
						style={{ backgroundColor: 'var(--bg-tertiary)' }}
					>
						{(['main', 'peers'] as const).map((tabKey) => (
							<button
								key={tabKey}
								onClick={() => setTab(tabKey)}
								className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
								style={{
									backgroundColor: tab === tabKey ? 'var(--bg-secondary)' : 'transparent',
									color: tab === tabKey ? 'var(--text-primary)' : 'var(--text-muted)',
									boxShadow: tab === tabKey ? '0 1px 2px rgba(0,0,0,0.15), 0 0 0 1px var(--border)' : 'none',
								}}
							>
								{tabKey === 'main' ? t('logs.application') : t('logs.peers')}
							</button>
						))}
					</div>
				</div>

				<div
					className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t"
					style={{ borderColor: 'var(--border)' }}
				>
					{tab === 'main' && (
						<div className="flex items-center gap-2">
							<span
								className="text-xs font-medium uppercase tracking-wider mr-1"
								style={{ color: 'var(--text-muted)' }}
							>
								{t('logs.types')}
							</span>
							{Object.entries(LOG_TYPES).map(([type, { label, color, bg }]) => {
								const key = label.toLowerCase() as keyof typeof filters
								const active = filters[key]
								return (
									<button
										key={type}
										onClick={() => toggleFilter(key)}
										className="px-2.5 py-1 rounded-md text-xs font-medium transition-all border"
										style={{
											backgroundColor: active ? bg : 'transparent',
											borderColor: active ? color : 'var(--border)',
											color: active ? color : 'var(--text-muted)',
											opacity: active ? 1 : 0.6,
										}}
									>
										{t(`logs.${label.toLowerCase()}`)}
									</button>
								)
							})}
							{activeFilterCount < 4 && (
								<button
									onClick={() => setFilters({ normal: true, info: true, warning: true, critical: true })}
									className="text-xs underline ml-1"
									style={{ color: 'var(--text-muted)' }}
								>
									{t('common.reset')}
								</button>
							)}
						</div>
					)}

					<label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('logs.autoRefresh')}
						</span>
						<div
							className="w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer"
							style={{ backgroundColor: autoRefresh ? 'var(--accent)' : 'var(--bg-tertiary)' }}
							onClick={() => setAutoRefresh(!autoRefresh)}
						>
							<div
								className="w-4 h-4 rounded-full shadow transition-transform"
								style={{
									backgroundColor: 'white',
									transform: autoRefresh ? 'translateX(16px)' : 'translateX(0)',
								}}
							/>
						</div>
					</label>
				</div>
			</div>

			{!selectedInstance ? (
				<div
					className="text-center py-16 rounded-xl border"
					style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
				>
					<Server className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} strokeWidth={1} />
					<p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
						{t('common.noInstancesConfigured')}
					</p>
					<p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
						{t('logs.addInstanceHint')}
					</p>
				</div>
			) : logCount === 0 && !loading ? (
				<div
					className="text-center py-16 rounded-xl border"
					style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
				>
					<FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} strokeWidth={1} />
					<p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
						{t('logs.noEntries')}
					</p>
					<p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
						{tab === 'main' && activeFilterCount < 4 ? t('logs.tryAdjustFilters') : t('logs.willAppear')}
					</p>
				</div>
			) : (
				<div
					ref={containerRef}
					className="rounded-xl border overflow-hidden"
					style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', maxHeight: '60vh' }}
				>
					<div className="overflow-auto" style={{ maxHeight: '60vh' }}>
						<table className="w-full text-xs">
							<thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
								<tr>
									<th
										className="text-left px-4 py-2.5 font-medium whitespace-nowrap"
										style={{ color: 'var(--text-muted)', width: '150px' }}
									>
										{t('logs.timestamp')}
									</th>
									{tab === 'main' ? (
										<th
											className="text-left px-4 py-2.5 font-medium"
											style={{ color: 'var(--text-muted)', width: '90px' }}
										>
											{t('logs.level')}
										</th>
									) : (
										<th
											className="text-left px-4 py-2.5 font-medium"
											style={{ color: 'var(--text-muted)', width: '90px' }}
										>
											{t('common.status')}
										</th>
									)}
									<th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>
										{tab === 'main' ? t('logs.message') : t('logs.ipAddress')}
									</th>
									{tab === 'peers' && (
										<th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-muted)' }}>
											{t('logs.reason')}
										</th>
									)}
								</tr>
							</thead>
							<tbody className="font-mono">
								{tab === 'main'
									? sortedMainLogs.map((entry) => {
											const typeInfo = LOG_TYPES[entry.type as keyof typeof LOG_TYPES] || LOG_TYPES[1]
											return (
												<tr
													key={entry.id}
													className="border-t transition-colors hover:bg-[var(--bg-tertiary)]"
													style={{ borderColor: 'color-mix(in srgb, var(--border) 50%, transparent)' }}
												>
													<td
														className="px-4 py-2 whitespace-nowrap tabular-nums"
														style={{ color: 'var(--text-muted)' }}
													>
														{formatTime(entry.timestamp)}
													</td>
													<td className="px-4 py-2">
														<span
															className="inline-block px-2 py-0.5 rounded text-xs font-medium"
															style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
														>
															{t(`logs.${typeInfo.label.toLowerCase()}`)}
														</span>
													</td>
													<td className="px-4 py-2 break-all" style={{ color: 'var(--text-primary)' }}>
														{entry.message}
													</td>
												</tr>
											)
										})
									: sortedPeerLogs.map((entry) => (
											<tr
												key={entry.id}
												className="border-t transition-colors hover:bg-[var(--bg-tertiary)]"
												style={{ borderColor: 'color-mix(in srgb, var(--border) 50%, transparent)' }}
											>
												<td className="px-4 py-2 whitespace-nowrap tabular-nums" style={{ color: 'var(--text-muted)' }}>
													{formatTime(entry.timestamp)}
												</td>
												<td className="px-4 py-2">
													<span
														className="inline-block px-2 py-0.5 rounded text-xs font-medium"
														style={{
															backgroundColor: entry.blocked
																? 'color-mix(in srgb, var(--error) 12%, transparent)'
																: 'color-mix(in srgb, var(--accent) 12%, transparent)',
															color: entry.blocked ? 'var(--error)' : 'var(--accent)',
														}}
													>
														{entry.blocked ? t('logs.blocked') : t('logs.connected')}
													</span>
												</td>
												<td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>
													{entry.ip}
												</td>
												<td className="px-4 py-2 break-all" style={{ color: 'var(--text-muted)' }}>
													{entry.reason || '—'}
												</td>
											</tr>
										))}
							</tbody>
						</table>
					</div>
					<div
						className="px-4 py-2 text-xs border-t flex items-center justify-between"
						style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
					>
						<span>{t('logs.entries', { count: logCount })}</span>
						{autoRefresh && (
							<span className="flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
								{t('logs.live')}
							</span>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
