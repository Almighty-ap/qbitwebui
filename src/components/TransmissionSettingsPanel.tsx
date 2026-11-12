import { useEffect, useMemo, useState } from 'react'
import { Settings, X } from 'lucide-react'
import type { Instance } from '../api/instances'
import { getTransmissionSession, setTransmissionSession } from '../api/transmission'
import { Checkbox } from './ui/Checkbox'
import { useI18n } from '../i18n'

type Session = Record<string, unknown>

interface FieldDef {
	key: string
	type: 'text' | 'number' | 'bool' | 'time' | 'select'
	labelKey: string
	options?: { value: string; labelKey: string }[]
}

interface GroupDef {
	titleKey: string
	fields: FieldDef[]
}

const DAY_OPTIONS = [
	{ value: '127', labelKey: 'transmission.dayAll' },
	{ value: '62', labelKey: 'transmission.dayWeekdays' },
	{ value: '65', labelKey: 'transmission.dayWeekend' },
]

const GROUPS: GroupDef[] = [
	{
		titleKey: 'transmission.groupPaths',
		fields: [
			{ key: 'download-dir', type: 'text', labelKey: 'transmission.downloadDir' },
			{ key: 'incomplete-dir-enabled', type: 'bool', labelKey: 'transmission.incompleteEnabled' },
			{ key: 'incomplete-dir', type: 'text', labelKey: 'transmission.incompleteDir' },
			{ key: 'start-added-torrents', type: 'bool', labelKey: 'transmission.startAdded' },
			{ key: 'rename-partial-files', type: 'bool', labelKey: 'transmission.renamePartial' },
			{ key: 'trash-original-torrent-files', type: 'bool', labelKey: 'transmission.trashOriginal' },
		],
	},
	{
		titleKey: 'transmission.groupSpeed',
		fields: [
			{ key: 'speed-limit-down-enabled', type: 'bool', labelKey: 'transmission.dlLimitEnabled' },
			{ key: 'speed-limit-down', type: 'number', labelKey: 'transmission.dlLimit' },
			{ key: 'speed-limit-up-enabled', type: 'bool', labelKey: 'transmission.upLimitEnabled' },
			{ key: 'speed-limit-up', type: 'number', labelKey: 'transmission.upLimit' },
			{ key: 'alt-speed-enabled', type: 'bool', labelKey: 'transmission.altSpeedEnabled' },
			{ key: 'alt-speed-down', type: 'number', labelKey: 'transmission.altDown' },
			{ key: 'alt-speed-up', type: 'number', labelKey: 'transmission.altUp' },
			{ key: 'alt-speed-time-enabled', type: 'bool', labelKey: 'transmission.altScheduleEnabled' },
			{ key: 'alt-speed-time-day', type: 'select', labelKey: 'transmission.altScheduleDay', options: DAY_OPTIONS },
			{ key: 'alt-speed-time-begin', type: 'time', labelKey: 'transmission.altScheduleBegin' },
			{ key: 'alt-speed-time-end', type: 'time', labelKey: 'transmission.altScheduleEnd' },
		],
	},
	{
		titleKey: 'transmission.groupPeers',
		fields: [
			{ key: 'peer-port', type: 'number', labelKey: 'transmission.peerPort' },
			{ key: 'peer-port-random-on-start', type: 'bool', labelKey: 'transmission.randomPort' },
			{ key: 'port-forwarding-enabled', type: 'bool', labelKey: 'transmission.portForwarding' },
			{ key: 'peer-limit-global', type: 'number', labelKey: 'transmission.peerLimitGlobal' },
			{ key: 'peer-limit-per-torrent', type: 'number', labelKey: 'transmission.peerLimitPerTorrent' },
			{ key: 'dht-enabled', type: 'bool', labelKey: 'transmission.dht' },
			{ key: 'pex-enabled', type: 'bool', labelKey: 'transmission.pex' },
			{ key: 'lpd-enabled', type: 'bool', labelKey: 'transmission.lpd' },
			{ key: 'utp-enabled', type: 'bool', labelKey: 'transmission.utp' },
			{
				key: 'encryption',
				type: 'select',
				labelKey: 'transmission.encryption',
				options: [
					{ value: 'required', labelKey: 'transmission.encryptionRequired' },
					{ value: 'preferred', labelKey: 'transmission.encryptionPreferred' },
					{ value: 'tolerated', labelKey: 'transmission.encryptionTolerated' },
				],
			},
		],
	},
	{
		titleKey: 'transmission.groupQueue',
		fields: [
			{ key: 'download-queue-enabled', type: 'bool', labelKey: 'transmission.dlQueueEnabled' },
			{ key: 'download-queue-size', type: 'number', labelKey: 'transmission.dlQueueSize' },
			{ key: 'seed-queue-enabled', type: 'bool', labelKey: 'transmission.seedQueueEnabled' },
			{ key: 'seed-queue-size', type: 'number', labelKey: 'transmission.seedQueueSize' },
			{ key: 'queue-stalled-enabled', type: 'bool', labelKey: 'transmission.stalledEnabled' },
			{ key: 'queue-stalled-minutes', type: 'number', labelKey: 'transmission.stalledMinutes' },
		],
	},
	{
		titleKey: 'transmission.groupSeeding',
		fields: [
			{ key: 'seedRatioLimited', type: 'bool', labelKey: 'transmission.ratioLimited' },
			{ key: 'seedRatioLimit', type: 'number', labelKey: 'transmission.ratioLimit' },
			{ key: 'idle-seeding-limit-enabled', type: 'bool', labelKey: 'transmission.idleLimitEnabled' },
			{ key: 'idle-seeding-limit', type: 'number', labelKey: 'transmission.idleLimit' },
		],
	},
	{
		titleKey: 'transmission.groupBlocklist',
		fields: [
			{ key: 'blocklist-enabled', type: 'bool', labelKey: 'transmission.blocklistEnabled' },
			{ key: 'blocklist-url', type: 'text', labelKey: 'transmission.blocklistUrl' },
		],
	},
]

