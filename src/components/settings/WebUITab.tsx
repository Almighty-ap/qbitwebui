import { AlertTriangle } from 'lucide-react'
import type { QBittorrentPreferences } from '../../types/preferences'
import { Toggle, Select } from '../ui'
import { useI18n } from '../../i18n'

interface Props {
	preferences: Partial<QBittorrentPreferences>
	onChange: (updates: Partial<QBittorrentPreferences>) => void
}

const DYNDNS_SERVICES = [
	{ value: 0, label: 'DynDNS' },
	{ value: 1, label: 'NO-IP' },
]

export function WebUITab({ preferences, onChange }: Props) {
	const { t } = useI18n()
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
					{t('settings.webuiWarning')}
				</p>
			</div>

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.webuiTab.webUserInterface')}
				</div>
				<div className="grid grid-cols-3 gap-2 mb-2">
					<div className="col-span-2">
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.webUiAddress')}
						</label>
						<input
							type="text"
							value={preferences.web_ui_address ?? '*'}
							onChange={(e) => onChange({ web_ui_address: e.target.value })}
							placeholder={t('settings.webuiTab.allAddresses')}
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
							{t('settings.port')}
						</label>
						<input
							type="number"
							value={preferences.web_ui_port ?? 8080}
							onChange={(e) => onChange({ web_ui_port: parseInt(e.target.value) || 8080 })}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
						{t('settings.webuiTab.upnpWebUi')}
					</span>
					<Toggle checked={preferences.web_ui_upnp ?? false} onChange={(v) => onChange({ web_ui_upnp: v })} />
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						HTTPS
					</span>
					<Toggle checked={preferences.use_https ?? false} onChange={(v) => onChange({ use_https: v })} />
				</div>
				{preferences.use_https && (
					<div className="space-y-2 pl-4">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.certificatePath')}
							</label>
							<input
								type="text"
								value={preferences.web_ui_https_cert_path ?? ''}
								onChange={(e) => onChange({ web_ui_https_cert_path: e.target.value })}
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
								{t('settings.webuiTab.privateKeyPath')}
							</label>
							<input
								type="text"
								value={preferences.web_ui_https_key_path ?? ''}
								onChange={(e) => onChange({ web_ui_https_key_path: e.target.value })}
								className="w-full px-2 py-1.5 rounded border text-xs"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.authentication')}
				</div>
				<div className="space-y-2">
					<div>
						<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.conn.username')}
						</label>
						<input
							type="text"
							value={preferences.web_ui_username ?? ''}
							onChange={(e) => onChange({ web_ui_username: e.target.value })}
							className="w-full px-2 py-1.5 rounded border text-xs"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.webuiTab.bypassLocalhost')}
						</span>
						<Toggle
							checked={preferences.bypass_local_auth ?? false}
							onChange={(v) => onChange({ bypass_local_auth: v })}
						/>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.webuiTab.bypassSubnets')}
						</span>
						<Toggle
							checked={preferences.bypass_auth_subnet_whitelist_enabled ?? false}
							onChange={(v) => onChange({ bypass_auth_subnet_whitelist_enabled: v })}
						/>
					</div>
					{preferences.bypass_auth_subnet_whitelist_enabled && (
						<textarea
							value={preferences.bypass_auth_subnet_whitelist ?? ''}
							onChange={(e) => onChange({ bypass_auth_subnet_whitelist: e.target.value })}
							placeholder={t('settings.webuiTab.subnetHint')}
							rows={2}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					)}
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
							{t('settings.webuiTab.maxAuthFails')}
							</label>
							<input
								type="number"
								value={preferences.web_ui_max_auth_fail_count ?? 5}
								onChange={(e) => onChange({ web_ui_max_auth_fail_count: parseInt(e.target.value) || 5 })}
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
							{t('settings.webuiTab.banDuration')}
							</label>
							<input
								type="number"
								value={preferences.web_ui_ban_duration ?? 3600}
								onChange={(e) => onChange({ web_ui_ban_duration: parseInt(e.target.value) || 3600 })}
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
							{t('settings.webuiTab.sessionTimeout')}
							</label>
							<input
								type="number"
								value={preferences.web_ui_session_timeout ?? 3600}
								onChange={(e) => onChange({ web_ui_session_timeout: parseInt(e.target.value) || 3600 })}
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

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
					{t('settings.security')}
				</div>
				<div className="space-y-2">
					<div className="grid grid-cols-2 gap-x-4 gap-y-1">
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.webuiTab.clickjacking')}
							</span>
							<Toggle
								checked={preferences.web_ui_clickjacking_protection_enabled ?? true}
								onChange={(v) => onChange({ web_ui_clickjacking_protection_enabled: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.webuiTab.csrf')}
							</span>
							<Toggle
								checked={preferences.web_ui_csrf_protection_enabled ?? true}
								onChange={(v) => onChange({ web_ui_csrf_protection_enabled: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.webuiTab.secureCookie')}
							</span>
							<Toggle
								checked={preferences.web_ui_secure_cookie_enabled ?? true}
								onChange={(v) => onChange({ web_ui_secure_cookie_enabled: v })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
								{t('settings.webuiTab.hostHeaderValidation')}
							</span>
							<Toggle
								checked={preferences.web_ui_host_header_validation_enabled ?? true}
								onChange={(v) => onChange({ web_ui_host_header_validation_enabled: v })}
							/>
						</div>
					</div>
					{preferences.web_ui_host_header_validation_enabled && (
						<div className="pl-4">
							<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
								{t('settings.webuiTab.serverDomains')}
							</label>
							<textarea
								value={preferences.web_ui_domain_list ?? ''}
								onChange={(e) => onChange({ web_ui_domain_list: e.target.value })}
								placeholder={t('settings.webuiTab.domainHint')}
								rows={2}
								className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
								style={{
									backgroundColor: 'var(--bg-tertiary)',
									borderColor: 'var(--border)',
									color: 'var(--text-primary)',
								}}
							/>
						</div>
					)}
					<div className="flex items-center justify-between">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.webuiTab.customHeaders')}
						</span>
						<Toggle
							checked={preferences.web_ui_use_custom_http_headers_enabled ?? false}
							onChange={(v) => onChange({ web_ui_use_custom_http_headers_enabled: v })}
						/>
					</div>
					{preferences.web_ui_use_custom_http_headers_enabled && (
						<textarea
							value={preferences.web_ui_custom_http_headers ?? ''}
							onChange={(e) => onChange({ web_ui_custom_http_headers: e.target.value })}
							placeholder={t('settings.webuiTab.headerHint')}
							rows={2}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					)}
					<div className="flex items-center justify-between">
						<span className="text-xs" style={{ color: 'var(--text-muted)' }}>
							{t('settings.webuiTab.reverseProxy')}
						</span>
						<Toggle
							checked={preferences.web_ui_reverse_proxy_enabled ?? false}
							onChange={(v) => onChange({ web_ui_reverse_proxy_enabled: v })}
						/>
					</div>
					{preferences.web_ui_reverse_proxy_enabled && (
						<textarea
							value={preferences.web_ui_reverse_proxies_list ?? ''}
							onChange={(e) => onChange({ web_ui_reverse_proxies_list: e.target.value })}
							placeholder={t('settings.webuiTab.trustedProxies')}
							rows={2}
							className="w-full px-2 py-1.5 rounded border text-xs font-mono resize-none"
							style={{
								backgroundColor: 'var(--bg-tertiary)',
								borderColor: 'var(--border)',
								color: 'var(--text-primary)',
							}}
						/>
					)}
				</div>
			</div>

			<div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.webuiTab.alternativeWebui')}
					</span>
					<Toggle
						checked={preferences.alternative_webui_enabled ?? false}
						onChange={(v) => onChange({ alternative_webui_enabled: v })}
					/>
				</div>
				{preferences.alternative_webui_enabled && (
					<input
						type="text"
						value={preferences.alternative_webui_path ?? ''}
						onChange={(e) => onChange({ alternative_webui_path: e.target.value })}
						placeholder={t('settings.webuiTab.filesLocation')}
						className="w-full px-2 py-1.5 rounded border text-xs"
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
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
						{t('settings.dyndns')}
					</span>
					<Toggle checked={preferences.dyndns_enabled ?? false} onChange={(v) => onChange({ dyndns_enabled: v })} />
				</div>
				{preferences.dyndns_enabled && (
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
									{t('settings.webuiTab.service')}
								</label>
								<Select
									value={preferences.dyndns_service ?? 0}
									onChange={(v) => onChange({ dyndns_service: v })}
									options={DYNDNS_SERVICES}
								/>
							</div>
							<div>
								<label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
									{t('settings.webuiTab.domain')}
								</label>
								<input
									type="text"
									value={preferences.dyndns_domain ?? ''}
									onChange={(e) => onChange({ dyndns_domain: e.target.value })}
									className="w-full px-2 py-1.5 rounded border text-xs"
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
									{t('settings.conn.username')}
								</label>
								<input
									type="text"
									value={preferences.dyndns_username ?? ''}
									onChange={(e) => onChange({ dyndns_username: e.target.value })}
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
									{t('auth.password')}
								</label>
								<input
									type="password"
									value={preferences.dyndns_password ?? ''}
									onChange={(e) => onChange({ dyndns_password: e.target.value })}
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
				)}
			</div>
		</div>
	)
}
