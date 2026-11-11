import type { QBittorrentPreferences } from '../../types/preferences'
import { Select, Checkbox } from '../ui'
import { useI18n } from '../../i18n'

interface Props {
	preferences: Partial<QBittorrentPreferences>
	onChange: (updates: Partial<QBittorrentPreferences>) => void
}

const PROTOCOL_OPTIONS = [
	{ value: 0, label: 'TCP and µTP' },
	{ value: 1, label: 'TCP' },
	{ value: 2, label: 'µTP' },
]

const PROXY_TYPES = [
	{ value: 0, label: 'common.none' },
	{ value: 1, label: 'HTTP' },
	{ value: 2, label: 'SOCKS5' },
	{ value: 3, label: 'settings.conn.httpWithAuth' },
	{ value: 4, label: 'settings.conn.socks5WithAuth' },
	{ value: 5, label: 'SOCKS4' },
]

export function ConnectionTab({ preferences, onChange }: Props) {
	const { t } = useI18n()
	const tr = <T extends string | number>(opts: { value: T; label: string }[]) =>
		opts.map((o) => ({ ...o, label: t(o.label) }))
	const proxyEnabled = (preferences.proxy_type ?? 0) > 0

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<label className="text-xs w-36 shrink-0" style={{ color: 'var(--text-muted)' }}>
					{t('settings.conn.peerProtocol')}
				</label>
				<Select
					value={preferences.bittorrent_protocol ?? 0}
					onChange={(v) => onChange({ bittorrent_protocol: v as number })}
					options={tr(PROTOCOL_OPTIONS)}
				/>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.listeningPort')}
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="flex items-center gap-2">
						<label className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
							{t('settings.port')}
						</label>
						<input
							type="number"
							value={preferences.listen_port ?? 6881}
							onChange={(e) => onChange({ listen_port: parseInt(e.target.value) || 6881 })}
							className="w-24 px-2 py-1.5 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
						<button
							type="button"
							onClick={() =>
								onChange({ random_port: true, listen_port: Math.floor(Math.random() * (65535 - 49152) + 49152) })
							}
							className="px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-muted)',
							}}
						>
							{t('settings.conn.random')}
						</button>
					</div>
					<Checkbox
						label={t('settings.conn.useUpnp')}
						checked={preferences.upnp ?? true}
						onChange={(v) => onChange({ upnp: v })}
					/>
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.connectionLimits')}
				</div>
				<div className="grid grid-cols-2 gap-x-6 gap-y-2">
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.globalMaxConnections')}
							checked={(preferences.max_connec ?? 500) > 0}
							onChange={(v) => onChange({ max_connec: v ? 500 : 0 })}
						/>
						<input
							type="number"
							value={preferences.max_connec ?? 500}
							onChange={(e) => onChange({ max_connec: parseInt(e.target.value) || 0 })}
							className="w-16 px-2 py-1 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.conn.perTorrent')}
							checked={(preferences.max_connec_per_torrent ?? 100) > 0}
							onChange={(v) => onChange({ max_connec_per_torrent: v ? 100 : 0 })}
						/>
						<input
							type="number"
							value={preferences.max_connec_per_torrent ?? 100}
							onChange={(e) => onChange({ max_connec_per_torrent: parseInt(e.target.value) || 0 })}
							className="w-16 px-2 py-1 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.globalMaxUploadSlots')}
							checked={(preferences.max_uploads ?? 8) > 0}
							onChange={(v) => onChange({ max_uploads: v ? 8 : 0 })}
						/>
						<input
							type="number"
							value={preferences.max_uploads ?? 8}
							onChange={(e) => onChange({ max_uploads: parseInt(e.target.value) || 0 })}
							className="w-16 px-2 py-1 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.conn.perTorrent')}
							checked={(preferences.max_uploads_per_torrent ?? 4) > 0}
							onChange={(v) => onChange({ max_uploads_per_torrent: v ? 4 : 0 })}
						/>
						<input
							type="number"
							value={preferences.max_uploads_per_torrent ?? 4}
							onChange={(e) => onChange({ max_uploads_per_torrent: parseInt(e.target.value) || 0 })}
							className="w-16 px-2 py-1 rounded border text-xs font-mono"
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
				<div className="flex items-center gap-2 mb-2">
					<Checkbox
						label=""
						checked={preferences.i2p_enabled ?? false}
						onChange={(v) => onChange({ i2p_enabled: v })}
					/>
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.conn.i2pExperimental')}
					</span>
				</div>
				{preferences.i2p_enabled && (
					<div className="flex items-center gap-4 pl-6">
						<div className="flex items-center gap-2">
							<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.conn.host')}
							</label>
							<input
								type="text"
								value={preferences.i2p_address ?? '127.0.0.1'}
								onChange={(e) => onChange({ i2p_address: e.target.value })}
								className="w-28 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<div className="flex items-center gap-2">
							<label className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.port')}
							</label>
							<input
								type="number"
								value={preferences.i2p_port ?? 7656}
								onChange={(e) => onChange({ i2p_port: parseInt(e.target.value) || 7656 })}
								className="w-20 px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
						<Checkbox
							label={t('settings.conn.mixedMode')}
							checked={preferences.i2p_mixed_mode ?? false}
							onChange={(v) => onChange({ i2p_mixed_mode: v })}
						/>
					</div>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.proxyServer')}
				</div>
				<div className="flex items-center gap-3 mb-3">
					<Select
						value={preferences.proxy_type ?? 0}
						onChange={(v) => onChange({ proxy_type: v as number })}
						options={tr(PROXY_TYPES)}
						minWidth="140px"
					/>
					{proxyEnabled && (
						<>
							<input
								type="text"
								value={preferences.proxy_ip ?? ''}
								onChange={(e) => onChange({ proxy_ip: e.target.value })}
								placeholder={t('settings.conn.host')}
								className="flex-1 px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
							<input
								type="number"
								value={preferences.proxy_port ?? 8080}
								onChange={(e) => onChange({ proxy_port: parseInt(e.target.value) || 8080 })}
								placeholder={t('settings.port')}
								className="w-20 px-2 py-1.5 rounded border text-xs font-mono"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</>
					)}
				</div>

				{proxyEnabled && (
					<div className="space-y-2 pl-2">
						<Checkbox
							label={t('settings.conn.hostnameLookup')}
							checked={preferences.proxy_hostname_lookup ?? false}
							onChange={(v) => onChange({ proxy_hostname_lookup: v })}
						/>
						<div className="p-2 rounded space-y-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
							<Checkbox
								label={t('settings.authentication')}
								checked={preferences.proxy_auth_enabled ?? false}
								onChange={(v) => onChange({ proxy_auth_enabled: v })}
							/>
							{preferences.proxy_auth_enabled && (
								<div className="flex items-center gap-3 pl-6">
									<input
										type="text"
										value={preferences.proxy_username ?? ''}
										onChange={(e) => onChange({ proxy_username: e.target.value })}
										placeholder={t('settings.conn.username')}
										className="w-32 px-2 py-1.5 rounded border text-xs"
										style={{
											backgroundColor: 'var(--bg-secondary)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
									/>
									<input
										type="password"
										value={preferences.proxy_password ?? ''}
										onChange={(e) => onChange({ proxy_password: e.target.value })}
										placeholder={t('auth.password')}
										className="w-32 px-2 py-1.5 rounded border text-xs"
										style={{
											backgroundColor: 'var(--bg-secondary)',
											borderColor: 'var(--border)',
											color: 'var(--text-primary)',
										}}
									/>
								</div>
							)}
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Checkbox
								label={t('settings.conn.useForBitTorrent')}
								checked={preferences.proxy_bittorrent ?? true}
								onChange={(v) => onChange({ proxy_bittorrent: v })}
							/>
							{preferences.proxy_bittorrent && (
								<Checkbox
									label={t('settings.conn.useForPeerConnections')}
									checked={preferences.proxy_peer_connections ?? false}
									onChange={(v) => onChange({ proxy_peer_connections: v })}
								/>
							)}
							<Checkbox
								label={t('settings.conn.useForRss')}
								checked={preferences.proxy_rss ?? true}
								onChange={(v) => onChange({ proxy_rss: v })}
							/>
							<Checkbox
								label={t('settings.conn.useForGeneral')}
								checked={preferences.proxy_misc ?? true}
								onChange={(v) => onChange({ proxy_misc: v })}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.conn.ipFiltering')}
				</div>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Checkbox
							label={t('settings.conn.filterPath')}
							checked={preferences.ip_filter_enabled ?? false}
							onChange={(v) => onChange({ ip_filter_enabled: v })}
						/>
						<input
							type="text"
							value={preferences.ip_filter_path ?? ''}
							onChange={(e) => onChange({ ip_filter_path: e.target.value })}
							disabled={!preferences.ip_filter_enabled}
							placeholder=".dat, .p2p, .p2b"
							className="flex-1 px-2 py-1.5 rounded border text-xs disabled:opacity-50"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<Checkbox
						label={t('settings.conn.applyToTrackers')}
						checked={preferences.ip_filter_trackers ?? false}
						onChange={(v) => onChange({ ip_filter_trackers: v })}
					/>
					<div>
						<label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
							{t('settings.conn.bannedIps')}
						</label>
						<textarea
							value={preferences.banned_IPs ?? ''}
							onChange={(e) => onChange({ banned_IPs: e.target.value })}
							rows={3}
							placeholder={t('settings.conn.onePerLine')}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
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
