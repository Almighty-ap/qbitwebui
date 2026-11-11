import type { CSSProperties } from 'react'
import type { SpeedLimitValues } from '../../utils/speedLimits'
import { useI18n } from '../../i18n'

interface Props {
	value: SpeedLimitValues
	onChange: (value: SpeedLimitValues) => void
	onSubmit: () => void
	onCancel?: () => void
	placeholders?: Partial<SpeedLimitValues>
	inputClassName: string
	inputStyle: CSSProperties
	labelClassName?: string
	autoFocus?: boolean
	touchFocus?: boolean
}

const FIELDS = [
	{ key: 'dl', label: 'torrents.dlLimitKiB' },
	{ key: 'up', label: 'torrents.upLimitKiB' },
] as const

export function SpeedLimitFields({
	value,
	onChange,
	onSubmit,
	onCancel,
	placeholders,
	inputClassName,
	inputStyle,
	labelClassName = 'text-[10px]',
	autoFocus,
	touchFocus,
}: Props) {
	const { t } = useI18n()
	return (
		<div className="grid grid-cols-2 gap-2">
			{FIELDS.map(({ key, label }, i) => (
				<label key={key} className="block min-w-0">
					<span className={`block mb-1 ${labelClassName}`} style={{ color: 'var(--text-muted)' }}>
						{t(label)}
					</span>
					<input
						type="number"
						min={0}
						inputMode="numeric"
						value={value[key]}
						placeholder={placeholders?.[key] ?? t('common.unlimited')}
						onChange={(e) => onChange({ ...value, [key]: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === 'Enter') onSubmit()
							if (e.key === 'Escape') onCancel?.()
						}}
						onTouchEnd={
							touchFocus
								? (e) => {
										e.stopPropagation()
										e.currentTarget.focus()
									}
								: undefined
						}
						autoFocus={autoFocus && i === 0}
						className={inputClassName}
						style={inputStyle}
					/>
				</label>
			))}
		</div>
	)
}
