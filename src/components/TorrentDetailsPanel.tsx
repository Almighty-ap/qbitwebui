import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
	Settings,
	ArrowRightLeft,
	Users,
	Link,
	Folder,
	Plus,
	X,
	ChevronRight,
	ChevronUp,
	MousePointer,
	FileText,
} from 'lucide-react'
import type { TorrentFile } from '../types/torrentDetails'
import {
	useTorrentProperties,
	useTorrentTrackers,
	useTorrentPeers,
	useTorrentFiles,
	useTorrentWebSeeds,
	useSetFilePriority,
	useAddTrackers,
	useRemoveTrackers,
} from '../hooks/useTorrentDetails'
import { useSetTorrentDownloadPath, useSetTorrentLocation, useSetTorrentSpeedLimits } from '../hooks/useTorrents'
import { usePathHistory } from '../hooks/usePathHistory'
import { PathInput } from './ui/PathInput'
import { SpeedLimitFields } from './ui/SpeedLimitFields'
import { getLimitChanges, limitToKiB, type SpeedLimitValues } from '../utils/speedLimits'
import { formatSize, formatSpeed, formatDate, formatDuration, formatEta, formatLimit } from '../utils/format'
import type { Tracker, Peer } from '../types/torrentDetails'
import { buildFileTree, flattenVisibleNodes, getInitialExpanded } from '../utils/fileTree'
import { useI18n } from '../i18n'

interface Props {
	hash: string | null
	name: string
	category: string
	tags: string
	expanded: boolean
	onToggle: () => void
	height: number
	onHeightChange: (h: number) => void
}

type Tab = 'general' | 'trackers' | 'peers' | 'http' | 'content'

const TABS: { id: Tab; key: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
	{ id: 'general', key: 'details.general', Icon: Settings },
	{ id: 'trackers', key: 'details.trackers', Icon: ArrowRightLeft },
	{ id: 'peers', key: 'details.peers', Icon: Users },
	{ id: 'http', key: 'details.http', Icon: Link },
	{ id: 'content', key: 'details.files', Icon: Folder },
]

const MIN_HEIGHT = 120
const MAX_HEIGHT_PERCENT = 0.55
const COLLAPSED_HEIGHT = 36

const TRACKER_STATUS_KEYS: Record<number, { key: string; colorVar: string }> = {
	0: { key: 'details.trackerDisabled', colorVar: 'var(--text-muted)' },
	1: { key: 'details.trackerNotContacted', colorVar: 'var(--text-muted)' },
	2: { key: 'details.trackerWorking', colorVar: 'var(--accent)' },
	3: { key: 'details.trackerUpdating', colorVar: 'var(--warning)' },
	4: { key: 'details.trackerError', colorVar: 'var(--error)' },
}

function StatusBadge({ status }: { status: number }) {
	const { t } = useI18n()
	const meta = TRACKER_STATUS_KEYS[status] ?? { key: 'status.unknown', colorVar: 'var(--text-muted)' }
	const label = t(meta.key)
	const colorVar = meta.colorVar
	return (
		<span
			className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
			style={{ color: colorVar, backgroundColor: `color-mix(in srgb, ${colorVar} 10%, transparent)` }}
		>
			<span className="w-1 h-1 rounded-full" style={{ backgroundColor: colorVar }} />
			{label}
		</span>
	)
}

function LoadingSkeleton() {
	return (
		<div className="p-4 space-y-3 animate-pulse">
			<div className="grid grid-cols-4 gap-3">
				{[...Array(8)].map((_, i) => (
					<div
						key={i}
						className="h-10 rounded"
						style={{ backgroundColor: 'color-mix(in srgb, white 3%, transparent)' }}
					/>
				))}
			</div>
		</div>
	)
}

function EmptyState({ message }: { message: string }) {
	return (
		<div
			className="flex items-center justify-center h-full text-xs tracking-wide uppercase"
			style={{ color: 'var(--text-muted)' }}
		>
			{message}
		</div>
	)
}

const cellBase = { backgroundColor: 'color-mix(in srgb, white 2.5%, transparent)', borderColor: 'var(--border)' }

