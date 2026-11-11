import { AlertTriangle } from 'lucide-react'
import type { QBittorrentPreferences } from '../../types/preferences'
import { Toggle, Select } from '../ui'
import { useI18n } from '../../i18n'

interface Props {
	preferences: Partial<QBittorrentPreferences>
	onChange: (updates: Partial<QBittorrentPreferences>) => void
}

const RESUME_DATA_STORAGE_TYPES = [
	{ value: 'Legacy', label: 'settings.adv.fastresumeFiles' },
	{ value: 'SQLite', label: 'settings.adv.sqliteDatabase' },
]

const TORRENT_CONTENT_REMOVE_OPTIONS = [
	{ value: 'Delete', label: 'settings.adv.deletePermanently' },
	{ value: 'MoveToTrash', label: 'settings.adv.moveToTrash' },
]

const DISK_IO_TYPES = [
	{ value: 0, label: 'settings.adv.diskIoDefault' },
	{ value: 1, label: 'settings.adv.memoryMapped' },
	{ value: 2, label: 'settings.adv.posixCompliant' },
]

const DISK_IO_MODES = [
	{ value: 0, label: 'settings.adv.disableOsCache' },
	{ value: 1, label: 'settings.adv.enableOsCache' },
]

const UTP_TCP_MIXED_MODES = [
	{ value: 0, label: 'settings.adv.preferTcp' },
	{ value: 1, label: 'settings.adv.peerProportional' },
]

const UPLOAD_SLOTS_BEHAVIORS = [
	{ value: 0, label: 'settings.adv.fixedSlots' },
	{ value: 1, label: 'settings.adv.uploadRateBased' },
]

const UPLOAD_CHOKING_ALGORITHMS = [
	{ value: 0, label: 'settings.adv.roundRobin' },
	{ value: 1, label: 'settings.adv.fastestUpload' },
	{ value: 2, label: 'settings.adv.antiLeech' },
]

