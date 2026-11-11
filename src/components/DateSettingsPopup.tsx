import { useEffect, useRef } from 'react'
import { Checkbox } from './ui'
import { useI18n } from '../i18n'

interface Props {
	anchor: HTMLElement
	hideTime: boolean
	onSave: (hideTime: boolean) => void
	onClose: () => void
}

export function DateSettingsPopup({ anchor, hideTime, onSave, onClose }: Props) {
	const { t } = useI18n()
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

	const rect = anchor.getBoundingClientRect()

	return (
		<div
			ref={ref}
			className="rounded-lg border shadow-xl p-3"
			onClick={(e) => e.stopPropagation()}
			style={{
				position: 'fixed',
				left: Math.min(rect.left, window.innerWidth - 150),
				top: rect.bottom + 4,
				zIndex: 100,
				backgroundColor: 'var(--bg-secondary)',
				borderColor: 'var(--border)',
			}}
		>
			<Checkbox
				label={t('popup.hideAddedTime')}
				checked={hideTime}
				onChange={(checked) => {
					onSave(checked)
					onClose()
				}}
			/>
		</div>
	)
}