function InfoCell({
	label,
	value,
	accent,
	muted,
	span,
	wide,
	onEdit,
}: {
	label: string
	value: string
	accent?: boolean
	muted?: boolean
	span?: number
	wide?: boolean
	onEdit?: () => void
}) {
	const { t } = useI18n()
	const color = muted ? 'var(--text-muted)' : accent ? 'var(--accent)' : 'var(--text-primary)'
	return (
		<div
			className={`px-3 py-2 rounded border ${wide ? '' : 'min-w-0 overflow-hidden'}`}
			style={{ ...cellBase, gridColumn: span ? `span ${span}` : undefined }}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="text-[9px] uppercase tracking-widest truncate" style={{ color: 'var(--text-muted)' }}>
					{label}
				</div>
				{onEdit && (
					<button
						onClick={onEdit}
						className="shrink-0 text-[9px] uppercase tracking-widest font-medium hover:opacity-80"
						style={{ color: 'var(--accent)' }}
					>
						{t('common.edit')}
					</button>
				)}
			</div>
			<div
				className={`text-xs font-mono mt-0.5 ${wide ? 'break-all' : 'truncate'}`}
				style={{ color }}
				title={wide ? undefined : value}
			>
				{value}
			</div>
		</div>
	)
}

function GeneralTab({ hash, category, tags }: { hash: string; category: string; tags: string }) {
	const { t } = useI18n()
	const [editorMode, setEditorMode] = useState<'savePath' | 'downloadPath' | null>(null)
	const [inputValue, setInputValue] = useState('')
	const [limits, setLimits] = useState<SpeedLimitValues | null>(null)
	const { data: p, isLoading } = useTorrentProperties(hash)
	const setLocationMutation = useSetTorrentLocation()
	const setDownloadPathMutation = useSetTorrentDownloadPath()
	const speedLimitsMutation = useSetTorrentSpeedLimits()
	const { addPath } = usePathHistory()
	if (isLoading) return <LoadingSkeleton />
	if (!p) return <EmptyState message={t('common.error')} />
	const properties = p

	const ratio =
		properties.total_downloaded === 0 && properties.pieces_have === properties.pieces_num && properties.total_size > 0
			? '∞'
			: properties.share_ratio.toFixed(2)

	const timeActive =
		properties.seeding_time > 0
			? `${formatDuration(properties.time_elapsed)} (${formatDuration(properties.seeding_time)})`
			: formatDuration(properties.time_elapsed)
	const pathMutationPending = setLocationMutation.isPending || setDownloadPathMutation.isPending

	function openEditor(mode: 'savePath' | 'downloadPath') {
		setInputValue(mode === 'downloadPath' ? properties.download_path : properties.save_path)
		setEditorMode(mode)
	}

	const initialLimits = { dl: limitToKiB(properties.dl_limit), up: limitToKiB(properties.up_limit) }

	function handleLimitsSave() {
		if (!limits) return
		const changes = getLimitChanges(initialLimits, limits)
		if (Object.keys(changes).length > 0) speedLimitsMutation.mutate({ hashes: [hash], limits: changes })
		setLimits(null)
	}

	function handlePathSave() {
		const trimmed = inputValue.trim()
		if (!trimmed) return

		if (editorMode === 'savePath') {
			setLocationMutation.mutate({ hashes: [hash], location: trimmed }, { onSuccess: () => addPath(trimmed) })
			setEditorMode(null)
			return
		}

		if (editorMode === 'downloadPath') {
			setDownloadPathMutation.mutate({ hashes: [hash], downloadPath: trimmed }, { onSuccess: () => addPath(trimmed) })
			setEditorMode(null)
		}
	}

	return (
		<div className="p-3 overflow-auto h-full space-y-3">
			<fieldset className="border rounded p-2" style={{ borderColor: 'var(--border)' }}>
				<legend
					className="px-2 text-[9px] uppercase tracking-widest font-medium"
					style={{ color: 'var(--text-muted)' }}
				>
					{t('details.transfer')}
				</legend>
				<div className="grid grid-cols-12 gap-1.5">
					<InfoCell label={t('details.timeActive')} value={timeActive} span={2} />
					<InfoCell label={t('columns.eta')} value={formatEta(properties.eta)} span={2} />
					<InfoCell
						label={t('details.connections')}
						value={`${properties.nb_connections} / ${properties.nb_connections_limit}`}
						span={2}
					/>
					<InfoCell label={t('details.seeds')} value={`${properties.seeds} / ${properties.seeds_total}`} span={2} />
					<InfoCell label={t('details.peersCount')} value={`${properties.peers} / ${properties.peers_total}`} span={2} />
					<InfoCell label={t('details.wasted')} value={formatSize(properties.total_wasted)} span={2} />
					<InfoCell
						label={t('details.downloaded')}
						value={`${formatSize(properties.total_downloaded)} (${formatSize(properties.total_downloaded_session)} ${t('details.session')})`}
						span={2}
					/>
					<InfoCell
						label={t('details.uploaded')}
						value={`${formatSize(properties.total_uploaded)} (${formatSize(properties.total_uploaded_session)} ${t('details.session')})`}
						span={2}
					/>
					<InfoCell
						label={t('details.dlSpeed')}
						value={`${formatSpeed(properties.dl_speed)} (${formatSpeed(properties.dl_speed_avg)} ${t('details.avg')})`}
						span={2}
					/>
					<InfoCell
						label={t('details.upSpeed')}
						value={`${formatSpeed(properties.up_speed)} (${formatSpeed(properties.up_speed_avg)} ${t('details.avg')})`}
						span={2}
					/>
					<InfoCell
						label={t('details.dlLimit')}
						value={formatLimit(properties.dl_limit)}
						span={2}
						onEdit={() => setLimits(initialLimits)}
					/>
					<InfoCell
						label={t('details.upLimit')}
						value={formatLimit(properties.up_limit)}
						span={2}
						onEdit={() => setLimits(initialLimits)}
					/>
					<InfoCell label={t('details.shareRatio')} value={ratio} span={3} />
					<InfoCell
						label={t('details.reannounce')}
						value={properties.reannounce > 0 ? formatDuration(properties.reannounce) : '0'}
						span={3}
					/>
					<InfoCell
						label={t('details.lastSeenComplete')}
						value={properties.last_seen > 0 ? formatDate(properties.last_seen) : t('common.never')}
						span={3}
					/>
					<InfoCell
						label={t('details.popularity')}
						value={properties.popularity !== undefined ? properties.popularity.toFixed(2) : '—'}
						span={3}
					/>
				</div>
				{limits && (
					<div className="mt-1.5 rounded border p-2 space-y-2 max-w-sm" style={cellBase}>
						<div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
							{t('torrents.speedLimits')}
						</div>
						<SpeedLimitFields
							value={limits}
							onChange={setLimits}
							onSubmit={handleLimitsSave}
							onCancel={() => setLimits(null)}
							inputClassName="w-full px-3 py-2 rounded border text-xs"
							inputStyle={{
								backgroundColor: 'var(--bg-secondary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
							labelClassName="text-[9px] uppercase tracking-widest"
							autoFocus
						/>
						<div className="flex gap-2">
							<button
								onClick={() => setLimits(null)}
								className="px-2.5 py-1.5 rounded text-[10px] font-medium"
								style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={handleLimitsSave}
								disabled={speedLimitsMutation.isPending}
								className="px-2.5 py-1.5 rounded text-[10px] font-medium disabled:opacity-50"
								style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
							>
								{t('common.save')}
							</button>
						</div>
					</div>
				)}
			</fieldset>

			<fieldset className="border rounded p-2" style={{ borderColor: 'var(--border)' }}>
				<legend
					className="px-2 text-[9px] uppercase tracking-widest font-medium"
					style={{ color: 'var(--text-muted)' }}
				>
					{t('details.information')}
				</legend>
				<div className="grid grid-cols-6 gap-1.5">
					<InfoCell label={t('details.totalSize')} value={formatSize(properties.total_size)} />
					<InfoCell
						label={t('details.pieces')}
						value={`${properties.pieces_num} × ${formatSize(properties.piece_size)} (${properties.pieces_have})`}
					/>
					<InfoCell label={t('details.createdBy')} value={properties.created_by || '—'} />
					<InfoCell label={t('details.addedOn')} value={formatDate(properties.addition_date)} />
					<InfoCell
						label={t('details.completedOn')}
						value={properties.completion_date > 0 ? formatDate(properties.completion_date) : '—'}
					/>
					<InfoCell
						label={t('details.createdOn')}
						value={properties.creation_date > 0 ? formatDate(properties.creation_date) : '—'}
					/>
					<InfoCell
						label={t('details.private')}
						value={properties.is_private ? t('common.yes') : t('common.no')}
						accent={properties.is_private}
						span={2}
					/>
					<InfoCell label={t('columns.category')} value={category || '—'} span={2} />
					<InfoCell label={t('columns.tags')} value={tags || '—'} span={2} />
				</div>
				<div className="grid grid-cols-2 gap-1.5 mt-1.5">
					<InfoCell label={t('details.infoHashV1')} value={properties.infohash_v1 || hash} wide />
					<InfoCell label={t('details.infoHashV2')} value={properties.infohash_v2 || 'N/A'} muted={!properties.infohash_v2} wide />
				</div>
				<div className="mt-1.5 px-3 py-2 rounded border flex items-start gap-3" style={cellBase}>
					<div className="flex-1 min-w-0">
						<div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
							{t('details.savePath')}
						</div>
						<div className="text-xs font-mono mt-0.5 break-all" style={{ color: 'var(--text-primary)' }}>
							{properties.save_path}
						</div>
					</div>
					<button
						onClick={() => openEditor('savePath')}
						disabled={pathMutationPending}
						className="shrink-0 text-[9px] uppercase tracking-widest font-medium hover:opacity-80 disabled:opacity-50"
						style={{ color: 'var(--accent)' }}
					>
						{t('common.edit')}
					</button>
				</div>
				{properties.download_path &&
					(properties.download_path !== properties.save_path || properties.pieces_have < properties.pieces_num) && (
						<div className="mt-1.5 px-3 py-2 rounded border flex items-start gap-3" style={cellBase}>
							<div className="flex-1 min-w-0">
								<div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
									{t('details.downloadPath')}
								</div>
								<div className="text-xs font-mono mt-0.5 break-all" style={{ color: 'var(--text-primary)' }}>
									{properties.download_path}
								</div>
							</div>
							{properties.pieces_have < properties.pieces_num && (
								<button
									onClick={() => openEditor('downloadPath')}
									disabled={pathMutationPending}
									className="shrink-0 text-[9px] uppercase tracking-widest font-medium hover:opacity-80 disabled:opacity-50"
									style={{ color: 'var(--accent)' }}
								>
									{t('common.edit')}
								</button>
							)}
						</div>
					)}
				{editorMode && (
					<div className="mt-1.5 rounded border p-2 space-y-2" style={{ ...cellBase }}>
						<div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
							{editorMode === 'savePath' ? t('torrents.changeSavePath') : t('torrents.changeDownloadPath')}
						</div>
						<PathInput
							value={inputValue}
							onChange={setInputValue}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handlePathSave()
								if (e.key === 'Escape') setEditorMode(null)
							}}
							className="w-full px-3 py-2 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-secondary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
							autoFocus
						/>
						<div className="flex gap-2">
							<button
								onClick={() => setEditorMode(null)}
								className="px-2.5 py-1.5 rounded text-[10px] font-medium"
								style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
							>
								{t('common.cancel')}
							</button>
							<button
								onClick={handlePathSave}
								disabled={!inputValue.trim() || pathMutationPending}
								className="px-2.5 py-1.5 rounded text-[10px] font-medium disabled:opacity-50"
								style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
							>
								{pathMutationPending ? t('settings.saving') : t('common.save')}
							</button>
						</div>
					</div>
				)}
				{properties.comment && (
					<div className="mt-1.5">
						<InfoCell label={t('details.comment')} value={properties.comment} wide />
					</div>
				)}
			</fieldset>
		</div>
	)
}

