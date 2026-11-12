import { useState, useRef, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { PathInput } from './ui/PathInput'
import { SpeedLimitFields } from './ui/SpeedLimitFields'
import { usePathHistory } from '../hooks/usePathHistory'
import { useInstance } from '../hooks/useInstance'
import {
	useCategories,
	useTags,
	useStartTorrents,
	useStopTorrents,
	useRecheckTorrents,
	useReannounceTorrents,
	useDeleteTorrents,
	useSetCategory,
	useAddTags,
	useRemoveTags,
	useRenameTorrent,
	useSetTorrentDownloadPath,
	useSetTorrentLocation,
	useExportTorrents,
	useSetTorrentSpeedLimits,
} from '../hooks/useTorrents'
import type { Torrent } from '../types/qbittorrent'
import { commonKiB, getLimitChanges, type SpeedLimitValues } from '../utils/speedLimits'
import { useI18n } from '../i18n'

interface Props {
	x: number
	y: number
	torrents: Torrent[]
	onClose: () => void
}

type Submenu = 'category' | 'addTag' | 'removeTag' | 'delete' | null
type EditorMode = 'rename' | 'savePath' | 'downloadPath' | 'speedLimits' | null

export function ContextMenu({ x, y, torrents, onClose }: Props) {
	const { t } = useI18n()
	const instance = useInstance()
	const [submenu, setSubmenu] = useState<Submenu>(null)
	const [editorMode, setEditorMode] = useState<EditorMode>(null)
	const [inputValue, setInputValue] = useState('')
	const [limits, setLimits] = useState<SpeedLimitValues>({ dl: '', up: '' })
	const ref = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const { addPath } = usePathHistory()

	const { data: categories = {} } = useCategories()
	const { data: tags = [] } = useTags()
	const startMutation = useStartTorrents()
	const stopMutation = useStopTorrents()
	const recheckMutation = useRecheckTorrents()
	const reannounceMutation = useReannounceTorrents()
	const setCategoryMutation = useSetCategory()
	const addTagsMutation = useAddTags()
	const removeTagsMutation = useRemoveTags()
	const renameMutation = useRenameTorrent()
	const setLocationMutation = useSetTorrentLocation()
	const setDownloadPathMutation = useSetTorrentDownloadPath()
	const deleteMutation = useDeleteTorrents()
	const exportMutation = useExportTorrents()
	const speedLimitsMutation = useSetTorrentSpeedLimits()

	const hashes = torrents.map((t) => t.hash)
	const isSingle = torrents.length === 1
	const currentTags = isSingle
		? torrents[0].tags
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
		: []
	const commonDl = commonKiB(torrents.map((t) => t.dl_limit))
	const commonUp = commonKiB(torrents.map((t) => t.up_limit))
	const initialLimits = { dl: commonDl ?? '', up: commonUp ?? '' }

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose()
		}
		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [onClose])

	useEffect(() => {
		if (editorMode && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [editorMode])

	const menuStyle: React.CSSProperties = {
		position: 'fixed',
		left: Math.min(x, window.innerWidth - (editorMode === 'speedLimits' ? 260 : 200)),
		top: Math.min(y, window.innerHeight - 300),
		backgroundColor: 'var(--bg-tertiary)',
		borderColor: 'var(--border)',
	}

	function handleStart() {
		startMutation.mutate(hashes)
		onClose()
	}

	function handleStop() {
		stopMutation.mutate(hashes)
		onClose()
	}

	function handleRecheck() {
		recheckMutation.mutate(hashes)
		onClose()
	}

	function handleReannounce() {
		reannounceMutation.mutate(hashes)
		onClose()
	}

	function handleSetCategory(category: string) {
		setCategoryMutation.mutate({ hashes, category })
		onClose()
	}

	function handleAddTag(tag: string) {
		addTagsMutation.mutate({ hashes, tags: tag })
		onClose()
	}

	function handleRemoveTag(tag: string) {
		removeTagsMutation.mutate({ hashes, tags: tag })
		onClose()
	}

	function handleEditorSubmit() {
		if (editorMode === 'speedLimits') {
			const changes = getLimitChanges(initialLimits, limits)
			if (Object.keys(changes).length > 0) speedLimitsMutation.mutate({ hashes, limits: changes })
			onClose()
			return
		}

		const value = inputValue.trim()
		if (!value) return

		if (editorMode === 'rename' && isSingle) {
			renameMutation.mutate({ hash: hashes[0], name: value })
			onClose()
			return
		}

		if (editorMode === 'savePath') {
			setLocationMutation.mutate({ hashes, location: value }, { onSuccess: () => addPath(value) })
			onClose()
			return
		}

		if (editorMode === 'downloadPath') {
			setDownloadPathMutation.mutate({ hashes, downloadPath: value }, { onSuccess: () => addPath(value) })
			onClose()
		}
	}

	function startRename() {
		setInputValue(torrents[0].name)
		setEditorMode('rename')
		setSubmenu(null)
	}

	function startSetSavePath() {
		const uniquePaths = new Set(torrents.map((torrent) => torrent.save_path).filter(Boolean))
		setInputValue(uniquePaths.size === 1 ? torrents[0].save_path : '')
		setEditorMode('savePath')
		setSubmenu(null)
	}

	function startSetDownloadPath() {
		const uniquePaths = new Set(torrents.map((torrent) => torrent.download_path).filter(Boolean))
		setInputValue(uniquePaths.size === 1 ? torrents[0].download_path : '')
		setEditorMode('downloadPath')
		setSubmenu(null)
	}

	function startSetSpeedLimits() {
		setLimits(initialLimits)
		setEditorMode('speedLimits')
		setSubmenu(null)
	}

	const showDownloadPath = torrents.some((t) => t.download_path && t.progress < 1)

	function handleDelete(deleteFiles: boolean) {
		deleteMutation.mutate({ hashes, deleteFiles })
		onClose()
	}

	function handleExport() {
		exportMutation.mutate(torrents.map((t) => ({ hash: t.hash, name: t.name })))
		onClose()
	}

	const editorTitle =
		editorMode === 'rename'
			? t('torrents.renameTorrent')
			: editorMode === 'savePath'
				? t('torrents.changeSavePath')
				: editorMode === 'speedLimits'
					? t('torrents.speedLimits')
					: t('torrents.changeDownloadPath')
	const editorActionLabel = editorMode === 'rename' ? t('torrents.rename') : t('common.save')
	const editorPlaceholder =
		editorMode === 'rename'
			? t('torrents.enterTorrentName')
			: editorMode === 'savePath'
				? t('torrents.enterSavePath')
				: t('torrents.enterDownloadPath')

	if (editorMode && (editorMode !== 'rename' || isSingle)) {
		return (
			<div ref={ref} className="rounded-lg border shadow-xl z-[200] p-3" style={menuStyle}>
				<div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
					{editorTitle}
				</div>
				{editorMode === 'speedLimits' ? (
					<div className="mb-2 w-56">
						<SpeedLimitFields
							value={limits}
							onChange={setLimits}
							onSubmit={handleEditorSubmit}
							onCancel={onClose}
							placeholders={{
								dl: commonDl === null ? t('torrents.mixed') : undefined,
								up: commonUp === null ? t('torrents.mixed') : undefined,
							}}
							inputClassName="w-full px-2 py-1.5 rounded-lg border text-sm"
							inputStyle={{
								backgroundColor: 'var(--bg-secondary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
							autoFocus
						/>
					</div>
				) : editorMode === 'rename' ? (
					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						placeholder={editorPlaceholder}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleEditorSubmit()
							if (e.key === 'Escape') onClose()
						}}
						className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
						style={{
							backgroundColor: 'var(--bg-secondary)',
							borderColor: 'var(--border)',
							color: 'var(--text-primary)',
						}}
					/>
				) : (
					<div className="mb-2">
						<PathInput
							inputRef={inputRef}
							value={inputValue}
							onChange={setInputValue}
							placeholder={editorPlaceholder}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleEditorSubmit()
								if (e.key === 'Escape') onClose()
							}}
							className="w-full px-3 py-2 rounded-lg border text-sm"
							style={{
								backgroundColor: 'var(--bg-secondary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
				)}
				<div className="flex gap-2">
					<button
						onClick={onClose}
						className="flex-1 py-1.5 rounded-lg text-xs"
						style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
					>
						{t('common.cancel')}
					</button>
					<button
						onClick={handleEditorSubmit}
						className="flex-1 py-1.5 rounded-lg text-xs"
						disabled={editorMode !== 'speedLimits' && !inputValue.trim()}
						style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
					>
						{editorActionLabel}
					</button>
				</div>
			</div>
		)
	}

	return (
		<div ref={ref} className="rounded-lg border shadow-xl z-[200] py-1 min-w-[160px]" style={menuStyle}>
			<MenuItem onClick={handleStart}>{t('torrents.start')}</MenuItem>
			<MenuItem onClick={handleStop}>{t('torrents.stop')}</MenuItem>
			<MenuItem onClick={handleRecheck}>{t('torrents.forceRecheck')}</MenuItem>
			<MenuItem onClick={handleReannounce}>{t('torrents.forceReannounce')}</MenuItem>
			<div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
			<MenuItem onClick={() => setSubmenu(submenu === 'category' ? null : 'category')} hasSubmenu>
				{t('torrents.setCategory')}
			</MenuItem>
			{submenu === 'category' && (
				<div className="pl-2">
					<MenuItem onClick={() => handleSetCategory('')} small>
						{t('common.none')}
					</MenuItem>
					{Object.keys(categories).map((cat) => (
						<MenuItem key={cat} onClick={() => handleSetCategory(cat)} small>
							{cat}
						</MenuItem>
					))}
				</div>
			)}
			<MenuItem onClick={() => setSubmenu(submenu === 'addTag' ? null : 'addTag')} hasSubmenu>
				{t('torrents.addTag')}
			</MenuItem>
			{submenu === 'addTag' && (
				<div className="pl-2">
					{tags.length === 0 ? (
						<div className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('torrents.noTags')}
						</div>
					) : (
						tags.map((tag) => (
							<MenuItem key={tag} onClick={() => handleAddTag(tag)} small>
								{tag}
							</MenuItem>
						))
					)}
				</div>
			)}
			{isSingle && currentTags.length > 0 && (
				<>
					<MenuItem onClick={() => setSubmenu(submenu === 'removeTag' ? null : 'removeTag')} hasSubmenu>
						{t('torrents.removeTag')}
					</MenuItem>
					{submenu === 'removeTag' && (
						<div className="pl-2">
							{currentTags.map((tag) => (
								<MenuItem key={tag} onClick={() => handleRemoveTag(tag)} small>
									{tag}
								</MenuItem>
							))}
						</div>
					)}
				</>
			)}
			{isSingle && (
				<>
					<div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
					<MenuItem onClick={startRename}>{t('torrents.rename')}</MenuItem>
				</>
			)}
			<MenuItem onClick={startSetSavePath}>{t('torrents.changeSavePath')}</MenuItem>
			{showDownloadPath && <MenuItem onClick={startSetDownloadPath}>{t('torrents.changeDownloadPath')}</MenuItem>}
			<MenuItem onClick={startSetSpeedLimits}>{t('torrents.speedLimits')}</MenuItem>
			<div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />
			{instance.capabilities?.torrentExport !== false && (
				<MenuItem onClick={handleExport}>{t('torrents.export')}</MenuItem>
			)}
			<MenuItem onClick={() => setSubmenu(submenu === 'delete' ? null : 'delete')} hasSubmenu>
				{t('common.delete')}
			</MenuItem>
			{submenu === 'delete' && (
				<div className="pl-2">
					<MenuItem onClick={() => handleDelete(false)} small>
						{t('torrents.keepFiles')}
					</MenuItem>
					<MenuItem onClick={() => handleDelete(true)} small>
						{t('torrents.deleteFiles')}
					</MenuItem>
				</div>
			)}
		</div>
	)
}

function MenuItem({
	children,
	onClick,
	hasSubmenu,
	small,
}: {
	children: React.ReactNode
	onClick: () => void
	hasSubmenu?: boolean
	small?: boolean
}) {
	return (
		<button
			onClick={onClick}
			className={`w-full flex items-center justify-between px-3 ${small ? 'py-1' : 'py-1.5'} text-xs text-left transition-colors hover:opacity-80`}
			style={{ color: 'var(--text-primary)', backgroundColor: 'transparent' }}
		>
			<span>{children}</span>
			{hasSubmenu && <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />}
		</button>
	)
}
