import { useState, useRef, type FC } from 'react'
import { createPortal } from 'react-dom'
import {
	LayoutGrid,
	Download,
	Upload,
	CheckCircle,
	Square,
	Zap,
	Search,
	Folder,
	Tag,
	Settings,
	Repeat,
	Columns3,
	GripHorizontal,
	Check,
} from 'lucide-react'
import type { TorrentFilter } from '../types/qbittorrent'
import type { Category } from '../api/qbittorrent'
import { getColumnLabel, type ColumnDef } from './columns'
import { useI18n } from '../i18n'

const filters: { value: TorrentFilter; key: string; Icon: FC<{ className?: string; strokeWidth?: number }> }[] = [
	{ value: 'all', key: 'status.all', Icon: LayoutGrid },
	{ value: 'downloading', key: 'status.downloading', Icon: Download },
	{ value: 'seeding', key: 'status.seeding', Icon: Upload },
	{ value: 'completed', key: 'status.completed', Icon: CheckCircle },
	{ value: 'stopped', key: 'status.stopped', Icon: Square },
	{ value: 'active', key: 'status.active', Icon: Zap },
]

interface Props {
	filter: TorrentFilter
	onFilterChange: (f: TorrentFilter) => void
}

export function FilterBar({ filter, onFilterChange }: Props) {
	const { t } = useI18n()
	return (
		<>
			{filters.map((f) => {
				const label = t(f.key)
				return (
					<button
						key={f.value}
						onClick={() => onFilterChange(f.value)}
						title={label}
						className="relative flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-150"
						style={{
							color: filter === f.value ? 'var(--accent-contrast)' : 'var(--text-muted)',
							backgroundColor: filter === f.value ? 'var(--accent)' : 'transparent',
						}}
					>
						<f.Icon className="w-3.5 h-3.5" strokeWidth={2} />
						<span className="text-xs font-medium">{label}</span>
					</button>
				)
			})}
		</>
	)
}

export function SearchInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
	const { t } = useI18n()
	return (
		<div className="relative flex-1 min-w-[120px] max-w-[280px]">
			<Search
				className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
				style={{ color: 'var(--text-muted)' }}
				strokeWidth={2}
			/>
			<input
				type="text"
				placeholder={t('common.searchPlaceholder')}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full h-7 pl-8 pr-3 rounded text-xs transition-all duration-150"
				style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
			/>
		</div>
	)
}

interface DropdownProps<T extends string> {
	value: T | null
	onChange: (v: T | null) => void
	options: { value: T; label: string; count?: number }[]
	placeholder: string
	allLabel: string
	Icon: FC<{ className?: string; strokeWidth?: number }>
}

function Dropdown<T extends string>({ value, onChange, options, placeholder, allLabel, Icon }: DropdownProps<T>) {
	const [open, setOpen] = useState(false)
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)

	const selected = options.find((o) => o.value === value)

	function handleToggle() {
		if (open) {
			setOpen(false)
			return
		}
		const rect = buttonRef.current?.getBoundingClientRect()
		if (rect) setPos({ top: rect.bottom + 4, left: rect.left })
		setOpen(true)
	}

	return (
		<>
			<button
				ref={buttonRef}
				onClick={handleToggle}
				title={selected?.label ?? placeholder}
				className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-150"
				style={{
					color: value ? 'var(--accent)' : 'var(--text-muted)',
					backgroundColor: value ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
				}}
			>
				<Icon className="w-3.5 h-3.5" strokeWidth={2} />
				<span className="text-xs font-medium max-w-[60px] truncate">{selected?.label ?? placeholder}</span>
			</button>
			{open &&
				pos &&
				createPortal(
					<>
						<div onMouseDown={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
						<div
							className="min-w-[160px] max-h-[300px] overflow-auto rounded border shadow-xl"
							style={{
								position: 'fixed',
								top: pos.top,
								left: pos.left,
								zIndex: 100,
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
							}}
						>
							<button
								onClick={() => {
									onChange(null)
									setOpen(false)
								}}
								className="w-full flex items-center px-2.5 py-1.5 text-xs text-left transition-colors"
								style={{
									color: !value ? 'var(--accent)' : 'var(--text-muted)',
									backgroundColor: !value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
								}}
							>
								{allLabel}
							</button>
							{options.map((o) => (
								<button
									key={o.value}
									onClick={() => {
										onChange(o.value)
										setOpen(false)
									}}
									className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors"
									style={{
										color: value === o.value ? 'var(--accent)' : 'var(--text-muted)',
										backgroundColor:
											value === o.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
									}}
								>
									<span className="truncate">{o.label}</span>
									{o.count !== undefined && (
										<span style={{ color: 'var(--text-muted)' }} className="ml-2 text-xs">
											{o.count}
										</span>
									)}
								</button>
							))}
						</div>
					</>,
					document.body
				)}
		</>
	)
}

interface CategoryDropdownProps {
	value: string | null
	onChange: (v: string | null) => void
	categories: Record<string, Category>
}

export function CategoryDropdown({ value, onChange, categories }: CategoryDropdownProps) {
	const { t } = useI18n()
	const options = Object.keys(categories).map((name) => ({ value: name, label: name }))
	return (
		<Dropdown
			value={value}
			onChange={onChange}
			options={options}
			placeholder={t('filter.categoryPlaceholder')}
			allLabel={t('filter.allCategories')}
			Icon={Folder}
		/>
	)
}

interface TagDropdownProps {
	value: string | null
	onChange: (v: string | null) => void
	tags: string[]
}

