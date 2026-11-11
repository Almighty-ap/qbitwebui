import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

interface Props {
	anchor: HTMLElement
	threshold: number
	onSave: (threshold: number) => void
	onClose: () => void
}

export function RatioThresholdPopup({ anchor, threshold, onSave, onClose }: Props) {
	const { t } = useI18n()
	const [value, setValue] = useState(threshold.toString())
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose()
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('mousedown', handleClick)
		document.addEventListener('keydown', handleKey)
		return () => {
			document.removeEventListener('mousedown', handleClick)
			document.removeEventListener('keydown', handleKey)
		}
	}, [onClose])

	function handleSave() {
		const parsed = parseFloat(value)
		if (!isNaN(parsed) && parsed >= 0) {
			onSave(parsed)
		}
		onClose()
	}

	const rect = anchor.getBoundingClientRect()

	return (
		<div
			ref={ref}
			className="rounded-lg border shadow-xl p-3"
			onClick={(e) => e.stopPropagation()}
			style={{
				position: 'fixed',
				left: Math.min(rect.left, window.innerWidth - 200),
				top: rect.bottom + 4,
				zIndex: 100,
				backgroundColor: 'var(--bg-secondary)',
				borderColor: 'var(--border)',
			}}
		>
			<div className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
				{t('popup.ratioThresholds')}
			</div>
			<div className="flex items-center justify-center gap-2 mb-3">
				<span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a6e3a1' }} />
				<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
					≥
				</span>
				<input
					type="text"
					inputMode="decimal"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					className="w-16 px-2 py-1.5 rounded text-xs font-mono border outline-none text-center"
					style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
				/>
				<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
					&lt;
				</span>
				<span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f38ba8' }} />
			</div>
			<button
				onClick={handleSave}
				className="w-full py-1.5 rounded text-xs font-medium"
				style={{ backgroundColor: 'var(--accent)', color: 'white' }}
			>
				{t('common.save')}
			</button>
		</div>
	)
}
