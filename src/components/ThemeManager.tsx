import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, Download, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { generateThemeColors, isValidHex } from '../utils/colorUtils'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../themes'
import { useI18n } from '../i18n'

type View = 'list' | 'editor'

interface ThemeManagerProps {
	onClose: () => void
}

export function ThemeManager({ onClose }: ThemeManagerProps) {
	const { t } = useI18n()
	const { themes, customThemes, addTheme, updateTheme, deleteTheme } = useTheme()
	const [view, setView] = useState<View>('list')
	const [editingTheme, setEditingTheme] = useState<Theme | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const allNames = useMemo(
		() => [...themes.map((t) => t.name), ...customThemes.map((t) => t.name)],
		[themes, customThemes]
	)

	function handleNewTheme() {
		setEditingTheme(null)
		setView('editor')
	}

	function handleEditTheme(theme: Theme) {
		setEditingTheme(theme)
		setView('editor')
	}

	function handleSaveTheme(theme: Theme) {
		if (editingTheme) {
			updateTheme(theme)
		} else {
			addTheme(theme)
		}
		setView('list')
		setEditingTheme(null)
	}

	function handleExport() {
		const blob = new Blob([JSON.stringify(customThemes, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'qbitwebui-themes.json'
		a.click()
		URL.revokeObjectURL(url)
	}

	function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = (event) => {
			try {
				const imported = JSON.parse(event.target?.result as string) as Theme[]
				if (!Array.isArray(imported)) throw new Error('Invalid format')

				// Add each theme with new ID to avoid collisions
				imported.forEach((t) => {
					if (t.name && t.colors) {
						addTheme({
							...t,
							id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
						})
					}
				})
			} catch {
				alert(t('theme.importFailed'))
			}
		}
		reader.readAsText(file)
		e.target.value = '' // Reset for re-import
	}

	return createPortal(
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
				{view === 'list' ? (
					<ListView
						customThemes={customThemes}
						onClose={onClose}
						onNew={handleNewTheme}
						onEdit={handleEditTheme}
						onDelete={deleteTheme}
						onExport={handleExport}
						onImportClick={() => fileInputRef.current?.click()}
					/>
				) : (
					<EditorView
						initialTheme={editingTheme}
						existingNames={allNames}
						onSave={handleSaveTheme}
						onBack={() => {
							setView('list')
							setEditingTheme(null)
						}}
					/>
				)}
			</div>
			<input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
		</div>,
		document.body
	)
}

// ─────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────

interface ListViewProps {
	customThemes: Theme[]
	onClose: () => void
	onNew: () => void
	onEdit: (theme: Theme) => void
	onDelete: (id: string) => void
	onExport: () => void
	onImportClick: () => void
}

function ListView({ customThemes, onClose, onNew, onEdit, onDelete, onExport, onImportClick }: ListViewProps) {
	const { t } = useI18n()
	return (
		<>
			{/* Header */}
			<div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-tertiary)]">
				<h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('theme.manage')}</h2>
				<button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
					<X className="w-5 h-5" strokeWidth={2} />
				</button>
			</div>

			{/* Action Bar */}
			<div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
				<button
					onClick={onNew}
					className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
				>
					<Plus className="w-4 h-4" strokeWidth={2} />
					{t('theme.create')}
				</button>
				<div className="flex-1" />
				<button
					onClick={onImportClick}
					className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
					title={t('theme.import')}
				>
					<Upload className="w-4 h-4" strokeWidth={2} />
				</button>
				<button
					onClick={onExport}
					disabled={customThemes.length === 0}
					className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					title={t('theme.export')}
				>
					<Download className="w-4 h-4" strokeWidth={2} />
				</button>
			</div>

			{/* Theme List */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2">
				{customThemes.length === 0 ? (
					<div className="py-8 text-center text-sm text-[var(--text-muted)]">{t('theme.noCustomThemes')}</div>
				) : (
					customThemes.map((themeItem) => (
						<div
							key={themeItem.id}
							className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]"
						>
							<div className="flex gap-1 shrink-0">
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeItem.colors.bgPrimary }} />
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeItem.colors.accent }} />
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeItem.colors.warning }} />
							</div>
							<span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{themeItem.name}</span>
							<button
								onClick={() => onEdit(themeItem)}
								className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-colors"
								title={t('common.edit')}
							>
								<Pencil className="w-4 h-4" strokeWidth={2} />
							</button>
							<button
								onClick={() => onDelete(themeItem.id)}
								className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--bg-secondary)] transition-colors"
								title={t('common.delete')}
							>
								<Trash2 className="w-4 h-4" strokeWidth={2} />
							</button>
						</div>
					))
				)}
			</div>
		</>
	)
}

// ─────────────────────────────────────────────────────────────
// Editor View
// ─────────────────────────────────────────────────────────────

interface EditorViewProps {
	initialTheme: Theme | null
	existingNames: string[]
	onSave: (theme: Theme) => void
	onBack: () => void
}