function minutesToTime(value: unknown): string {
	const minutes = typeof value === 'number' ? value : 0
	const h = Math.floor(minutes / 60) % 24
	const m = minutes % 60
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function timeToMinutes(value: string): number {
	const [h, m] = value.split(':').map((v) => Number(v))
	if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
	return h * 60 + m
}

const inputStyle = {
	backgroundColor: 'var(--bg-tertiary)',
	borderColor: 'var(--border)',
	color: 'var(--text-primary)',
} as const

export function TransmissionSettingsPanel({ instance, onClose }: { instance: Instance; onClose: () => void }) {
	const { t } = useI18n()
	const [session, setSession] = useState<Session | null>(null)
	const [draft, setDraft] = useState<Session>({})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		let cancelled = false
		setLoading(true)
		getTransmissionSession(instance.id)
			.then((data) => {
				if (cancelled) return
				setSession(data)
				setDraft(data)
				setError('')
			})
			.catch((e) => {
				if (cancelled) return
				setError(e instanceof Error ? e.message : t('settings.failedToLoad'))
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [instance.id, t])

	const changes = useMemo(() => {
		if (!session) return {}
		const out: Session = {}
		for (const key of Object.keys(draft)) {
			if (JSON.stringify(draft[key]) !== JSON.stringify(session[key])) out[key] = draft[key]
		}
		return out
	}, [draft, session])

	const hasChanges = Object.keys(changes).length > 0

	function setValue(key: string, value: unknown) {
		setDraft((prev) => ({ ...prev, [key]: value }))
	}

	async function handleSave() {
		if (!hasChanges) return onClose()
		setSaving(true)
		try {
			await setTransmissionSession(instance.id, changes)
			onClose()
		} catch (e) {
			setError(e instanceof Error ? e.message : t('settings.failedToSave'))
		} finally {
			setSaving(false)
		}
	}

	return (
		<div
			className="mb-4 rounded-lg border overflow-hidden"
			style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
		>
			<div
				className="flex items-center justify-between px-4 py-3 border-b"
				style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-tertiary)' }}
			>
				<div className="flex items-center gap-3">
					<Settings className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
					<span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
						{t('transmission.title')}
					</span>
					<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
						— {instance.label}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
						style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
					>
						{saving ? t('common.loading') : t('common.save')}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded hover:bg-[var(--bg-primary)]"
						style={{ color: 'var(--text-muted)' }}
					>
						<X className="w-4 h-4" strokeWidth={2} />
					</button>
				</div>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-12">
					<div
						className="w-5 h-5 border-2 rounded-full animate-spin"
						style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
					/>
				</div>
			) : error ? (
				<div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--error)' }}>
					{error}
				</div>
			) : (
				<div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
					{GROUPS.map((group) => (
						<div key={group.titleKey}>
							<div
								className="text-[10px] font-semibold uppercase tracking-wider mb-3"
								style={{ color: 'var(--text-muted)' }}
							>
								{t(group.titleKey)}
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
								{group.fields.map((field) => (
									<div key={field.key} className="flex items-center justify-between gap-3">
										<span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
											{t(field.labelKey)}
										</span>
										{field.type === 'bool' && (
											<Checkbox
												checked={!!draft[field.key]}
												onChange={(v) => setValue(field.key, v)}
												label=""
											/>
										)}
										{field.type === 'text' && (
											<input
												type="text"
												value={typeof draft[field.key] === 'string' ? (draft[field.key] as string) : ''}
												onChange={(e) => setValue(field.key, e.target.value)}
												className="w-56 px-2 py-1 rounded border text-xs"
												style={inputStyle}
											/>
										)}
										{field.type === 'number' && (
											<input
												type="number"
												value={typeof draft[field.key] === 'number' ? (draft[field.key] as number) : 0}
												onChange={(e) => setValue(field.key, Number(e.target.value))}
												className="w-24 px-2 py-1 rounded border text-xs"
												style={inputStyle}
											/>
										)}
										{field.type === 'time' && (
											<input
												type="time"
												value={minutesToTime(draft[field.key])}
												onChange={(e) => setValue(field.key, timeToMinutes(e.target.value))}
												className="px-2 py-1 rounded border text-xs"
												style={inputStyle}
											/>
										)}
										{field.type === 'select' && (
											<select
												value={String(draft[field.key] ?? '')}
												onChange={(e) => setValue(field.key, e.target.value)}
												className="w-40 px-2 py-1 rounded border text-xs"
												style={inputStyle}
											>
												{(field.options ?? []).map((opt) => (
													<option key={opt.value} value={opt.value}>
														{t(opt.labelKey)}
													</option>
												))}
											</select>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
