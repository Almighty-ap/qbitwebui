import type { QBittorrentPreferences } from '../../types/preferences'
import { Select, Checkbox } from '../ui'
import { useI18n } from '../../i18n'

interface Props {
	preferences: Partial<QBittorrentPreferences>
	onChange: (updates: Partial<QBittorrentPreferences>) => void
}

const ENCRYPTION_OPTIONS = [
	{ value: 0, label: 'settings.bt.allowEncryption' },
	{ value: 1, label: 'settings.bt.requireEncryption' },
	{ value: 2, label: 'settings.bt.disableEncryption' },
]

const RATIO_ACTION_OPTIONS = [
	{ value: 0, label: 'settings.bt.stopTorrent' },
	{ value: 1, label: 'settings.bt.removeTorrent' },
	{ value: 2, label: 'settings.bt.removeTorrentFiles' },
	{ value: 3, label: 'settings.bt.enableSuperSeeding' },
]

export function BitTorrentTab({ preferences, onChange }: Props) {
	const { t } = useI18n()
	const tr = <T extends string | number>(opts: { value: T; label: string }[]) =>
		opts.map((o) => ({ ...o, label: t(o.label) }))
	return (
		<div className="space-y-4">
			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					Privacy
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Checkbox label={t('settings.dht')} checked={preferences.dht ?? true} onChange={(v) => onChange({ dht: v })} />
					<Checkbox label={t('settings.pex')} checked={preferences.pex ?? true} onChange={(v) => onChange({ pex: v })} />
					<Checkbox
						label={t('settings.lsd')}
						checked={preferences.lsd ?? true}
						onChange={(v) => onChange({ lsd: v })}
					/>
					<Checkbox
						label={t('settings.anonymousMode')}
						checked={preferences.anonymous_mode ?? false}
						onChange={(v) => onChange({ anonymous_mode: v })}
					/>
				</div>
				<div className="flex items-center gap-3 mt-2">
					<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
						{t('settings.encryption')}
					</label>
					<Select
						value={preferences.encryption ?? 0}
						onChange={(v) => onChange({ encryption: v as number })}
						options={tr(ENCRYPTION_OPTIONS)}
						minWidth="140px"
					/>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div className="flex items-center gap-3">
				<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
					{t('settings.bt.maxActiveChecking')}
				</label>
				<input
					type="number"
					value={preferences.max_active_checking_torrents ?? 1}
					onChange={(e) => onChange({ max_active_checking_torrents: parseInt(e.target.value) || 1 })}
					className="w-16 px-2 py-1 rounded border text-xs font-mono"
					style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
				/>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center gap-2 mb-2">
					<Checkbox
						label=""
						checked={preferences.queueing_enabled ?? true}
						onChange={(v) => onChange({ queueing_enabled: v })}
					/>
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.queueing')}
					</span>
				</div>

				{preferences.queueing_enabled && (
					<div className="pl-6 space-y-2">
						<div className="grid grid-cols-3 gap-3">
							<div className="flex items-center gap-2">
								<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
									{t('settings.bt.maxActiveDl')}
								</label>
								<input
									type="number"
									value={preferences.max_active_downloads ?? 3}
									onChange={(e) => onChange({ max_active_downloads: parseInt(e.target.value) || 3 })}
									className="w-14 px-2 py-1 rounded border text-xs font-mono"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
									{t('settings.bt.maxActiveUl')}
								</label>
								<input
									type="number"
									value={preferences.max_active_uploads ?? 3}
									onChange={(e) => onChange({ max_active_uploads: parseInt(e.target.value) || 3 })}
									className="w-14 px-2 py-1 rounded border text-xs font-mono"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
								/>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
									{t('settings.bt.maxTotal')}
								</label>
								<input
									type="number"
									value={preferences.max_active_torrents ?? 5}
									onChange={(e) => onChange({ max_active_torrents: parseInt(e.target.value) || 5 })}
									className="w-14 px-2 py-1 rounded border text-xs font-mono"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
								/>
							</div>
						</div>

						<div className="p-2 rounded space-y-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
							<Checkbox
								label={t('settings.doNotCountSlow')}
								checked={preferences.dont_count_slow_torrents ?? false}
								onChange={(v) => onChange({ dont_count_slow_torrents: v })}
							/>
							{preferences.dont_count_slow_torrents && (
								<div className="flex items-center gap-4 pl-6">
									<div className="flex items-center gap-1">
										<label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
											{t('common.dl')}
										</label>
										<input
											type="number"
											value={preferences.slow_torrent_dl_rate_threshold ?? 2}
											onChange={(e) => onChange({ slow_torrent_dl_rate_threshold: parseInt(e.target.value) || 2 })}
											className="w-12 px-1 py-0.5 rounded border text-xs font-mono"
											style={{
												backgroundColor: 'var(--bg-secondary)',
												borderColor: 'var(--border)',
												color: 'var(--text-primary)',
											}}
										/>
										<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
											KiB/s
										</span>
									</div>
									<div className="flex items-center gap-1">
										<label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
											{t('common.ul')}
										</label>
										<input
											type="number"
											value={preferences.slow_torrent_ul_rate_threshold ?? 2}
											onChange={(e) => onChange({ slow_torrent_ul_rate_threshold: parseInt(e.target.value) || 2 })}
											className="w-12 px-1 py-0.5 rounded border text-xs font-mono"
											style={{
												backgroundColor: 'var(--bg-secondary)',
												borderColor: 'var(--border)',
												color: 'var(--text-primary)',
											}}
										/>
										<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
											KiB/s
										</span>
									</div>
									<div className="flex items-center gap-1">
										<label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
											{t('settings.bt.inactive')}
										</label>
										<input
											type="number"
											value={preferences.slow_torrent_inactive_timer ?? 60}
											onChange={(e) => onChange({ slow_torrent_inactive_timer: parseInt(e.target.value) || 60 })}
											className="w-14 px-1 py-0.5 rounded border text-xs font-mono"
											style={{
												backgroundColor: 'var(--bg-secondary)',
												borderColor: 'var(--border)',
												color: 'var(--text-primary)',
											}}
										/>
										<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
											{t('settings.bt.sec')}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.seedingLimits')}
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.whenRatioReached')}
							checked={preferences.max_ratio_enabled ?? false}
							onChange={(v) => onChange({ max_ratio_enabled: v })}
						/>
						<input
							type="number"
							step="0.1"
							value={preferences.max_ratio ?? 1}
							onChange={(e) => onChange({ max_ratio: parseFloat(e.target.value) || 1 })}
							disabled={!preferences.max_ratio_enabled}
							className="w-16 px-2 py-1 rounded border text-xs font-mono disabled:opacity-50"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.whenSeedingTimeReached')}
							checked={preferences.max_seeding_time_enabled ?? false}
							onChange={(v) => onChange({ max_seeding_time_enabled: v })}
						/>
						<input
							type="number"
							value={preferences.max_seeding_time ?? 1440}
							onChange={(e) => onChange({ max_seeding_time: parseInt(e.target.value) || 1440 })}
							disabled={!preferences.max_seeding_time_enabled}
							className="w-20 px-2 py-1 rounded border text-xs font-mono disabled:opacity-50"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
						<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
							{t('settings.bt.min')}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.bt.whenInactiveSeeding')}
							checked={preferences.max_inactive_seeding_time_enabled ?? false}
							onChange={(v) => onChange({ max_inactive_seeding_time_enabled: v })}
						/>
						<input
							type="number"
							value={preferences.max_inactive_seeding_time ?? 1440}
							onChange={(e) => onChange({ max_inactive_seeding_time: parseInt(e.target.value) || 1440 })}
							disabled={!preferences.max_inactive_seeding_time_enabled}
							className="w-20 px-2 py-1 rounded border text-xs font-mono disabled:opacity-50"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
						<span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
							{t('settings.bt.min')}
						</span>
					</div>
					{(preferences.max_ratio_enabled ||
						preferences.max_seeding_time_enabled ||
						preferences.max_inactive_seeding_time_enabled) && (
						<div className="flex items-center gap-2 pl-6">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.then')}
							</span>
							<Select
								value={preferences.max_ratio_act ?? 0}
								onChange={(v) => onChange({ max_ratio_act: v as number })}
								options={tr(RATIO_ACTION_OPTIONS)}
								minWidth="180px"
							/>
						</div>
					)}
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center gap-2 mb-2">
					<Checkbox
						label=""
						checked={preferences.add_trackers_enabled ?? false}
						onChange={(v) => onChange({ add_trackers_enabled: v })}
					/>
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.bt.autoAppendTrackers')}
					</span>
				</div>
				{preferences.add_trackers_enabled && (
					<textarea
						value={preferences.add_trackers ?? ''}
						onChange={(e) => onChange({ add_trackers: e.target.value })}
						rows={3}
						placeholder={t('settings.bt.trackerUrlPerLine')}
						className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
						style={{
							backgroundColor: 'var(--bg-tertiary)',
							borderColor: 'var(--border)',
							color: 'var(--text-primary)',
						}}
					/>
				)}
			</div>

			<div>
				<div className="flex items-center gap-2 mb-2">
					<Checkbox
						label=""
						checked={preferences.add_trackers_from_url_enabled ?? false}
						onChange={(v) => onChange({ add_trackers_from_url_enabled: v })}
					/>
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.bt.autoAppendTrackersUrl')}
					</span>
				</div>
				{preferences.add_trackers_from_url_enabled && (
					<div className="space-y-2 pl-6">
						<input
							type="url"
							value={preferences.add_trackers_url ?? ''}
							onChange={(e) => onChange({ add_trackers_url: e.target.value })}
							placeholder="https://..."
							className="w-full px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
						<div>
							<label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>
								{t('settings.bt.fetchedTrackers')}
							</label>
							<textarea
								value={preferences.add_trackers_url_list ?? ''}
								readOnly
								rows={2}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
								style={{
									backgroundColor: 'var(--bg-secondary)',
									borderColor: 'var(--border)',
									color: 'var(--text-muted)',
								}}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
