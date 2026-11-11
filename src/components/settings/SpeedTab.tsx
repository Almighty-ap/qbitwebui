import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
import type { QBittorrentPreferences } from '../../types/preferences'
import { Toggle, Checkbox, Select } from '../ui'
import { useI18n } from '../../i18n'

const SCHEDULER_DAYS = [
	{ value: 0, label: 'settings.speed.everyDay' },
	{ value: 1, label: 'settings.speed.weekdays' },
	{ value: 2, label: 'settings.speed.weekend' },
	{ value: 3, label: 'settings.speed.monday' },
	{ value: 4, label: 'settings.speed.tuesday' },
	{ value: 5, label: 'settings.speed.wednesday' },
	{ value: 6, label: 'settings.speed.thursday' },
	{ value: 7, label: 'settings.speed.friday' },
	{ value: 8, label: 'settings.speed.saturday' },
	{ value: 9, label: 'settings.speed.sunday' },
]

interface Props {
	preferences: Partial<QBittorrentPreferences>
	onChange: (updates: Partial<QBittorrentPreferences>) => void
}

function bytesToKB(bytes: number | undefined): string {
	if (bytes === undefined) return '0'
	return bytes === 0 ? '0' : Math.round(bytes / 1024).toString()
}

function kbToBytes(kb: string): number {
	const val = parseInt(kb, 10)
	return isNaN(val) || val < 0 ? 0 : val * 1024
}

export function SpeedTab({ preferences, onChange }: Props) {
	const { t } = useI18n()
	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
					{t('torrents.zeroForUnlimited')}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<div
						className="text-[10px] font-semibold uppercase tracking-wider mb-2"
						style={{ color: 'var(--text-muted)' }}
					>
						{t('settings.globalRateLimits')}
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<ArrowDown className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={2} />
							<input
								type="text"
								inputMode="numeric"
								value={bytesToKB(preferences.dl_limit)}
								onChange={(e) => onChange({ dl_limit: kbToBytes(e.target.value) })}
								className="w-24 px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
							<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
								KiB/s
							</span>
						</div>
						<div className="flex items-center gap-2">
							<ArrowUp className="w-3 h-3 shrink-0" style={{ color: '#a6e3a1' }} strokeWidth={2} />
							<input
								type="text"
								inputMode="numeric"
								value={bytesToKB(preferences.up_limit)}
								onChange={(e) => onChange({ up_limit: kbToBytes(e.target.value) })}
								className="w-24 px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
							<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
								KiB/s
							</span>
						</div>
					</div>
				</div>

				<div>
					<div
						className="text-[10px] font-semibold uppercase tracking-wider mb-2"
						style={{ color: 'var(--text-muted)' }}
					>
						{t('settings.altRateLimits')}
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<ArrowDown className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={2} />
							<input
								type="text"
								inputMode="numeric"
								value={bytesToKB(preferences.alt_dl_limit)}
								onChange={(e) => onChange({ alt_dl_limit: kbToBytes(e.target.value) })}
								className="w-24 px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
							<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
								KiB/s
							</span>
						</div>
						<div className="flex items-center gap-2">
							<ArrowUp className="w-3 h-3 shrink-0" style={{ color: '#a6e3a1' }} strokeWidth={2} />
							<input
								type="text"
								inputMode="numeric"
								value={bytesToKB(preferences.alt_up_limit)}
								onChange={(e) => onChange({ alt_up_limit: kbToBytes(e.target.value) })}
								className="w-24 px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
							<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
								KiB/s
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<Clock
							className="w-3.5 h-3.5"
							style={{ color: preferences.scheduler_enabled ? 'var(--accent)' : 'var(--text-muted)' }}
							strokeWidth={1.5}
						/>
						<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
							{t('settings.speed.scheduleAlt')}
						</span>
					</div>
					<Toggle
						checked={preferences.scheduler_enabled ?? false}
						onChange={(v) => onChange({ scheduler_enabled: v })}
					/>
				</div>

				{preferences.scheduler_enabled && (
					<div className="flex items-center gap-4 pl-5">
						<div className="flex items-center gap-1">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.speed.from')}
							</span>
							<Select
								value={preferences.schedule_from_hour ?? 8}
								onChange={(v) => onChange({ schedule_from_hour: v })}
								options={Array.from({ length: 24 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }))}
								minWidth="50px"
							/>
							<span style={{ color: 'var(--text-muted)' }}>:</span>
							<Select
								value={preferences.schedule_from_min ?? 0}
								onChange={(v) => onChange({ schedule_from_min: v })}
								options={[0, 15, 30, 45].map((m) => ({ value: m, label: m.toString().padStart(2, '0') }))}
								minWidth="50px"
							/>
						</div>
						<div className="flex items-center gap-1">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.speed.to')}
							</span>
							<Select
								value={preferences.schedule_to_hour ?? 20}
								onChange={(v) => onChange({ schedule_to_hour: v })}
								options={Array.from({ length: 24 }, (_, i) => ({ value: i, label: i.toString().padStart(2, '0') }))}
								minWidth="50px"
							/>
							<span style={{ color: 'var(--text-muted)' }}>:</span>
							<Select
								value={preferences.schedule_to_min ?? 0}
								onChange={(v) => onChange({ schedule_to_min: v })}
								options={[0, 15, 30, 45].map((m) => ({ value: m, label: m.toString().padStart(2, '0') }))}
								minWidth="50px"
							/>
						</div>
						<Select
							value={preferences.scheduler_days ?? 0}
							onChange={(v) => onChange({ scheduler_days: v })}
							options={SCHEDULER_DAYS.map((d) => ({ ...d, label: t(d.label) }))}
							minWidth="100px"
						/>
					</div>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.rateLimitSettings')}
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Checkbox
						checked={preferences.limit_utp_rate ?? true}
						onChange={(v) => onChange({ limit_utp_rate: v })}
						label={t('settings.speed.applyUtp')}
					/>
					<Checkbox
						checked={preferences.limit_tcp_overhead ?? false}
						onChange={(v) => onChange({ limit_tcp_overhead: v })}
						label={t('settings.applyToTransport')}
					/>
					<Checkbox
						checked={preferences.limit_lan_peers ?? true}
						onChange={(v) => onChange({ limit_lan_peers: v })}
						label={t('settings.speed.applyLan')}
					/>
				</div>
			</div>
		</div>
	)
}
