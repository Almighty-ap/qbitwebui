import type { QBittorrentPreferences } from '../../types/preferences'
import { Toggle, Select, Checkbox } from '../ui'
import { useI18n } from '../../i18n'

interface Props {
	preferences: Partial<QBittorrentPreferences>
	onChange: (updates: Partial<QBittorrentPreferences>) => void
}

const CONTENT_LAYOUT_OPTIONS = [
	{ value: 'Original', key: 'settings.original' },
	{ value: 'Subfolder', key: 'settings.createSubfolder' },
	{ value: 'NoSubfolder', key: 'settings.dontCreateSubfolder' },
]

const STOP_CONDITION_OPTIONS = [
	{ value: 'None', key: 'common.none' },
	{ value: 'MetadataReceived', key: 'settings.metadataReceived' },
	{ value: 'FilesChecked', key: 'settings.filesChecked' },
]

export function DownloadsTab({ preferences, onChange }: Props) {
	const { t } = useI18n()
	const layoutOptions = CONTENT_LAYOUT_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) }))
	const stopOptions = STOP_CONDITION_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) }))
	return (
		<div className="space-y-4">
			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.whenAddingTorrent')}
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.contentLayout')}
						</label>
						<Select
							value={preferences.torrent_content_layout ?? 'Original'}
							onChange={(v) => onChange({ torrent_content_layout: v as 'Original' | 'Subfolder' | 'NoSubfolder' })}
							options={layoutOptions}
							minWidth="160px"
						/>
					</div>
					<div className="flex items-center gap-3">
						<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.stopCondition')}
						</label>
						<Select
							value={preferences.torrent_stop_condition ?? 'None'}
							onChange={(v) => onChange({ torrent_stop_condition: v as 'None' | 'MetadataReceived' | 'FilesChecked' })}
							options={stopOptions}
							minWidth="160px"
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<Checkbox
							label={t('settings.addToTopQueue')}
							checked={preferences.add_to_top_of_queue ?? false}
							onChange={(v) => onChange({ add_to_top_of_queue: v })}
						/>
						<Checkbox
							label={t('settings.dontStartAuto')}
							checked={preferences.add_stopped_enabled ?? false}
							onChange={(v) => onChange({ add_stopped_enabled: v })}
						/>
						<Checkbox
							label={t('settings.mergeTrackers')}
							checked={preferences.merge_trackers ?? false}
							onChange={(v) => onChange({ merge_trackers: v })}
						/>
						<Checkbox
							label={t('settings.deleteTorrentFiles')}
							checked={(preferences.auto_delete_mode ?? 0) > 0}
							onChange={(v) => onChange({ auto_delete_mode: v ? 1 : 0 })}
						/>
					</div>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.preallocation')}
				</div>
				<div className="grid grid-cols-2 gap-2">
					<Checkbox
						label={t('settings.preallocateDisk')}
						checked={preferences.preallocate_all ?? false}
						onChange={(v) => onChange({ preallocate_all: v })}
					/>
					<Checkbox
						label={t('settings.appendExtension')}
						checked={preferences.incomplete_files_ext ?? false}
						onChange={(v) => onChange({ incomplete_files_ext: v })}
					/>
					<Checkbox
						label={t('settings.keepUnselected')}
						checked={preferences.use_unwanted_folder ?? false}
						onChange={(v) => onChange({ use_unwanted_folder: v })}
					/>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.savingManagement')}
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.defaultTmm')}
						</span>
						<div className="flex items-center gap-2">
							<span
								className="text-xs"
								style={{ color: preferences.auto_tmm_enabled ? 'var(--text-muted)' : 'var(--text-primary)' }}
							>
								{t('common.manual')}
							</span>
							<Toggle
								checked={preferences.auto_tmm_enabled ?? false}
								onChange={(v) => onChange({ auto_tmm_enabled: v })}
							/>
							<span
								className="text-xs"
								style={{ color: preferences.auto_tmm_enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}
							>
								{t('common.auto')}
							</span>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1">
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.relocateCategoryChange')}
							</span>
							<Toggle
								checked={preferences.torrent_changed_tmm_enabled ?? false}
								onChange={(v) => onChange({ torrent_changed_tmm_enabled: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.relocateDefaultPathChange')}
							</span>
							<Toggle
								checked={preferences.save_path_changed_tmm_enabled ?? false}
								onChange={(v) => onChange({ save_path_changed_tmm_enabled: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.relocateCategoryPathChange')}
							</span>
							<Toggle
								checked={preferences.category_changed_tmm_enabled ?? false}
								onChange={(v) => onChange({ category_changed_tmm_enabled: v })}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<Checkbox
							label={t('settings.useSubcategories')}
							checked={preferences.use_subcategories ?? false}
							onChange={(v) => onChange({ use_subcategories: v })}
						/>
						<Checkbox
							label={t('settings.categoryPathsManualMode')}
							checked={preferences.use_category_paths_in_manual_mode ?? false}
							onChange={(v) => onChange({ use_category_paths_in_manual_mode: v })}
						/>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.defaultSavePath')}
						</label>
						<input
							type="text"
							value={preferences.save_path ?? ''}
							onChange={(e) => onChange({ save_path: e.target.value })}
							className="w-full px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.keepIncompleteIn')}
							checked={preferences.temp_path_enabled ?? false}
							onChange={(v) => onChange({ temp_path_enabled: v })}
						/>
						{preferences.temp_path_enabled && (
							<input
								type="text"
								value={preferences.temp_path ?? ''}
								onChange={(e) => onChange({ temp_path: e.target.value })}
								className="flex-1 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.copyTorrentTo')}
							checked={preferences.export_dir !== undefined && preferences.export_dir !== ''}
							onChange={(v) => onChange({ export_dir: v ? preferences.export_dir || '' : '' })}
						/>
						{preferences.export_dir !== undefined && preferences.export_dir !== '' && (
							<input
								type="text"
								value={preferences.export_dir}
								onChange={(e) => onChange({ export_dir: e.target.value })}
								className="flex-1 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.copyFinishedTorrentTo')}
							checked={preferences.export_dir_fin !== undefined && preferences.export_dir_fin !== ''}
							onChange={(v) => onChange({ export_dir_fin: v ? preferences.export_dir_fin || '' : '' })}
						/>
						{preferences.export_dir_fin !== undefined && preferences.export_dir_fin !== '' && (
							<input
								type="text"
								value={preferences.export_dir_fin}
								onChange={(e) => onChange({ export_dir_fin: e.target.value })}
								className="flex-1 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						)}
					</div>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center gap-2 mb-2">
					<Checkbox
						label=""
						checked={preferences.excluded_file_names_enabled ?? false}
						onChange={(v) => onChange({ excluded_file_names_enabled: v })}
					/>
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.excludedFileNames')}
					</span>
				</div>
				{preferences.excluded_file_names_enabled && (
					<textarea
						value={preferences.excluded_file_names ?? ''}
						onChange={(e) => onChange({ excluded_file_names: e.target.value })}
						rows={3}
						placeholder="*.exe&#10;*.scr"
						className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
						style={{
							backgroundColor: 'var(--bg-tertiary)',
							borderColor: 'var(--border)',
							color: 'var(--text-primary)',
						}}
					/>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center gap-2 mb-2">
					<Checkbox
						label=""
						checked={preferences.mail_notification_enabled ?? false}
						onChange={(v) => onChange({ mail_notification_enabled: v })}
					/>
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.emailNotification')}
					</span>
				</div>
				{preferences.mail_notification_enabled && (
					<div className="space-y-2 pl-6">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
									{t('settings.from')}
								</label>
								<input
									type="text"
									value={preferences.mail_notification_sender ?? ''}
									onChange={(e) => onChange({ mail_notification_sender: e.target.value })}
									className="w-full px-2 py-1.5 rounded border text-xs"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
								/>
							</div>
							<div>
								<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
									{t('settings.to')}
								</label>
								<input
									type="email"
									value={preferences.mail_notification_email ?? ''}
									onChange={(e) => onChange({ mail_notification_email: e.target.value })}
									className="w-full px-2 py-1.5 rounded border text-xs"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<div className="flex-1">
								<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
									{t('settings.smtpServer')}
								</label>
								<input
									type="text"
									value={preferences.mail_notification_smtp ?? ''}
									onChange={(e) => onChange({ mail_notification_smtp: e.target.value })}
									className="w-full px-2 py-1.5 rounded border text-xs"
									style={{
										backgroundColor: 'var(--bg-tertiary)',
										borderColor: 'var(--border)',
										color: 'var(--text-primary)',
									}}
								/>
							</div>
							<Checkbox
								label="SSL"
								checked={preferences.mail_notification_ssl_enabled ?? false}
								onChange={(v) => onChange({ mail_notification_ssl_enabled: v })}
							/>
						</div>
						<div className="p-2 rounded space-y-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
							<Checkbox
								label={t('settings.authentication')}
								checked={preferences.mail_notification_auth_enabled ?? false}
								onChange={(v) => onChange({ mail_notification_auth_enabled: v })}
							/>
							{preferences.mail_notification_auth_enabled && (
								<div className="grid grid-cols-2 gap-2 pl-6">
									<input
										type="text"
										value={preferences.mail_notification_username ?? ''}
										onChange={(e) => onChange({ mail_notification_username: e.target.value })}
										placeholder={t('auth.username')}
										className="px-2 py-1.5 rounded border text-xs"
										style={{
											backgroundColor: 'var(--bg-secondary)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
									/>
									<input
										type="password"
										value={preferences.mail_notification_password ?? ''}
										onChange={(e) => onChange({ mail_notification_password: e.target.value })}
										placeholder={t('auth.password')}
										className="px-2 py-1.5 rounded border text-xs"
										style={{
											backgroundColor: 'var(--bg-secondary)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
									/>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.runExternalProgram')}
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.onTorrentAdded')}
							checked={preferences.autorun_on_torrent_added_enabled ?? false}
							onChange={(v) => onChange({ autorun_on_torrent_added_enabled: v })}
						/>
						{preferences.autorun_on_torrent_added_enabled && (
							<input
								type="text"
								value={preferences.autorun_on_torrent_added_program ?? ''}
								onChange={(e) => onChange({ autorun_on_torrent_added_program: e.target.value })}
								className="flex-1 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.onTorrentFinished')}
							checked={preferences.autorun_enabled ?? false}
							onChange={(v) => onChange({ autorun_enabled: v })}
						/>
						{preferences.autorun_enabled && (
							<input
								type="text"
								value={preferences.autorun_program ?? ''}
								onChange={(e) => onChange({ autorun_program: e.target.value })}
								className="flex-1 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						)}
					</div>
					<p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
						{t('settings.autorunParamsHint')}
					</p>
				</div>
			</div>
		</div>
	)
}