function TrackersTab({ hash }: { hash: string }) {
	const { t } = useI18n()
	const [adding, setAdding] = useState(false)
	const [newUrl, setNewUrl] = useState('')
	const { data: trackers, isLoading } = useTorrentTrackers(hash)
	const addMutation = useAddTrackers()
	const removeMutation = useRemoveTrackers()

	function handleAdd() {
		if (newUrl.trim()) {
			addMutation.mutate({ hash, urls: newUrl.trim().split('\n').filter(Boolean) })
			setNewUrl('')
			setAdding(false)
		}
	}

	function handleRemove(url: string) {
		removeMutation.mutate({ hash, urls: [url] })
	}

	if (isLoading) return <LoadingSkeleton />
	const allTrackers = trackers ?? []
	const dhtPexLsd = allTrackers.filter((t: Tracker) => t.url.startsWith('** ['))
	const regularTrackers = allTrackers.filter((t: Tracker) => !t.url.startsWith('** ['))

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
				{adding ? (
					<div className="flex-1 flex items-center gap-2">
						<input
							type="text"
							value={newUrl}
							onChange={(e) => setNewUrl(e.target.value)}
							placeholder={t('details.enterTrackerUrls')}
							className="flex-1 px-2 py-1 rounded text-xs border"
							style={{
								backgroundColor: 'var(--bg-secondary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
							autoFocus
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleAdd()
								if (e.key === 'Escape') setAdding(false)
							}}
						/>
						<button
							onClick={handleAdd}
							className="px-2 py-1 rounded text-[10px] font-medium"
							style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
						>
							{t('common.add')}
						</button>
						<button
							onClick={() => setAdding(false)}
							className="px-2 py-1 rounded text-[10px] font-medium"
							style={{ color: 'var(--text-muted)' }}
						>
							{t('common.cancel')}
						</button>
					</div>
				) : (
					<button
						onClick={() => setAdding(true)}
						className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
						style={{ color: 'var(--accent)' }}
					>
						<Plus className="w-3 h-3" strokeWidth={2} />
						{t('details.addTracker')}
					</button>
				)}
			</div>
			{allTrackers.length === 0 ? (
				<EmptyState message={t('details.noTrackers')} />
			) : (
				<div className="overflow-auto flex-1">
					<table className="w-full text-xs">
						<thead
							className="sticky top-0 backdrop-blur-sm"
							style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 95%, transparent)' }}
						>
							<tr className="text-left border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">{t('details.tier')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">{t('details.url')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">{t('common.status')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('details.numSeeds')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('details.numLeeches')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('details.numPeers')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('details.numDownloaded')}</th>
								<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest"></th>
							</tr>
						</thead>
						<tbody>
							{dhtPexLsd.map((trk: Tracker, i: number) => (
								<tr key={`dht-${i}`} className="border-t transition-colors" style={{ borderColor: 'var(--border)' }}>
									<td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
										—
									</td>
									<td className="px-3 py-1.5 font-medium" style={{ color: 'var(--accent)' }}>
										{trk.url.replace('** [', '').replace('] **', '')}
									</td>
									<td className="px-3 py-1.5">
										<StatusBadge status={trk.status} />
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--accent)' }}>
										{trk.num_seeds}
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--warning)' }}>
										{trk.num_leeches}
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
										{trk.num_peers}
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
										{trk.num_downloaded}
									</td>
									<td className="px-3 py-1.5"></td>
								</tr>
							))}
							{regularTrackers.map((trk: Tracker, i: number) => (
								<tr key={i} className="border-t transition-colors group" style={{ borderColor: 'var(--border)' }}>
									<td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
										{trk.tier}
									</td>
									<td
										className="px-3 py-1.5 font-mono truncate max-w-[200px]"
										style={{ color: 'var(--text-primary)' }}
										title={trk.url}
									>
										{trk.url}
									</td>
									<td className="px-3 py-1.5">
										<StatusBadge status={trk.status} />
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--accent)' }}>
										{trk.num_seeds}
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--warning)' }}>
										{trk.num_leeches}
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
										{trk.num_peers}
									</td>
									<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
										{trk.num_downloaded}
									</td>
									<td className="px-3 py-1.5 text-right">
										<button
											onClick={() => handleRemove(trk.url)}
											className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
											style={{ color: 'var(--error)' }}
											title={t('details.removeTracker')}
										>
											<X className="w-3 h-3" strokeWidth={2} />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

function PeersTab({ hash }: { hash: string }) {
	const { t } = useI18n()
	const { data, isLoading } = useTorrentPeers(hash)
	if (isLoading) return <LoadingSkeleton />
	const peers = Object.values(data?.peers || {}) as Peer[]
	if (peers.length === 0) return <EmptyState message={t('details.noPeers')} />
	return (
		<div className="overflow-auto h-full">
			<table className="w-full text-xs">
				<thead
					className="sticky top-0 backdrop-blur-sm"
					style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 95%, transparent)' }}
				>
					<tr className="text-left border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">IP</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">{t('details.client')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">{t('details.flags')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('details.progress')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('columns.downloaded')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right">{t('columns.uploaded')}</th>
					</tr>
				</thead>
				<tbody>
					{peers.map((p: Peer, i: number) => (
						<tr key={i} className="border-t transition-colors" style={{ borderColor: 'var(--border)' }}>
							<td className="px-3 py-1.5 font-mono">
								<span style={{ color: 'var(--text-primary)' }}>{p.ip}</span>
								<span style={{ color: 'var(--text-muted)' }}>:{p.port}</span>
							</td>
							<td
								className="px-3 py-1.5 truncate max-w-[100px]"
								style={{ color: 'var(--text-muted)' }}
								title={p.client}
							>
								{p.client}
							</td>
							<td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
								{p.flags || '—'}
							</td>
							<td className="px-3 py-1.5 text-right">
								<div className="flex items-center justify-end gap-1.5">
									<div
										className="w-10 h-1 rounded-full overflow-hidden"
										style={{ backgroundColor: 'var(--bg-tertiary)' }}
									>
										<div
											className="h-full rounded-full"
											style={{ width: `${p.progress * 100}%`, backgroundColor: 'var(--accent)' }}
										/>
									</div>
									<span className="font-mono w-7 text-right" style={{ color: 'var(--text-muted)' }}>
										{(p.progress * 100).toFixed(0)}%
									</span>
								</div>
							</td>
							<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--accent)' }}>
								{formatSpeed(p.dl_speed, false)}
							</td>
							<td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--warning)' }}>
								{formatSpeed(p.up_speed, false)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

function HttpSourcesTab({ hash }: { hash: string }) {
	const { t } = useI18n()
	const { data: seeds, isLoading } = useTorrentWebSeeds(hash)
	if (isLoading) return <LoadingSkeleton />
	if (!seeds || seeds.length === 0) return <EmptyState message={t('details.noHttpSources')} />
	return (
		<div className="p-3 space-y-1.5 overflow-auto h-full">
			{seeds.map((s, i) => (
				<div
					key={i}
					className="flex items-center gap-2 px-3 py-2 rounded border"
					style={{ backgroundColor: 'color-mix(in srgb, white 2.5%, transparent)', borderColor: 'var(--border)' }}
				>
					<Link className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={2} />
					<span className="text-xs font-mono break-all" style={{ color: 'var(--text-primary)' }}>
						{s.url}
					</span>
				</div>
			))}
		</div>
	)
}

const PRIORITY_OPTIONS = [
	{ value: 0, key: 'details.skip', color: 'var(--text-muted)' },
	{ value: 1, key: 'details.normalPriority', color: 'var(--text-primary)' },
	{ value: 6, key: 'details.highPriority', color: 'var(--warning)' },
	{ value: 7, key: 'details.maxPriority', color: 'var(--accent)' },
]

const PRIORITY_TO_VALUE: Record<string, number> = { skip: 0, normal: 1, high: 6, max: 7 }

const PRIORITY_COLORS: Record<string, string> = {
	skip: 'var(--error)',
	high: 'var(--warning)',
	max: 'var(--warning)',
	mixed: 'var(--text-muted)',
	normal: 'var(--text-primary)',
}

function ContentTabInner({ hash, files }: { hash: string; files: TorrentFile[] }) {
	const { t } = useI18n()
	const setPriorityMutation = useSetFilePriority()
	const tree = useMemo(() => buildFileTree(files), [files])
	const [expanded, setExpanded] = useState<Set<string>>(() => getInitialExpanded(tree))
	const flatNodes = useMemo(() => flattenVisibleNodes(tree, expanded), [tree, expanded])

	function toggleExpanded(path: string) {
		setExpanded((prev) => {
			const next = new Set(prev)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			return next
		})
	}

	function handlePriorityChange(fileIndices: number[], priority: number) {
		setPriorityMutation.mutate({ hash, ids: fileIndices, priority })
	}

	return (
		<div className="overflow-auto h-full">
			<table className="w-full text-xs">
				<thead
					className="sticky top-0 backdrop-blur-sm"
					style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 95%, transparent)' }}
				>
					<tr className="text-left border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest">{t('common.name')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right w-20">{t('common.size')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right w-24">{t('details.progress')}</th>
						<th className="px-3 py-2 font-medium text-[9px] uppercase tracking-widest text-right w-20">{t('details.priorityLabel')}</th>
					</tr>
				</thead>
				<tbody>
					{flatNodes.map(({ node, depth }) => {
						const progress = node.progress * 100
						const done = progress >= 100
						const isSkipped = node.priority === 'skip'
						const isMixed = node.priority === 'mixed'
						const prioColor = PRIORITY_COLORS[node.priority] ?? 'var(--text-primary)'

						return (
							<tr
								key={node.path}
								className={`border-t transition-colors ${node.isFolder ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
								style={{ borderColor: 'var(--border)' }}
								onClick={node.isFolder ? () => toggleExpanded(node.path) : undefined}
							>
								<td className="px-3 py-1.5">
									<div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 16}px` }}>
										{node.isFolder ? (
											<ChevronRight
												className="w-3 h-3 shrink-0 transition-transform"
												style={{
													color: 'var(--text-muted)',
													transform: expanded.has(node.path) ? 'rotate(90deg)' : 'rotate(0deg)',
												}}
												strokeWidth={2}
											/>
										) : (
											<span className="w-3" />
										)}
										{node.isFolder ? (
											<Folder className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
										) : (
											<FileText
												className="w-3 h-3 shrink-0"
												style={{ color: isSkipped ? 'var(--error)' : done ? 'var(--accent)' : 'var(--text-muted)' }}
												strokeWidth={2}
											/>
										)}
										<span
											className="truncate"
											style={{
												color: isSkipped ? 'var(--text-muted)' : 'var(--text-primary)',
												textDecoration: isSkipped ? 'line-through' : 'none',
												fontWeight: node.isFolder ? 500 : 400,
											}}
											title={node.name}
										>
											{node.name}
										</span>
										{node.isFolder && (
											<span className="text-[9px] ml-1" style={{ color: 'var(--text-muted)' }}>
												({node.fileIndices.length})
											</span>
										)}
									</div>
								</td>
								<td
									className="px-3 py-1.5 text-right font-mono whitespace-nowrap"
									style={{ color: 'var(--text-muted)' }}
								>
									{formatSize(node.size)}
								</td>
								<td className="px-3 py-1.5 text-right">
									<div className="flex items-center justify-end gap-1.5">
										<div
											className="w-14 h-1 rounded-full overflow-hidden"
											style={{ backgroundColor: 'var(--bg-tertiary)' }}
										>
											<div
												className="h-full rounded-full"
												style={{ width: `${progress}%`, backgroundColor: done ? 'var(--accent)' : 'var(--text-muted)' }}
											/>
										</div>
										<span
											className="font-mono w-9 text-right"
											style={{ color: done ? 'var(--accent)' : 'var(--text-muted)' }}
										>
											{progress.toFixed(0)}%
										</span>
									</div>
								</td>
								<td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
									<select
										value={isMixed ? '' : (PRIORITY_TO_VALUE[node.priority] ?? 1)}
										onChange={(e) => handlePriorityChange(node.fileIndices, parseInt(e.target.value))}
										className="px-2 py-1 rounded text-[10px] font-medium border cursor-pointer"
										style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: prioColor }}
									>
										{isMixed && (
											<option value="" disabled>
												{t('details.mixed')}
											</option>
										)}
										{PRIORITY_OPTIONS.map((p) => (
											<option
												key={p.value}
												value={p.value}
												style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
											>
												{t(p.key)}
											</option>
										))}
									</select>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

function ContentTab({ hash }: { hash: string }) {
	const { t } = useI18n()
	const { data: files, isLoading } = useTorrentFiles(hash)
	if (isLoading) return <LoadingSkeleton />
	if (!files || files.length === 0) return <EmptyState message={t('details.noFiles')} />
	return <ContentTabInner key={hash} hash={hash} files={files} />
}

export function TorrentDetailsPanel({ hash, name, category, tags, expanded, onToggle, height, onHeightChange }: Props) {
	const { t } = useI18n()
	const [tab, setTab] = useState<Tab>('general')
	const [dragging, setDragging] = useState(false)
	const dragStartY = useRef(0)
	const dragStartHeight = useRef(0)

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!expanded) return
			e.preventDefault()
			setDragging(true)
			dragStartY.current = e.clientY
			dragStartHeight.current = height
		},
		[height, expanded]
	)

	useEffect(() => {
		if (!dragging) return
		const handleMouseMove = (e: MouseEvent) => {
			const delta = dragStartY.current - e.clientY
			const maxHeight = window.innerHeight * MAX_HEIGHT_PERCENT
			const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, dragStartHeight.current + delta))
			onHeightChange(newHeight)
		}
		const handleMouseUp = () => {
			setDragging(false)
			localStorage.setItem('detailsPanelHeight', height.toString())
		}
		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [dragging, height, onHeightChange])

	const panelHeight = expanded ? height : COLLAPSED_HEIGHT

	return (
		<div
			className="flex flex-col transition-[height] duration-300 ease-out"
			style={{ height: panelHeight, backgroundColor: 'var(--bg-secondary)' }}
		>
			<div
				onMouseDown={expanded ? handleMouseDown : undefined}
				className={`h-[3px] shrink-0 ${expanded ? `cursor-ns-resize ${dragging ? 'opacity-100' : 'opacity-70 hover:opacity-100'}` : ''} transition-opacity`}
				style={{
					background:
						'linear-gradient(to right, color-mix(in srgb, var(--accent) 60%, transparent), color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--accent) 60%, transparent))',
				}}
			/>
			<div
				className="flex items-center gap-2 px-3 shrink-0 cursor-pointer select-none border-b"
				style={{ height: COLLAPSED_HEIGHT - 3, backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
				onClick={onToggle}
			>
				<button
					className="p-1 rounded transition-colors"
					style={{ color: 'var(--text-muted)' }}
					onClick={(e) => {
						e.stopPropagation()
						onToggle()
					}}
				>
					<ChevronUp
						className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
						strokeWidth={2}
					/>
				</button>

				<div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

				<span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
					{t('common.details')}
				</span>

				{hash && name && (
					<>
						<div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
						<span className="text-xs truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }} title={name}>
							{name}
						</span>
					</>
				)}

				<div className="flex-1" />

				{expanded && hash && (
					<div className="flex items-center gap-0.5">
						{TABS.map((tabDef) => (
							<button
								key={tabDef.id}
								onClick={(e) => {
									e.stopPropagation()
									setTab(tabDef.id)
								}}
								className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wide transition-all border"
								style={{
									backgroundColor: tab === tabDef.id ? 'color-mix(in srgb, white 8%, transparent)' : 'transparent',
									color: tab === tabDef.id ? 'var(--text-secondary)' : 'var(--text-muted)',
									borderColor: tab === tabDef.id ? 'color-mix(in srgb, white 10%, transparent)' : 'transparent',
								}}
							>
								<tabDef.Icon className="w-3 h-3" strokeWidth={2} />
								<span className="hidden lg:inline">{t(tabDef.key)}</span>
							</button>
						))}
					</div>
				)}
			</div>

			{expanded && (
				<div className="flex-1 overflow-hidden border-t" style={{ borderColor: 'var(--border)' }}>
					{hash ? (
						<>
							{tab === 'general' && <GeneralTab hash={hash} category={category} tags={tags} />}
							{tab === 'trackers' && <TrackersTab hash={hash} />}
							{tab === 'peers' && <PeersTab hash={hash} />}
							{tab === 'http' && <HttpSourcesTab hash={hash} />}
							{tab === 'content' && <ContentTab hash={hash} />}
						</>
					) : (
						<div className="flex items-center justify-center h-full">
							<div className="text-center">
								<MousePointer className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--border)' }} strokeWidth={1} />
								<p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
									{t('details.selectTorrent')}
								</p>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
