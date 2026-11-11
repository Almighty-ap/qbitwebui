import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Drawer } from 'vaul'
import { Play, Pause, Trash2 } from 'lucide-react'
import * as api from '../api/qbittorrent'
import type { TorrentState } from '../types/qbittorrent'
import { formatSize, formatSpeed, formatDate, formatDuration, formatLimit } from '../utils/format'
import { PathInput } from '../components/ui/PathInput'
import { SpeedLimitFields } from '../components/ui/SpeedLimitFields'
import { getLimitChanges, limitToKiB, type SpeedLimitChanges, type SpeedLimitValues } from '../utils/speedLimits'
import { usePathHistory } from '../hooks/usePathHistory'
import { useI18n } from '../i18n'

type Tab = 'general' | 'files' | 'trackers' | 'peers' | 'http'
type PathEditorMode = 'savePath' | 'downloadPath' | null

const PAUSED_STATES: TorrentState[] = ['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP']

function getTrackerStatus(status: number, t: (key: string) => string): string {
	switch (status) {
		case 2:
			return t('details.trackerWorking')
		case 3:
			return t('details.trackerUpdating')
		case 4:
			return t('details.trackerError')
		default:
			return t('details.trackerDisabled')
	}
}

function getPriorityLabel(priority: number, t: (key: string) => string): string {
	switch (priority) {
		case 0:
			return t('details.skip')
		case 1:
			return t('details.normal')
		default:
			return t('details.high')
	}
}

interface Props {
	torrentHash: string
	instanceId: number
	onClose: () => void
}