export function AdvancedTab({ preferences, onChange }: Props) {
	const { t } = useI18n()
	const tr = <T extends string | number>(opts: { value: T; label: string }[]) =>
		opts.map((o) => ({ ...o, label: t(o.label) }))
	return (
		<div className="space-y-4">
			<div
				className="px-3 py-2 rounded flex items-start gap-2"
				style={{
					backgroundColor: 'color-mix(in srgb, var(--warning) 15%, transparent)',
					border: '1px solid var(--warning)',
				}}
			>
				<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} strokeWidth={1.5} />
				<p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
					{t('settings.advancedWarning')}
				</p>
			</div>

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					qBittorrent
				</div>
				<div className="space-y-2">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.resumeDataStorage')}
							</label>
							<Select
								value={preferences.resume_data_storage_type ?? 'SQLite'}
								onChange={(v) => onChange({ resume_data_storage_type: v })}
								options={tr(RESUME_DATA_STORAGE_TYPES)}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.contentRemoveMode')}
							</label>
							<Select
								value={preferences.torrent_content_remove_option ?? 'Delete'}
								onChange={(v) => onChange({ torrent_content_remove_option: v })}
								options={tr(TORRENT_CONTENT_REMOVE_OPTIONS)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.memoryLimit')}
							</label>
							<input
								type="number"
								value={preferences.memory_working_set_limit ?? 512}
								onChange={(e) => onChange({ memory_working_set_limit: parseInt(e.target.value) || 512 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.networkInterface')}
							</label>
							<input
								type="text"
								value={preferences.current_network_interface ?? ''}
								onChange={(e) => onChange({ current_network_interface: e.target.value })}
								placeholder={t('common.any')}
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
								{t('settings.adv.ipToBind')}
							</label>
							<input
								type="text"
								value={preferences.current_interface_address ?? ''}
								onChange={(e) => onChange({ current_interface_address: e.target.value })}
								placeholder={t('common.all')}
								className="w-full px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.resumeInterval')}
							</label>
							<input
								type="number"
								value={preferences.save_resume_data_interval ?? 60}
								onChange={(e) => onChange({ save_resume_data_interval: parseInt(e.target.value) || 60 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.statsInterval')}
							</label>
							<input
								type="number"
								value={preferences.save_statistics_interval ?? 15}
								onChange={(e) => onChange({ save_statistics_interval: parseInt(e.target.value) || 15 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.torrentSize')}
							</label>
							<input
								type="number"
								value={Math.round((preferences.torrent_file_size_limit ?? 104857600) / 1024 / 1024)}
								onChange={(e) => onChange({ torrent_file_size_limit: (parseInt(e.target.value) || 100) * 1024 * 1024 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.refreshMs')}
							</label>
							<input
								type="number"
								value={preferences.refresh_interval ?? 1500}
								onChange={(e) => onChange({ refresh_interval: parseInt(e.target.value) || 1500 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.instanceName')}
						</label>
						<input
							type="text"
							value={preferences.app_instance_name ?? ''}
							onChange={(e) => onChange({ app_instance_name: e.target.value })}
							placeholder="qBittorrent"
							className="w-full px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1">
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.confirmRecheck')}
							</span>
							<Toggle
								checked={preferences.confirm_torrent_recheck ?? true}
								onChange={(v) => onChange({ confirm_torrent_recheck: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.recheckOnCompletion')}
							</span>
							<Toggle
								checked={preferences.recheck_completed_torrents ?? false}
								onChange={(v) => onChange({ recheck_completed_torrents: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.resolvePeerCountries')}
							</span>
							<Toggle
								checked={preferences.resolve_peer_countries ?? true}
								onChange={(v) => onChange({ resolve_peer_countries: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.reannounceIpChange')}
							</span>
							<Toggle
								checked={preferences.reannounce_when_address_changed ?? false}
								onChange={(v) => onChange({ reannounce_when_address_changed: v })}
							/>
						</div>
					</div>
					<div className="p-2 rounded space-y-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.embeddedTracker')}
							</span>
							<Toggle
								checked={preferences.enable_embedded_tracker ?? false}
								onChange={(v) => onChange({ enable_embedded_tracker: v })}
							/>
						</div>
						{preferences.enable_embedded_tracker && (
							<div className="flex items-center gap-4 pl-4">
								<div className="flex items-center gap-2">
									<label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
										{t('settings.port')}
									</label>
									<input
										type="number"
										value={preferences.embedded_tracker_port ?? 9000}
										onChange={(e) => onChange({ embedded_tracker_port: parseInt(e.target.value) || 9000 })}
										className="w-16 px-2 py-1 rounded border text-xs font-mono"
										style={{
											backgroundColor: 'var(--bg-secondary)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
									/>
								</div>
								<div className="flex items-center justify-between flex-1">
									<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
										{t('settings.adv.portForwarding')}
									</span>
									<Toggle
										checked={preferences.embedded_tracker_port_forwarding ?? false}
										onChange={(v) => onChange({ embedded_tracker_port_forwarding: v })}
									/>
								</div>
							</div>
						)}
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.ignoreSslErrors')}
						</span>
						<Toggle
							checked={preferences.ignore_ssl_errors ?? false}
							onChange={(v) => onChange({ ignore_ssl_errors: v })}
						/>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.pythonPath')}
						</label>
						<input
							type="text"
							value={preferences.python_executable_path ?? ''}
							onChange={(e) => onChange({ python_executable_path: e.target.value })}
							placeholder={t('settings.adv.autoDetect')}
							className="w-full px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					libtorrent
				</div>
				<div className="space-y-2">
					<div className="grid grid-cols-4 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.bdecodeDepth')}
							</label>
							<input
								type="number"
								value={preferences.bdecode_depth_limit ?? 100}
								onChange={(e) => onChange({ bdecode_depth_limit: parseInt(e.target.value) || 100 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.bdecodeTokens')}
							</label>
							<input
								type="number"
								value={preferences.bdecode_token_limit ?? 10000000}
								onChange={(e) => onChange({ bdecode_token_limit: parseInt(e.target.value) || 10000000 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.asyncIoThreads')}
							</label>
							<input
								type="number"
								value={preferences.async_io_threads ?? 10}
								onChange={(e) => onChange({ async_io_threads: parseInt(e.target.value) || 10 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.hashingThreads')}
							</label>
							<input
								type="number"
								value={preferences.hashing_threads ?? 1}
								onChange={(e) => onChange({ hashing_threads: parseInt(e.target.value) || 1 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.filePoolSize')}
							</label>
							<input
								type="number"
								value={preferences.file_pool_size ?? 100}
								onChange={(e) => onChange({ file_pool_size: parseInt(e.target.value) || 100 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.checkMem')}
							</label>
							<input
								type="number"
								value={preferences.checking_memory_use ?? 32}
								onChange={(e) => onChange({ checking_memory_use: parseInt(e.target.value) || 32 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.diskQueue')}
							</label>
							<input
								type="number"
								value={preferences.disk_queue_size ?? 1024}
								onChange={(e) => onChange({ disk_queue_size: parseInt(e.target.value) || 1024 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.diskIoType')}
							</label>
							<Select
								value={preferences.disk_io_type ?? 0}
								onChange={(v) => onChange({ disk_io_type: v })}
								options={tr(DISK_IO_TYPES)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.diskIoReadMode')}
							</label>
							<Select
								value={preferences.disk_io_read_mode ?? 0}
								onChange={(v) => onChange({ disk_io_read_mode: v })}
								options={tr(DISK_IO_MODES)}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.diskIoWriteMode')}
							</label>
							<Select
								value={preferences.disk_io_write_mode ?? 0}
								onChange={(v) => onChange({ disk_io_write_mode: v })}
								options={tr(DISK_IO_MODES)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1">
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.pieceExtentAffinity')}
							</span>
							<Toggle
								checked={preferences.enable_piece_extent_affinity ?? false}
								onChange={(v) => onChange({ enable_piece_extent_affinity: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.uploadPieceSuggestions')}
							</span>
							<Toggle
								checked={preferences.enable_upload_suggestions ?? false}
								onChange={(v) => onChange({ enable_upload_suggestions: v })}
							/>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.sendBuffer')}
							</label>
							<input
								type="number"
								value={preferences.send_buffer_watermark ?? 500}
								onChange={(e) => onChange({ send_buffer_watermark: parseInt(e.target.value) || 500 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.lowWatermark')}
							</label>
							<input
								type="number"
								value={preferences.send_buffer_low_watermark ?? 10}
								onChange={(e) => onChange({ send_buffer_low_watermark: parseInt(e.target.value) || 10 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.watermarkFactor')}
							</label>
							<input
								type="number"
								value={preferences.send_buffer_watermark_factor ?? 50}
								onChange={(e) => onChange({ send_buffer_watermark_factor: parseInt(e.target.value) || 50 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.connectionsPerSec')}
							</label>
							<input
								type="number"
								value={preferences.connection_speed ?? 30}
								onChange={(e) => onChange({ connection_speed: parseInt(e.target.value) || 30 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.sendBuffer')}
							</label>
							<input
								type="number"
								value={preferences.socket_send_buffer_size ?? 0}
								onChange={(e) => onChange({ socket_send_buffer_size: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.recvBuffer')}
							</label>
							<input
								type="number"
								value={preferences.socket_receive_buffer_size ?? 0}
								onChange={(e) => onChange({ socket_receive_buffer_size: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.socketBacklog')}
							</label>
							<input
								type="number"
								value={preferences.socket_backlog_size ?? 30}
								onChange={(e) => onChange({ socket_backlog_size: parseInt(e.target.value) || 30 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.upnpLease')}
							</label>
							<input
								type="number"
								value={preferences.upnp_lease_duration ?? 0}
								onChange={(e) => onChange({ upnp_lease_duration: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.outPortsMin')}
							</label>
							<input
								type="number"
								value={preferences.outgoing_ports_min ?? 0}
								onChange={(e) => onChange({ outgoing_ports_min: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.outPortsMax')}
							</label>
							<input
								type="number"
								value={preferences.outgoing_ports_max ?? 0}
								onChange={(e) => onChange({ outgoing_ports_max: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.peerTos')}
							</label>
							<input
								type="number"
								value={preferences.peer_tos ?? 4}
								onChange={(e) => onChange({ peer_tos: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.utpTcpMixedMode')}
							</label>
							<Select
								value={preferences.utp_tcp_mixed_mode ?? 0}
								onChange={(v) => onChange({ utp_tcp_mixed_mode: v })}
								options={tr(UTP_TCP_MIXED_MODES)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1">
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.idnSupport')}
							</span>
							<Toggle
								checked={preferences.idn_support_enabled ?? false}
								onChange={(v) => onChange({ idn_support_enabled: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.multiConnSameIp')}
							</span>
							<Toggle
								checked={preferences.enable_multi_connections_from_same_ip ?? false}
								onChange={(v) => onChange({ enable_multi_connections_from_same_ip: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.validateHttpsCert')}
							</span>
							<Toggle
								checked={preferences.validate_https_tracker_certificate ?? true}
								onChange={(v) => onChange({ validate_https_tracker_certificate: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.ssrfMitigation')}
							</span>
							<Toggle
								checked={preferences.ssrf_mitigation ?? true}
								onChange={(v) => onChange({ ssrf_mitigation: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.blockPrivilegedPorts')}
							</span>
							<Toggle
								checked={preferences.block_peers_on_privileged_ports ?? false}
								onChange={(v) => onChange({ block_peers_on_privileged_ports: v })}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.uploadSlotsBehavior')}
							</label>
							<Select
								value={preferences.upload_slots_behavior ?? 0}
								onChange={(v) => onChange({ upload_slots_behavior: v })}
								options={tr(UPLOAD_SLOTS_BEHAVIORS)}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.uploadChokingAlgorithm')}
							</label>
							<Select
								value={preferences.upload_choking_algorithm ?? 1}
								onChange={(v) => onChange({ upload_choking_algorithm: v })}
								options={tr(UPLOAD_CHOKING_ALGORITHMS)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1">
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.announceAllTrackersTier')}
							</span>
							<Toggle
								checked={preferences.announce_to_all_tiers ?? true}
								onChange={(v) => onChange({ announce_to_all_tiers: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.announceAllTiers')}
							</span>
							<Toggle
								checked={preferences.announce_to_all_trackers ?? false}
								onChange={(v) => onChange({ announce_to_all_trackers: v })}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.announceIp')}
							</label>
							<input
								type="text"
								value={preferences.announce_ip ?? ''}
								onChange={(e) => onChange({ announce_ip: e.target.value })}
								placeholder={t('settings.adv.restartRequired')}
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
								{t('settings.adv.announcePort')}
							</label>
							<input
								type="number"
								value={preferences.announce_port ?? 0}
								onChange={(e) => onChange({ announce_port: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.maxHttpAnnounces')}
							</label>
							<input
								type="number"
								value={preferences.max_concurrent_http_announces ?? 50}
								onChange={(e) => onChange({ max_concurrent_http_announces: parseInt(e.target.value) || 50 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.stopTrackerTimeout')}
							</label>
							<input
								type="number"
								value={preferences.stop_tracker_timeout ?? 2}
								onChange={(e) => onChange({ stop_tracker_timeout: parseInt(e.target.value) || 0 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.requestQueue')}
							</label>
							<input
								type="number"
								value={preferences.request_queue_size ?? 500}
								onChange={(e) => onChange({ request_queue_size: parseInt(e.target.value) || 500 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.peerTurnover')}
							</label>
							<input
								type="number"
								value={preferences.peer_turnover ?? 4}
								onChange={(e) => onChange({ peer_turnover: parseInt(e.target.value) || 4 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.turnoverCutoff')}
							</label>
							<input
								type="number"
								value={preferences.peer_turnover_cutoff ?? 90}
								onChange={(e) => onChange({ peer_turnover_cutoff: parseInt(e.target.value) || 90 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.adv.turnoverInterval')}
							</label>
							<input
								type="number"
								value={preferences.peer_turnover_interval ?? 300}
								onChange={(e) => onChange({ peer_turnover_interval: parseInt(e.target.value) || 300 })}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.dhtBootstrapNodes')}
						</label>
						<input
							type="text"
							value={
								preferences.dht_bootstrap_nodes ??
								'dht.libtorrent.org:25401, dht.transmissionbt.com:6881, router.bittorrent.com:6881'
							}
							onChange={(e) => onChange({ dht_bootstrap_nodes: e.target.value })}
							className="w-full px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					I2P
				</div>
				<div className="grid grid-cols-4 gap-2">
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.i2pInboundQty')}
						</label>
						<input
							type="number"
							value={preferences.i2p_inbound_quantity ?? 3}
							onChange={(e) => onChange({ i2p_inbound_quantity: parseInt(e.target.value) || 3 })}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.i2pOutboundQty')}
						</label>
						<input
							type="number"
							value={preferences.i2p_outbound_quantity ?? 3}
							onChange={(e) => onChange({ i2p_outbound_quantity: parseInt(e.target.value) || 3 })}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.i2pInboundLen')}
						</label>
						<input
							type="number"
							value={preferences.i2p_inbound_length ?? 3}
							onChange={(e) => onChange({ i2p_inbound_length: parseInt(e.target.value) || 3 })}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.adv.i2pOutboundLen')}
						</label>
						<input
							type="number"
							value={preferences.i2p_outbound_length ?? 3}
							onChange={(e) => onChange({ i2p_outbound_length: parseInt(e.target.value) || 3 })}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