function EditorView({ initialTheme, existingNames, onSave, onBack }: EditorViewProps) {
	const { t } = useI18n()
	const [name, setName] = useState(initialTheme?.name ?? 'My Custom Theme')
	const [bgPrimary, setBgPrimary] = useState(initialTheme?.colors.bgPrimary ?? '#1e1e2e')
	const [accent, setAccent] = useState(initialTheme?.colors.accent ?? '#cba6f7')
	const [textPrimary, setTextPrimary] = useState(initialTheme?.colors.textPrimary ?? '#cdd6f4')
	const [warning, setWarning] = useState(initialTheme?.colors.warning ?? '#f7b731')

	const previewColors = useMemo(() => {
		if (isValidHex(bgPrimary) && isValidHex(accent) && isValidHex(textPrimary) && isValidHex(warning)) {
			return generateThemeColors(bgPrimary, accent, textPrimary, warning)
		}
		return null
	}, [bgPrimary, accent, textPrimary, warning])

	const isNameTaken = useMemo(() => {
		const trimmed = name.trim().toLowerCase()
		return existingNames.some((n) => {
			if (initialTheme?.name.toLowerCase() === trimmed) return false
			return n.toLowerCase() === trimmed
		})
	}, [name, existingNames, initialTheme?.name])

	const handleSave = () => {
		if (!previewColors || !name.trim() || isNameTaken) return
		onSave({
			id: initialTheme?.id ?? `custom-${Date.now()}`,
			name: name.trim(),
			colors: previewColors,
		})
	}

	const colorFields = [
		{ label: t('theme.bgColor'), val: bgPrimary, set: setBgPrimary },
		{ label: t('theme.accentColor'), val: accent, set: setAccent },
		{ label: t('theme.textColor'), val: textPrimary, set: setTextPrimary },
		{ label: t('theme.warningColor'), val: warning, set: setWarning },
	]

	return (
		<>
			{/* Header */}
			<div className="p-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--bg-tertiary)]">
				<button onClick={onBack} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
					<ChevronLeft className="w-5 h-5" strokeWidth={2} />
				</button>
				<h2 className="text-lg font-semibold text-[var(--text-primary)]">
					{initialTheme ? t('theme.editTheme') : t('theme.create')}
				</h2>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{/* Theme Name */}
				<div className="space-y-1">
					<label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
						<span>{t('theme.themeName')}</span>
						<span className="text-[var(--text-muted)]">{name.length}/20</span>
					</label>
					<input
						type="text"
						value={name}
						onChange={(e) => {
							const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s\-_]/g, '')
							setName(sanitized.slice(0, 20))
						}}
						maxLength={20}
						className="w-full px-3 py-2 bg-[var(--bg-primary)] border rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
						style={{ borderColor: isNameTaken ? 'var(--error)' : 'var(--border)' }}
					/>
					{isNameTaken && <p className="text-xs text-[var(--error)]">{t('theme.nameExists')}</p>}
				</div>

				{/* Color Inputs */}
				<div className="grid grid-cols-2 gap-3">
					{colorFields.map((field) => (
						<ColorInput key={field.label} label={field.label} value={field.val} onChange={field.set} />
					))}
				</div>

				{/* Preview */}
				{previewColors && (
					<div
						className="rounded-xl p-4 border space-y-3"
						style={{ backgroundColor: previewColors.bgPrimary, borderColor: previewColors.border }}
					>
						<div className="flex justify-between items-center">
							<div className="text-sm font-bold" style={{ color: previewColors.textPrimary }}>
								{name || t('theme.themeName')}
							</div>
							<div
								className="px-2 py-0.5 rounded-full text-xs font-medium"
								style={{ backgroundColor: previewColors.accent, color: previewColors.accentContrast }}
							>
								{t('theme.badge')}
							</div>
						</div>
						<div
							className="p-3 rounded-lg border"
							style={{ backgroundColor: previewColors.bgSecondary, borderColor: previewColors.border }}
						>
							<div className="text-xs mb-2" style={{ color: previewColors.textSecondary }}>
								{t('theme.previewCard')}
							</div>
							<button
								className="w-full py-1.5 rounded-md text-xs font-medium"
								style={{ backgroundColor: previewColors.accent, color: previewColors.accentContrast }}
							>
								{t('theme.action')}
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--bg-tertiary)]">
				<button
					onClick={onBack}
					className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
				>
					{t('common.cancel')}
				</button>
				<button
					onClick={handleSave}
					disabled={!previewColors || !name.trim() || isNameTaken}
					className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{t('theme.saveTheme')}
				</button>
			</div>
		</>
	)
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [open])

	return (
		<div className="space-y-1">
			<label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
			<div className="flex items-center gap-2">
				<div ref={ref} className="relative">
					<button
						type="button"
						onClick={() => setOpen(!open)}
						className="w-8 h-8 rounded-lg border border-[var(--border)] shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
						style={{ backgroundColor: isValidHex(value) ? value : 'transparent' }}
					/>
					{open && (
						<div className="absolute top-full left-0 mt-2 z-10 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl">
							<HexColorPicker color={isValidHex(value) ? value : '#000000'} onChange={onChange} />
						</div>
					)}
				</div>
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="flex-1 px-2 py-1.5 font-mono text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
					placeholder="#000000"
				/>
			</div>
		</div>
	)
}