export function MobileTorrentDetail({ torrentHash, instanceId, onClose }: Props) {
	const { t } = useI18n()
	const [tab, setTab] = useState<Tab>('general')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [pathEditorMode, setPathEditorMode] = useState<PathEditorMode>(null)
	const [pathValue, setPathValue] = useState('')
	const [limits, setLimits] = useState<SpeedLimitValues | null>(null)
	const [deleteFiles, setDeleteFiles] = useState(false)
	const queryClient = useQueryClient()
	const { addPath } = usePathHistory()

	useEffect(() => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur()
		}
		window.history.pushState({ drawer: 'open' }, '')
		const handlePopState = () => onClose()
		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [onClose])

	const { data: torrents } = useQuery({
		queryKey: ['torrents', instanceId],
		queryFn: () => api.getTorrents(instanceId),
		refetchInterval: 2000,
	})
	const torrent = torrents?.find((t) => t.hash === torrentHash)

	const { data: properties } = useQuery({
		queryKey: ['torrent-properties', instanceId, torrentHash],
		queryFn: () => api.getTorrentProperties(instanceId, torrentHash),
	})
	const { data: trackers } = useQuery({
		queryKey: ['torrent-trackers', instanceId, torrentHash],
		queryFn: () => api.getTorrentTrackers(instanceId, torrentHash),
	})
	const { data: peersData } = useQuery({
		queryKey: ['torrent-peers', instanceId, torrentHash],
		queryFn: () => api.getTorrentPeers(instanceId, torrentHash),
		refetchInterval: 3000,
	})
	const { data: files } = useQuery({
		queryKey: ['torrent-files', instanceId, torrentHash],
		queryFn: () => api.getTorrentFiles(instanceId, torrentHash),
	})
	const { data: webSeeds } = useQuery({
		queryKey: ['torrent-webseeds', instanceId, torrentHash],
		queryFn: () => api.getTorrentWebSeeds(instanceId, torrentHash),
	})

	const stopMutation = useMutation({
		mutationFn: () => api.stopTorrents(instanceId, [torrentHash]),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['torrents', instanceId] }),
	})
	const startMutation = useMutation({
		mutationFn: () => api.startTorrents(instanceId, [torrentHash]),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['torrents', instanceId] }),
	})
	const deleteMutation = useMutation({
		mutationFn: (deleteFiles: boolean) => api.deleteTorrents(instanceId, [torrentHash], deleteFiles),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['torrents', instanceId] }),
	})
	const setLocationMutation = useMutation({
		mutationFn: (location: string) => api.setTorrentLocation(instanceId, [torrentHash], location),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['torrents', instanceId] })
			queryClient.invalidateQueries({ queryKey: ['torrent-properties', instanceId, torrentHash] })
		},
	})
	const setDownloadPathMutation = useMutation({
		mutationFn: (downloadPath: string) => api.setTorrentDownloadPath(instanceId, [torrentHash], downloadPath),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['torrents', instanceId] })
			queryClient.invalidateQueries({ queryKey: ['torrent-properties', instanceId, torrentHash] })
		},
	})

	const speedLimitsMutation = useMutation({
		mutationFn: (changes: SpeedLimitChanges) => api.setTorrentSpeedLimits(instanceId, [torrentHash], changes),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['torrents', instanceId] })
			queryClient.invalidateQueries({ queryKey: ['torrent-properties', instanceId, torrentHash] })
		},
	})

	const isPaused = torrent ? PAUSED_STATES.includes(torrent.state) : false
	const peers = peersData?.peers ? Object.values(peersData.peers) : []

	function handleToggle() {
		if (isPaused) {
			startMutation.mutate()
		} else {
			stopMutation.mutate()
		}
	}

	function handleDelete() {
		deleteMutation.mutate(deleteFiles)
		onClose()
	}

	function openPathEditor(mode: Exclude<PathEditorMode, null>) {
		setPathValue((mode === 'downloadPath' ? torrent?.download_path : torrent?.save_path) ?? '')
		setPathEditorMode(mode)
	}

	function handlePathSave() {
		const trimmed = pathValue.trim()
		if (!trimmed) return

		if (pathEditorMode === 'savePath') {
			setLocationMutation.mutate(trimmed, {
				onSuccess: () => {
					addPath(trimmed)
					setPathEditorMode(null)
				},
			})
			return
		}

		if (pathEditorMode === 'downloadPath') {
			setDownloadPathMutation.mutate(trimmed, {
				onSuccess: () => {
					addPath(trimmed)
					setPathEditorMode(null)
				},
			})
		}
	}

	const initialLimits = {
		dl: limitToKiB(torrent?.dl_limit ?? 0),
		up: limitToKiB(torrent?.up_limit ?? 0),
	}

	function handleLimitsSave() {
		if (!limits) return
		const changes = getLimitChanges(initialLimits, limits)
		if (Object.keys(changes).length === 0) {
			setLimits(null)
			return
		}
		speedLimitsMutation.mutate(changes, { onSuccess: () => setLimits(null) })
	}

	const pathMutationPending = setLocationMutation.isPending || setDownloadPathMutation.isPending
	const pathEditorTitle = pathEditorMode === 'savePath' ? t('torrents.changeSavePath') : t('torrents.changeDownloadPath')

	const tabs: { id: Tab; label: string; count?: number }[] = [
		{ id: 'general', label: t('details.general') },
		{ id: 'files', label: t('details.files'), count: files?.length },
		{
			id: 'trackers',
			label: t('details.trackers'),
			count: trackers?.filter((t) => t.url.startsWith('http') || t.url.startsWith('udp')).length,
		},
		{ id: 'peers', label: t('details.peers'), count: peers.length },
		{ id: 'http', label: t('details.http'), count: webSeeds?.length },
	]

	if (!torrent) {
		return null
	}

	return (
		<>
			<Drawer.Root
				open={!showDeleteConfirm && !pathEditorMode && !limits}
				onOpenChange={(open) => !open && !showDeleteConfirm && !pathEditorMode && !limits && onClose()}
				shouldScaleBackground={false}
			>
				<Drawer.Portal>
					<Drawer.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
					<Drawer.Content
						className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t flex flex-col outline-none h-[90vh]"
						style={{
							backgroundColor: 'var(--bg-primary)',
							borderColor: 'var(--border)',
						}}
					>
						<div className="flex justify-center pt-3 pb-2">
							<div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />
						</div>

						<div className="px-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
							<Drawer.Title
								className="text-base font-semibold leading-snug line-clamp-2"
								style={{ color: 'var(--text-primary)' }}
							>
								{torrent.name}
							</Drawer.Title>
							<Drawer.Description className="sr-only">{t('details.torrentDetailsDesc')}</Drawer.Description>
							<div className="flex items-center gap-2 mt-2">
								<div
									className="h-1.5 flex-1 rounded-full overflow-hidden"
									style={{ backgroundColor: 'var(--bg-tertiary)' }}
								>
									<div
										className="h-full rounded-full"
										style={{
											width: `${Math.round(torrent.progress * 100)}%`,
											backgroundColor: 'var(--accent)',
										}}
									/>
								</div>
								<span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
									{Math.round(torrent.progress * 100)}%
								</span>
							</div>
						</div>

						<div className="flex gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
							<button
								onClick={handleToggle}
								disabled={stopMutation.isPending || startMutation.isPending}
								className="flex-1 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
								style={{
									backgroundColor: isPaused ? 'var(--accent)' : 'var(--bg-tertiary)',
									color: isPaused ? 'var(--accent-contrast)' : 'var(--text-primary)',
								}}
							>
								{isPaused ? (
									<>
										<Play className="w-5 h-5" strokeWidth={2} />
										{t('mobile.resume')}
									</>
								) : (
									<>
										<Pause className="w-5 h-5" strokeWidth={2} />
										{t('mobile.pause')}
									</>
								)}
							</button>
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="py-3 px-5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
								style={{ backgroundColor: 'color-mix(in srgb, var(--error) 15%, transparent)', color: 'var(--error)' }}
							>
								<Trash2 className="w-5 h-5" strokeWidth={2} />
								{t('common.delete')}
							</button>
						</div>

						<div className="mx-4 mt-3">
							<div className="flex p-1.5 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
								{tabs.map((t) => (
									<button
										key={t.id}
										onClick={() => setTab(t.id)}
										className="flex-1 px-1 py-2 rounded-lg text-xs font-medium transition-all text-center whitespace-nowrap"
										style={{
											backgroundColor: tab === t.id ? 'var(--accent)' : 'transparent',
											color: tab === t.id ? 'var(--accent-contrast)' : 'var(--text-muted)',
										}}
									>
										{t.label}
										{t.count ? ` (${t.count})` : ''}
									</button>
								))}
							</div>
						</div>

						<div
							className="flex-1 min-h-0 overflow-y-auto px-4 pt-3"
							style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
						>
							{tab === 'general' && (
								<div className="space-y-3">
									<InfoRow label={t('common.size')} value={formatSize(torrent.size)} />
									<InfoRow label={t('details.downloaded')} value={formatSize(torrent.downloaded)} />
									<InfoRow label={t('details.uploaded')} value={formatSize(torrent.uploaded)} />
									<InfoRow
										label={t('details.shareRatio')}
										value={
											torrent.downloaded === 0 && torrent.progress >= 1 && torrent.size > 0
												? '∞'
												: torrent.ratio.toFixed(2)
										}
									/>
									<div className="h-px my-2" style={{ backgroundColor: 'var(--border)' }} />
									<InfoRow label={t('details.dlSpeed')} value={formatSpeed(torrent.dlspeed)} accent />
									<InfoRow label={t('details.upSpeed')} value={formatSpeed(torrent.upspeed)} accent="#a6e3a1" />
									<InfoRow label={t('details.seeds')} value={`${torrent.num_seeds}`} />
									<InfoRow label={t('details.peersCount')} value={`${torrent.num_leechs}`} />
									<EditableRow
										label={t('torrents.speedLimits')}
										value={`↓ ${formatLimit(torrent.dl_limit)}  ↑ ${formatLimit(torrent.up_limit)}`}
										onEdit={() => setLimits(initialLimits)}
										editDisabled={speedLimitsMutation.isPending}
									/>
									<div className="h-px my-2" style={{ backgroundColor: 'var(--border)' }} />
									<InfoRow label={t('details.addedOn')} value={formatDate(torrent.added_on)} />
									<InfoRow label={t('details.completedOn')} value={formatDate(torrent.completion_on)} />
									<InfoRow label={t('details.seedTime')} value={formatDuration(torrent.seeding_time)} />
									<InfoRow label={t('columns.last_activity')} value={formatDate(torrent.last_activity)} />
									<div className="h-px my-2" style={{ backgroundColor: 'var(--border)' }} />
									<InfoRow label={t('torrents.category')} value={torrent.category || '-'} />
									<InfoRow label={t('torrents.tags')} value={torrent.tags || '-'} />
									<EditableRow
										label={t('details.savePath')}
										value={torrent.save_path}
										onEdit={() => openPathEditor('savePath')}
										editDisabled={pathMutationPending}
									/>
									{torrent.download_path && (torrent.download_path !== torrent.save_path || torrent.progress < 1) && (
											<EditableRow
												label={t('details.downloadPath')}
											value={torrent.download_path}
											onEdit={torrent.progress < 1 ? () => openPathEditor('downloadPath') : undefined}
											editDisabled={pathMutationPending}
										/>
									)}
									{properties?.comment && <InfoRow label={t('details.comment')} value={properties.comment} small />}
								</div>
							)}

							{tab === 'files' && (
								<div className="space-y-2">
									{files?.map((file, i) => (
										<div
											key={i}
											className="p-3 rounded-xl border"
											style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
										>
											<div className="text-xs break-all leading-relaxed" style={{ color: 'var(--text-primary)' }}>
												{file.name}
											</div>
											<div className="flex items-center gap-3 mt-2">
												<div
													className="flex-1 h-1 rounded-full overflow-hidden"
													style={{ backgroundColor: 'var(--bg-tertiary)' }}
												>
													<div
														className="h-full rounded-full"
														style={{ width: `${Math.round(file.progress * 100)}%`, backgroundColor: 'var(--accent)' }}
													/>
												</div>
												<span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
													{Math.round(file.progress * 100)}%
												</span>
											</div>
											<div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
												<span>{formatSize(file.size)}</span>
												<span>{t('details.priority')}: {getPriorityLabel(file.priority, t)}</span>
											</div>
										</div>
									))}
									{(!files || files.length === 0) && (
										<div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
											{t('details.noFiles')}
										</div>
									)}
								</div>
							)}

							{tab === 'trackers' && (
								<div className="space-y-2">
									{trackers
										?.filter((t) => t.url.startsWith('http') || t.url.startsWith('udp'))
										.map((tracker, i) => (
											<div
												key={i}
												className="p-3 rounded-xl border"
												style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
											>
												<div className="text-xs font-mono break-all" style={{ color: 'var(--text-primary)' }}>
													{tracker.url}
												</div>
												<div className="flex items-center gap-3 mt-2 text-xs">
													<span style={{ color: tracker.status === 2 ? '#a6e3a1' : 'var(--text-muted)' }}>
														{getTrackerStatus(tracker.status, t)}
													</span>
													<span style={{ color: 'var(--text-muted)' }}>{t('details.seedsColon', { count: tracker.num_seeds })}</span>
													<span style={{ color: 'var(--text-muted)' }}>{t('details.peersColon', { count: tracker.num_peers })}</span>
												</div>
											</div>
										))}
									{(!trackers ||
										trackers.filter((t) => t.url.startsWith('http') || t.url.startsWith('udp')).length === 0) && (
										<div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
											{t('details.noTrackers')}
										</div>
									)}
								</div>
							)}

							{tab === 'peers' && (
								<div className="space-y-2">
									{peers.map((peer, i) => (
										<div
											key={i}
											className="p-3 rounded-xl border"
											style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
										>
											<div className="flex items-center justify-between">
												<div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
													{peer.ip}:{peer.port}
												</div>
												<div className="text-xs" style={{ color: 'var(--text-muted)' }}>
													{peer.country_code || '??'}
												</div>
											</div>
											<div className="flex items-center gap-3 mt-2 text-xs">
												<span style={{ color: 'var(--accent)' }}>↓ {formatSpeed(peer.dl_speed)}</span>
												<span style={{ color: '#a6e3a1' }}>↑ {formatSpeed(peer.up_speed)}</span>
												<span style={{ color: 'var(--text-muted)' }}>{Math.round(peer.progress * 100)}%</span>
											</div>
											{peer.client && (
												<div className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
													{peer.client}
												</div>
											)}
										</div>
									))}
									{peers.length === 0 && (
										<div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
											{t('details.noPeers')}
										</div>
									)}
								</div>
							)}

							{tab === 'http' && (
								<div className="space-y-2">
									{webSeeds?.map((seed, i) => (
										<div
											key={i}
											className="p-3 rounded-xl border"
											style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
										>
											<div className="text-xs font-mono break-all" style={{ color: 'var(--text-primary)' }}>
												{seed.url}
											</div>
										</div>
									))}
									{(!webSeeds || webSeeds.length === 0) && (
										<div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
											{t('details.noHttpSources')}
										</div>
									)}
								</div>
							)}
						</div>
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>

			{pathEditorMode &&
				createPortal(
					<div
						className="fixed inset-0 z-[9999] flex items-center justify-center"
						style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
						onClick={() => !pathMutationPending && setPathEditorMode(null)}
					>
						<div
							className="mx-4 w-full max-w-lg rounded-2xl border p-5"
							style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
								{pathEditorTitle}
							</h3>
							<PathInput
								value={pathValue}
								onChange={setPathValue}
								onKeyDown={(e) => e.key === 'Enter' && handlePathSave()}
								onTouchEnd={(e) => {
									e.stopPropagation()
									;(e.target as HTMLInputElement).focus()
								}}
								autoFocus
								className="w-full px-4 py-3 rounded-xl border text-base"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
									fontSize: '16px',
								}}
							/>
							<div className="flex gap-3 mt-5">
								<button
									onClick={() => setPathEditorMode(null)}
									disabled={pathMutationPending}
									className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
									style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
								>
									{t('common.cancel')}
								</button>
								<button
									onClick={handlePathSave}
									disabled={!pathValue.trim() || pathMutationPending}
									className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
									style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
								>
									{pathMutationPending ? t('common.saving') : t('common.save')}
								</button>
							</div>
						</div>
					</div>,
					document.body
				)}

			{limits &&
				createPortal(
					<div
						className="fixed inset-0 z-[9999] flex items-center justify-center"
						style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
						onClick={() => !speedLimitsMutation.isPending && setLimits(null)}
					>
						<div
							className="mx-4 w-full max-w-lg rounded-2xl border p-5"
							style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
								{t('torrents.speedLimits')}
							</h3>
							<SpeedLimitFields
								value={limits}
								onChange={setLimits}
								onSubmit={handleLimitsSave}
								inputClassName="w-full px-4 py-3 rounded-xl border text-base"
								inputStyle={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
									fontSize: '16px',
								}}
								labelClassName="text-xs"
								touchFocus
							/>
							<div className="flex gap-3 mt-5">
								<button
									onClick={() => setLimits(null)}
									disabled={speedLimitsMutation.isPending}
									className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
									style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
								>
									{t('common.cancel')}
								</button>
								<button
									onClick={handleLimitsSave}
									disabled={speedLimitsMutation.isPending}
									className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
									style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
								>
									{speedLimitsMutation.isPending ? t('common.saving') : t('common.save')}
								</button>
							</div>
						</div>
					</div>,
					document.body
				)}

			{showDeleteConfirm &&
				createPortal(
					<div
						className="fixed inset-0 z-[9999] flex items-center justify-center"
						style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
						onClick={() => setShowDeleteConfirm(false)}
					>
						<div
							className="mx-4 w-full max-w-lg rounded-2xl border p-5"
							style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
								{t('torrents.deleteConfirmTitle')}
							</h3>
							<p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
								{t('torrents.deleteConfirmThis')}
							</p>
							<label className="flex items-center gap-3 mb-5 cursor-pointer">
								<input
									type="checkbox"
									checked={deleteFiles}
									onChange={(e) => setDeleteFiles(e.target.checked)}
									className="w-5 h-5 rounded"
								/>
								<span className="text-sm" style={{ color: 'var(--text-primary)' }}>
									{t('torrents.deleteFilesCheckbox')}
								</span>
							</label>
							<div className="flex gap-3">
								<button
									onClick={() => setShowDeleteConfirm(false)}
									className="flex-1 py-3 rounded-xl text-sm font-medium"
									style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
								>
									{t('common.cancel')}
								</button>
								<button
									onClick={handleDelete}
									className="flex-1 py-3 rounded-xl text-sm font-medium"
									style={{ backgroundColor: 'var(--error)', color: 'var(--accent-contrast)' }}
								>
									{t('common.delete')}
								</button>
							</div>
						</div>
					</div>,
					document.body
				)}
		</>
	)
}

function InfoRow({
	label,
	value,
	accent,
	small,
}: {
	label: string
	value: string
	accent?: string | boolean
	small?: boolean
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
				{label}
			</span>
			<span
				className={`text-xs text-right ${small ? 'max-w-[200px] truncate' : ''}`}
				style={{ color: accent ? (typeof accent === 'string' ? accent : 'var(--accent)') : 'var(--text-primary)' }}
			>
				{value}
			</span>
		</div>
	)
}

function EditableRow({
	label,
	value,
	onEdit,
	editDisabled,
}: {
	label: string
	value: string
	onEdit?: () => void
	editDisabled?: boolean
}) {
	const { t } = useI18n()
	return (
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0 flex-1">
				<div className="text-xs" style={{ color: 'var(--text-muted)' }}>
					{label}
				</div>
				<div className="text-xs break-all mt-0.5" style={{ color: 'var(--text-primary)' }}>
					{value}
				</div>
			</div>
			{onEdit && (
				<button
					onClick={onEdit}
					disabled={editDisabled}
					className="shrink-0 text-xs hover:opacity-80 disabled:opacity-50"
					style={{ color: 'var(--accent)' }}
				>
					{t('common.edit')}
				</button>
			)}
		</div>
	)
}