export function TagDropdown({ value, onChange, tags }: TagDropdownProps) {
	const { t } = useI18n()
	const options = tags.map((tName) => ({ value: tName, label: tName }))
	return (
		<Dropdown
			value={value}
			onChange={onChange}
			options={options}
			placeholder={t('filter.tagPlaceholder')}
			allLabel={t('filter.allTags')}
			Icon={Tag}
		/>
	)
}

export function ManageButton({ onClick }: { onClick: () => void }) {
	const { t } = useI18n()
	return (
		<button
			onClick={onClick}
			className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-150 hover:opacity-80"
			style={{ color: 'var(--text-muted)' }}
			title={t('filter.manageCatTags')}
		>
			<Settings className="w-3.5 h-3.5" strokeWidth={2} />
			<span className="text-xs font-medium">{t('common.manage')}</span>
		</button>
	)
}

interface TrackerDropdownProps {
	value: string | null
	onChange: (v: string | null) => void
	trackers: string[]
}

export function TrackerDropdown({ value, onChange, trackers }: TrackerDropdownProps) {
	const { t } = useI18n()
	const options = trackers.map((tUrl) => {
		try {
			const url = new URL(tUrl)
			return { value: tUrl, label: url.hostname }
		} catch {
			return { value: tUrl, label: tUrl }
		}
	})
	return (
		<Dropdown
			value={value}
			onChange={onChange}
			options={options}
			placeholder={t('filter.trackerPlaceholder')}
			allLabel={t('filter.allTrackers')}
			Icon={Repeat}
		/>
	)
}

interface ColumnSelectorProps {
	columns: ColumnDef[]
	visible: Set<string>
	onChange: (visible: Set<string>) => void
	columnOrder: string[]
	onReorder: (order: string[]) => void
	onReset: () => void
}

export function ColumnSelector({ columns, visible, onChange, columnOrder, onReorder, onReset }: ColumnSelectorProps) {
	const { t } = useI18n()
	const [open, setOpen] = useState(false)
	const [draggedId, setDraggedId] = useState<string | null>(null)
	const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)

	function handleToggle() {
		if (open) {
			setOpen(false)
			return
		}
		const rect = buttonRef.current?.getBoundingClientRect()
		if (rect) setPos({ top: rect.bottom, right: window.innerWidth - rect.right })
		setOpen(true)
	}

	function toggle(id: string) {
		const next = new Set(visible)
		if (next.has(id)) next.delete(id)
		else next.add(id)
		onChange(next)
	}

	function handleDragStart(e: React.DragEvent, id: string) {
		setDraggedId(id)
		e.dataTransfer.effectAllowed = 'move'
	}

	function handleDragOver(e: React.DragEvent, targetId: string) {
		e.preventDefault()
		if (!draggedId || draggedId === targetId) return
		const dragIdx = columnOrder.indexOf(draggedId)
		const targetIdx = columnOrder.indexOf(targetId)
		if (dragIdx === -1 || targetIdx === -1) return
		const newOrder = [...columnOrder]
		newOrder.splice(dragIdx, 1)
		newOrder.splice(targetIdx, 0, draggedId)
		onReorder(newOrder)
	}

	function handleDragEnd() {
		setDraggedId(null)
	}

	const orderedColumns = columnOrder
		.map((id) => columns.find((c) => c.id === id))
		.filter((c): c is ColumnDef => c !== undefined)

	return (
		<>
			<button
				ref={buttonRef}
				onClick={handleToggle}
				className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-150"
				style={{ color: 'var(--text-muted)' }}
				title={t('filter.columns')}
			>
				<Columns3 className="w-3.5 h-3.5" strokeWidth={2} />
				<span className="text-xs font-medium">{t('filter.columns')}</span>
			</button>
			{open &&
				pos &&
				createPortal(
					<>
						<div onMouseDown={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
						<div
							className="min-w-[180px] max-h-[400px] overflow-auto rounded border shadow-xl"
							style={{
								position: 'fixed',
								top: pos.top + 4,
								right: pos.right,
								zIndex: 100,
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
							}}
						>
							<div
								className="flex items-center justify-between px-2.5 py-1.5 border-b"
								style={{ borderColor: 'var(--border)' }}
							>
								<span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
									{t('filter.columns')}
								</span>
								<button
									onClick={() => {
										onReset()
										setOpen(false)
									}}
									className="text-xs transition-colors hover:opacity-80"
									style={{ color: 'var(--accent)' }}
								>
									{t('common.reset')}
								</button>
							</div>
							{orderedColumns.map((col) => (
								<div
									key={col.id}
									draggable
									onDragStart={(e) => handleDragStart(e, col.id)}
									onDragOver={(e) => handleDragOver(e, col.id)}
									onDragEnd={handleDragEnd}
									className={`flex items-center gap-1.5 px-2 py-1.5 text-xs transition-colors hover:bg-white/5 cursor-move ${draggedId === col.id ? 'opacity-50' : ''}`}
									style={{ color: 'var(--text-primary)' }}
								>
									<GripHorizontal className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
									<button onClick={() => toggle(col.id)} className="flex-1 flex items-center justify-between text-left">
										<span>{getColumnLabel(col, t)}</span>
										{visible.has(col.id) && (
											<Check className="w-3 h-3" style={{ color: 'var(--accent)' }} strokeWidth={3} />
										)}
									</button>
								</div>
							))}
						</div>
					</>,
					document.body
				)}
		</>
	)
}
