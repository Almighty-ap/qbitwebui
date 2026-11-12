import type { Context } from 'hono'
import type { Instance } from '../db'
import { decrypt } from '../utils/crypto'
import { fetchWithTls } from '../utils/fetch'
import { log } from '../utils/logger'

/**
 * Transmission RPC client + qBittorrent-compatible facade.
 *
 * Uses the legacy bespoke protocol (4.0.x and earlier, also still supported by
 * 4.1.x), which is what the vast majority of deployed Transmission daemons
 * speak. 4.1 added JSON-RPC 2.0 with snake_case args; the legacy protocol keeps
 * working there but is deprecated.
 */

const SESSION_HEADER = 'X-Transmission-Session-Id'
const DEFAULT_RPC_TIMEOUT_MS = 15000

export interface TransmissionInstance {
	url: string
	qbt_username: string | null
	qbt_password_encrypted: string | null
	skip_auth: number
}

interface RpcEnvelope<T> {
	result: string
	arguments?: T
}

const sessionIds = new Map<string, string>()

export function rpcEndpoint(base: string): string {
	const trimmed = base.trim().replace(/\/+$/, '')
	if (/\/transmission\/rpc$/i.test(trimmed)) return trimmed
	if (/\/transmission$/i.test(trimmed)) return `${trimmed}/rpc`
	return `${trimmed}/transmission/rpc`
}

function authHeader(instance: TransmissionInstance): string | null {
	if (instance.skip_auth) return null
	if (!instance.qbt_username || !instance.qbt_password_encrypted) return null
	const password = decrypt(instance.qbt_password_encrypted)
	return `Basic ${Buffer.from(`${instance.qbt_username}:${password}`).toString('base64')}`
}

async function rpc<T>(
	cacheKey: string,
	instance: TransmissionInstance,
	method: string,
	args?: Record<string, unknown>,
	timeoutMs?: number
): Promise<T> {
	const endpoint = rpcEndpoint(instance.url)
	const headers = new Headers({ 'Content-Type': 'application/json' })
	const auth = authHeader(instance)
	if (auth) headers.set('Authorization', auth)

	const body = JSON.stringify(args ? { method, arguments: args } : { method })
	let attempt = 0

	for (;;) {
		const sid = sessionIds.get(cacheKey)
		if (sid) headers.set(SESSION_HEADER, sid)

		let res: Response
		try {
			res = await fetchWithTls(endpoint, {
				method: 'POST',
				headers,
				body,
				signal: AbortSignal.timeout(timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS),
			})
		} catch (e) {
			throw new Error(`Transmission connection failed: ${e instanceof Error ? e.message : 'unknown'}`)
		}

		if (res.status === 409 && attempt < 2) {
			const next = res.headers.get(SESSION_HEADER)
			if (next) sessionIds.set(cacheKey, next)
			attempt++
			continue
		}

		if (res.status === 401) throw new Error('Invalid credentials')
		if (res.status === 403) throw new Error('Forbidden')
		if (!res.ok) throw new Error(`Transmission HTTP ${res.status}`)

		const text = await res.text()
		let json: RpcEnvelope<T>
		try {
			json = JSON.parse(text) as RpcEnvelope<T>
		} catch {
			throw new Error('Transmission returned invalid JSON')
		}
		if (!json || typeof json !== 'object' || typeof json.result !== 'string') {
			throw new Error('Transmission returned an unexpected response')
		}
		if (json.result !== 'success' && json.result !== 'duplicate torrent') throw new Error(json.result)
		return (json.arguments ?? ({} as T)) as T
	}
}

export function clearTransmissionSession(cacheKey: string): void {
	sessionIds.delete(cacheKey)
	const id = Number(cacheKey.replace('instance:', ''))
	if (Number.isFinite(id)) statsCache.delete(id)
}

// ---------------------------------------------------------------------------
// Transmission wire types (legacy camelCase field names)
// ---------------------------------------------------------------------------

interface TrTracker {
	announce: string
	id: number
	scrape: string
	sitename?: string
	tier: number
}

interface TrTrackerStat {
	announce: string
	announceState?: number
	downloadCount?: number
	hasAnnounced?: boolean
	host?: string
	id: number
	lastAnnounceResult?: string
	lastAnnounceSucceeded?: boolean
	lastAnnounceTime?: number
	leecherCount?: number
	nextAnnounceTime?: number
	seederCount?: number
	sitename?: string
	tier: number
}

interface TrFile {
	name: string
	length: number
	bytesCompleted: number
	beginPiece?: number
	endPiece?: number
}

interface TrFileStat {
	bytesCompleted: number
	wanted: boolean
	priority: number
}

interface TrPeer {
	address: string
	clientName: string
	flagStr: string
	isIncoming: boolean
	isEncrypted: boolean
	isUTP?: boolean
	port: number
	progress: number
	rateToClient: number
	rateToPeer: number
	bytesToClient?: number
	bytesToPeer?: number
	peerIsChoked?: boolean
	peerIsInterested?: boolean
	clientIsChoked?: boolean
	clientIsInterested?: boolean
}

interface TrWebseed {
	url: string
	isDownloading?: boolean
	downloadBytesPerSecond?: number
}

interface TrTorrent {
	id: number
	hashString: string
	name: string
	status: number
	percentDone?: number
	percentComplete?: number
	metadataPercentComplete?: number
	rateDownload?: number
	rateUpload?: number
	totalSize?: number
	sizeWhenDone?: number
	leftUntilDone?: number
	uploadedEver?: number
	downloadedEver?: number
	uploadRatio?: number
	eta?: number
	addedDate?: number
	doneDate?: number
	activityDate?: number
	startDate?: number
	dateCreated?: number
	editDate?: number
	downloadDir?: string
	labels?: string[]
	trackers?: TrTracker[]
	trackerStats?: TrTrackerStat[]
	error?: number
	errorString?: string
	isStalled?: boolean
	isFinished?: boolean
	isPrivate?: boolean
	peersConnected?: number
	peersSendingToUs?: number
	peersGettingFromUs?: number
	secondsSeeding?: number
	secondsDownloading?: number
	downloadLimit?: number
	downloadLimited?: boolean
	uploadLimit?: number
	uploadLimited?: boolean
	bandwidthPriority?: number
	queuePosition?: number
	recheckProgress?: number
	peerLimit?: number
	maxConnectedPeers?: number
	honorsSessionLimits?: boolean
	sequentialDownload?: boolean
	comment?: string
	creator?: string
	magnetLink?: string
	pieceCount?: number
	pieceSize?: number
	fileCount?: number
	haveValid?: number
	haveUnchecked?: number
	desiredAvailable?: number
	corruptEver?: number
	primaryMimeType?: string
	torrentFile?: string
	webseedsSendingToUs?: number
	files?: TrFile[]
	fileStats?: TrFileStat[]
	wanted?: boolean[]
	priorities?: number[]
	peers?: TrPeer[]
	webseedsEx?: TrWebseed[]
}

interface TrStatsBlock {
	uploadedBytes?: number
	downloadedBytes?: number
	secondsActive?: number
	sessionCount?: number
}

interface TrSessionStats {
	activeTorrentCount?: number
	downloadSpeed?: number
	uploadSpeed?: number
	pausedTorrentCount?: number
	torrentCount?: number
	'cumulative-stats'?: TrStatsBlock
	'current-stats'?: TrStatsBlock
}

function cumulative(stats: TrSessionStats): TrStatsBlock {
	return stats['cumulative-stats'] ?? {}
}

function current(stats: TrSessionStats): TrStatsBlock {
	return stats['current-stats'] ?? {}
}

function freeSpaceBytes(res: { 'size-bytes'?: number; size_bytes?: number }): number {
	return res['size-bytes'] ?? res.size_bytes ?? 0
}

export interface TrSessionArgs {
	version?: string
	'rpc-version'?: number
	'rpc-version-semver'?: string
	'download-dir'?: string
	'incomplete-dir'?: string
	'incomplete-dir-enabled'?: boolean
	'speed-limit-down'?: number
	'speed-limit-down-enabled'?: boolean
	'speed-limit-up'?: number
	'speed-limit-up-enabled'?: boolean
	'alt-speed-down'?: number
	'alt-speed-up'?: number
	'alt-speed-enabled'?: boolean
	'alt-speed-time-enabled'?: boolean
	'alt-speed-time-begin'?: number
	'alt-speed-time-end'?: number
	'alt-speed-time-day'?: number
	'peer-port'?: number
	'peer-port-random-on-start'?: boolean
	'port-forwarding-enabled'?: boolean
	'dht-enabled'?: boolean
	'pex-enabled'?: boolean
	'lpd-enabled'?: boolean
	encryption?: string
	'download-queue-enabled'?: boolean
	'download-queue-size'?: number
	'seed-queue-enabled'?: boolean
	'seed-queue-size'?: number
	'queue-stalled-enabled'?: boolean
	'queue-stalled-minutes'?: number
	'peer-limit-global'?: number
	'peer-limit-per-torrent'?: number
	seedRatioLimit?: number
	seedRatioLimited?: boolean
	'idle-seeding-limit'?: number
	'idle-seeding-limit-enabled'?: boolean
	'start-added-torrents'?: boolean
	'trash-original-torrent-files'?: boolean
	'rename-partial-files'?: boolean
	'blocklist-enabled'?: boolean
	'blocklist-url'?: string
	'blocklist-size'?: number
	'cache-size-mb'?: number
	'utp-enabled'?: boolean
}

// ---------------------------------------------------------------------------
// Field sets
// ---------------------------------------------------------------------------

const LIST_FIELDS = [
	'id',
	'hashString',
	'name',
	'status',
	'percentDone',
	'rateDownload',
	'rateUpload',
	'totalSize',
	'sizeWhenDone',
	'leftUntilDone',
	'uploadedEver',
	'downloadedEver',
	'uploadRatio',
	'eta',
	'addedDate',
	'doneDate',
	'activityDate',
	'downloadDir',
	'labels',
	'trackers',
	'error',
	'errorString',
	'isStalled',
	'peersSendingToUs',
	'peersGettingFromUs',
	'secondsSeeding',
	'downloadLimit',
	'downloadLimited',
	'uploadLimit',
	'uploadLimited',
	'bandwidthPriority',
]

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const INFINITE_ETA = 8640000

function qbState(t: TrTorrent): string {
	const complete = t.percentDone !== undefined ? t.percentDone >= 1 : (t.leftUntilDone ?? 1) === 0
	if (t.error) return 'error'
	switch (t.status) {
		case 0:
			return complete ? 'pausedUP' : 'pausedDL'
		case 1:
		case 2:
			return complete ? 'checkingUP' : 'checkingDL'
		case 3:
			return 'queuedDL'
		case 4:
			return t.isStalled ? 'stalledDL' : 'downloading'
		case 5:
			return 'queuedUP'
		case 6:
			return t.isStalled ? 'stalledUP' : 'uploading'
		default:
			return 'unknown'
	}
}

function kbToBytes(value: number | undefined, limited: boolean | undefined): number {
	if (!limited || !value || value <= 0) return 0
	return Math.round(value * 1000)
}

function bytesToKb(value: number): number {
	if (!value || value <= 0) return 0
	return Math.round(value / 1000)
}

export interface QbTorrent {
	hash: string
	name: string
	size: number
	progress: number
	dlspeed: number
	upspeed: number
	dl_limit: number
	up_limit: number
	priority: number
	num_seeds: number
	num_leechs: number
	ratio: number
	eta: number
	state: string
	category: string
	tags: string
	added_on: number
	completion_on: number
	last_activity: number
	save_path: string
	download_path: string
	downloaded: number
	uploaded: number
	tracker: string
	seeding_time: number
}

export function toQbTorrent(t: TrTorrent): QbTorrent {
	const labels = t.labels ?? []
	const eta = t.eta ?? -1
	return {
		hash: t.hashString,
		name: t.name,
		size: t.sizeWhenDone ?? t.totalSize ?? 0,
		progress: t.percentDone ?? 0,
		dlspeed: t.rateDownload ?? 0,
		upspeed: t.rateUpload ?? 0,
		dl_limit: kbToBytes(t.downloadLimit, t.downloadLimited),
		up_limit: kbToBytes(t.uploadLimit, t.uploadLimited),
		priority: t.bandwidthPriority ?? 0,
		num_seeds: t.peersSendingToUs ?? 0,
		num_leechs: t.peersGettingFromUs ?? 0,
		ratio: t.uploadRatio ?? 0,
		eta: eta < 0 ? INFINITE_ETA : eta,
		state: qbState(t),
		category: labels[0] ?? '',
		tags: labels.join(', '),
		added_on: t.addedDate ?? 0,
		completion_on: t.doneDate ?? 0,
		last_activity: t.activityDate ?? 0,
		save_path: t.downloadDir ?? '',
		download_path: t.downloadDir ?? '',
		downloaded: t.downloadedEver ?? 0,
		uploaded: t.uploadedEver ?? 0,
		tracker: t.trackers?.[0]?.announce ?? '',
		seeding_time: t.secondsSeeding ?? 0,
	}
}

function matchesFilter(t: QbTorrent, filter: string): boolean {
	switch (filter) {
		case 'downloading':
			return ['downloading', 'metaDL', 'stalledDL', 'queuedDL', 'checkingDL', 'forcedDL', 'allocating'].includes(t.state)
		case 'seeding':
			return ['uploading', 'stalledUP', 'queuedUP', 'checkingUP', 'forcedUP'].includes(t.state)
		case 'completed':
			return t.progress >= 1
		case 'stopped':
			return ['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(t.state)
		case 'active':
			return t.dlspeed > 0 || t.upspeed > 0
		case 'inactive':
			return t.dlspeed === 0 && t.upspeed === 0
		case 'stalled':
			return t.state === 'stalledDL' || t.state === 'stalledUP'
		case 'errored':
			return t.state === 'error' || t.state === 'missingFiles'
		case 'resumed':
			return !['pausedUP', 'pausedDL', 'stoppedUP', 'stoppedDL'].includes(t.state)
		default:
			return true
	}
}

function trackerStatus(stat: TrTrackerStat): number {
	if (!stat.hasAnnounced) return 1
	if (stat.lastAnnounceSucceeded) return 2
	return 4
}

// ---------------------------------------------------------------------------
// RPC convenience wrappers
// ---------------------------------------------------------------------------

async function torrentGet(
	cacheKey: string,
	instance: TransmissionInstance,
	fields: string[],
	ids?: (string | number)[]
): Promise<TrTorrent[]> {
	const args: Record<string, unknown> = { fields }
	if (ids && ids.length) args.ids = ids
	const res = await rpc<{ torrents?: TrTorrent[] }>(cacheKey, instance, 'torrent-get', args)
	return res.torrents ?? []
}

async function torrentSet(
	cacheKey: string,
	instance: TransmissionInstance,
	ids: string[],
	args: Record<string, unknown>
): Promise<void> {
	await rpc(cacheKey, instance, 'torrent-set', { ...args, ids })
}

async function getLabels(
	cacheKey: string,
	instance: TransmissionInstance,
	ids: string[]
): Promise<Map<string, string[]>> {
	const torrents = await torrentGet(cacheKey, instance, ['hashString', 'labels'], ids)
	const map = new Map<string, string[]>()
	for (const t of torrents) map.set(t.hashString, t.labels ?? [])
	return map
}

// ---------------------------------------------------------------------------
// Request body helpers
// ---------------------------------------------------------------------------

type BodyValue = string | File | (string | File)[]

function firstString(value: BodyValue | undefined): string | undefined {
	if (value === undefined) return undefined
	if (Array.isArray(value)) {
		const first = value[0]
		return typeof first === 'string' ? first : undefined
	}
	return typeof value === 'string' ? value : undefined
}

function fileList(value: BodyValue | undefined): File[] {
	if (value === undefined) return []
	const arr = Array.isArray(value) ? value : [value]
	return arr.filter((v): v is File => typeof v !== 'string')
}

function splitHashes(raw: string | undefined): string[] {
	if (!raw) return []
	return raw
		.split(/[|\n]/)
		.map((h) => h.trim())
		.filter(Boolean)
}

function splitList(raw: string | undefined): string[] {
	if (!raw) return []
	return raw
		.split(/[,\n]/)
		.map((s) => s.trim())
		.filter(Boolean)
}

// ---------------------------------------------------------------------------
// Facade handler
// ---------------------------------------------------------------------------

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function text(data: string, status = 200): Response {
	return new Response(data, { status, headers: { 'Content-Type': 'text/plain' } })
}

function ok(): Response {
	return text('Ok.')
}

export interface TransmissionFacadeOptions {
	cacheKey: string
	instance: TransmissionInstance
}

async function mapSessionPreferences(session: TrSessionArgs): Promise<Record<string, unknown>> {
	return {
		locale: 'zh',
		confirm_torrent_deletion: true,
		save_path: session['download-dir'] ?? '',
		temp_path: session['incomplete-dir'] ?? '',
		temp_path_enabled: !!session['incomplete-dir-enabled'],
		listen_port: session['peer-port'] ?? 0,
		random_port: !!session['peer-port-random-on-start'],
		upnp: !!session['port-forwarding-enabled'],
		dl_limit: (session['speed-limit-down'] ?? 0) * 1000,
		up_limit: (session['speed-limit-up'] ?? 0) * 1000,
		alt_dl_limit: (session['alt-speed-down'] ?? 0) * 1000,
		alt_up_limit: (session['alt-speed-up'] ?? 0) * 1000,
		scheduler_enabled: !!session['alt-speed-time-enabled'],
		queueing_enabled: !!session['download-queue-enabled'],
		max_active_downloads: session['download-queue-size'] ?? 0,
		max_active_uploads: session['seed-queue-size'] ?? 0,
		dont_count_slow_torrents: !!session['queue-stalled-enabled'],
		dht: !!session['dht-enabled'],
		pex: !!session['pex-enabled'],
		lsd: !!session['lpd-enabled'],
		max_connec: session['peer-limit-global'] ?? 0,
		max_connec_per_torrent: session['peer-limit-per-torrent'] ?? 0,
		max_ratio_enabled: !!session.seedRatioLimited,
		max_ratio: session.seedRatioLimit ?? 2,
		max_inactive_seeding_time_enabled: !!session['idle-seeding-limit-enabled'],
		max_inactive_seeding_time: session['idle-seeding-limit'] ?? 0,
		ip_filter_enabled: !!session['blocklist-enabled'],
		ip_filter_path: session['blocklist-url'] ?? '',
	}
}

function preferencesToSessionSet(prefs: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)
	const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)

	if (typeof prefs.save_path === 'string') out['download-dir'] = prefs.save_path
	if (typeof prefs.temp_path === 'string') out['incomplete-dir'] = prefs.temp_path
	if (bool(prefs.temp_path_enabled) !== undefined) out['incomplete-dir-enabled'] = prefs.temp_path_enabled
	if (num(prefs.listen_port) !== undefined) out['peer-port'] = prefs.listen_port
	if (bool(prefs.random_port) !== undefined) out['peer-port-random-on-start'] = prefs.random_port
	if (bool(prefs.upnp) !== undefined) out['port-forwarding-enabled'] = prefs.upnp
	if (num(prefs.dl_limit) !== undefined) {
		out['speed-limit-down'] = bytesToKb(prefs.dl_limit as number)
		out['speed-limit-down-enabled'] = (prefs.dl_limit as number) > 0
	}
	if (num(prefs.up_limit) !== undefined) {
		out['speed-limit-up'] = bytesToKb(prefs.up_limit as number)
		out['speed-limit-up-enabled'] = (prefs.up_limit as number) > 0
	}
	if (num(prefs.alt_dl_limit) !== undefined) out['alt-speed-down'] = bytesToKb(prefs.alt_dl_limit as number)
	if (num(prefs.alt_up_limit) !== undefined) out['alt-speed-up'] = bytesToKb(prefs.alt_up_limit as number)
	if (bool(prefs.scheduler_enabled) !== undefined) out['alt-speed-time-enabled'] = prefs.scheduler_enabled
	if (bool(prefs.queueing_enabled) !== undefined) out['download-queue-enabled'] = prefs.queueing_enabled
	if (num(prefs.max_active_downloads) !== undefined) out['download-queue-size'] = prefs.max_active_downloads
	if (num(prefs.max_active_uploads) !== undefined) out['seed-queue-size'] = prefs.max_active_uploads
	if (bool(prefs.dont_count_slow_torrents) !== undefined) out['queue-stalled-enabled'] = prefs.dont_count_slow_torrents
	if (bool(prefs.dht) !== undefined) out['dht-enabled'] = prefs.dht
	if (bool(prefs.pex) !== undefined) out['pex-enabled'] = prefs.pex
	if (bool(prefs.lsd) !== undefined) out['lpd-enabled'] = prefs.lsd
	if (num(prefs.max_connec) !== undefined) out['peer-limit-global'] = prefs.max_connec
	if (num(prefs.max_connec_per_torrent) !== undefined) out['peer-limit-per-torrent'] = prefs.max_connec_per_torrent
	if (bool(prefs.max_ratio_enabled) !== undefined) out.seedRatioLimited = prefs.max_ratio_enabled
	if (num(prefs.max_ratio) !== undefined) out.seedRatioLimit = prefs.max_ratio
	if (bool(prefs.max_inactive_seeding_time_enabled) !== undefined)
		out['idle-seeding-limit-enabled'] = prefs.max_inactive_seeding_time_enabled
	if (num(prefs.max_inactive_seeding_time) !== undefined)
		out['idle-seeding-limit'] = prefs.max_inactive_seeding_time
	if (bool(prefs.ip_filter_enabled) !== undefined) out['blocklist-enabled'] = prefs.ip_filter_enabled
	if (typeof prefs.ip_filter_path === 'string') out['blocklist-url'] = prefs.ip_filter_path
	return out
}

export async function handleTransmissionRequest(
	c: Context,
	instance: Instance,
	cacheKey: string,
	path: string
): Promise<Response> {
	const method = c.req.method.toUpperCase()
	const url = new URL(c.req.url)
	const q = url.searchParams
	const body = async (): Promise<URLSearchParams> => {
		try {
			const parsed = (await c.req.parseBody()) as Record<string, BodyValue>
			const params = new URLSearchParams()
			for (const [k, v] of Object.entries(parsed)) {
				const s = firstString(v)
				if (s !== undefined) params.set(k, s)
			}
			return params
		} catch {
			return new URLSearchParams()
		}
	}

	// --- app ---------------------------------------------------------------
	if (path === '/v2/app/version') {
		const session = await rpc<TrSessionArgs>(cacheKey, instance, 'session-get', { fields: ['version'] })
		return text(session.version ?? 'Transmission')
	}

	if (path === '/v2/app/preferences' && method === 'GET') {
		const session = await rpc<TrSessionArgs>(cacheKey, instance, 'session-get')
		return json(await mapSessionPreferences(session))
	}

	if (path === '/v2/app/setPreferences' && method === 'POST') {
		const params = await body()
		const raw = params.get('json')
		if (raw) {
			try {
				const prefs = JSON.parse(raw) as Record<string, unknown>
				await rpc(cacheKey, instance, 'session-set', preferencesToSessionSet(prefs))
			} catch {
				return text('Invalid preferences payload', 400)
			}
		}
		return ok()
	}

	// --- transfer ----------------------------------------------------------
	if (path === '/v2/transfer/info') {
		const [stats, session] = await Promise.all([
			rpc<TrSessionStats>(cacheKey, instance, 'session-stats'),
			rpc<TrSessionArgs>(cacheKey, instance, 'session-get'),
		])
		return json({
			dl_info_speed: stats.downloadSpeed ?? 0,
			dl_info_data: current(stats).downloadedBytes ?? 0,
			up_info_speed: stats.uploadSpeed ?? 0,
			up_info_data: current(stats).uploadedBytes ?? 0,
			dl_rate_limit: (session['speed-limit-down-enabled'] ? session['speed-limit-down'] ?? 0 : 0) * 1000,
			up_rate_limit: (session['speed-limit-up-enabled'] ? session['speed-limit-up'] ?? 0 : 0) * 1000,
			dht_nodes: 0,
			connection_status: 'connected',
		})
	}

	if (path === '/v2/transfer/speedLimitsMode') {
		const session = await rpc<TrSessionArgs>(cacheKey, instance, 'session-get', {
			fields: ['alt-speed-enabled'],
		})
		return text(session['alt-speed-enabled'] ? '1' : '0')
	}

	if (path === '/v2/transfer/toggleSpeedLimitsMode' && method === 'POST') {
		const session = await rpc<TrSessionArgs>(cacheKey, instance, 'session-get', {
			fields: ['alt-speed-enabled'],
		})
		await rpc(cacheKey, instance, 'session-set', { 'alt-speed-enabled': !session['alt-speed-enabled'] })
		return ok()
	}

	if (path === '/v2/transfer/setDownloadLimit' && method === 'POST') {
		const params = await body()
		const limit = Number(params.get('limit') ?? 0)
		await rpc(cacheKey, instance, 'session-set', {
			'speed-limit-down': bytesToKb(limit),
			'speed-limit-down-enabled': limit > 0,
		})
		return ok()
	}

	if (path === '/v2/transfer/setUploadLimit' && method === 'POST') {
		const params = await body()
		const limit = Number(params.get('limit') ?? 0)
		await rpc(cacheKey, instance, 'session-set', {
			'speed-limit-up': bytesToKb(limit),
			'speed-limit-up-enabled': limit > 0,
		})
		return ok()
	}

	// --- sync --------------------------------------------------------------
	if (path === '/v2/sync/maindata') {
		const [stats, session] = await Promise.all([
			rpc<TrSessionStats>(cacheKey, instance, 'session-stats'),
			rpc<TrSessionArgs>(cacheKey, instance, 'session-get', { fields: ['download-dir', 'alt-speed-enabled'] }),
		])
		let freeSpace = 0
		const dir = session['download-dir']
		if (dir) {
			try {
				const res = await rpc<{ 'size-bytes'?: number; size_bytes?: number }>(cacheKey, instance, 'free-space', {
					path: dir,
				})
				freeSpace = freeSpaceBytes(res)
			} catch {
				freeSpace = 0
			}
		}
		return json({
			server_state: {
				alltime_dl: cumulative(stats).downloadedBytes ?? 0,
				alltime_ul: cumulative(stats).uploadedBytes ?? 0,
				dl_info_speed: stats.downloadSpeed ?? 0,
				up_info_speed: stats.uploadSpeed ?? 0,
				free_space_on_disk: freeSpace,
				use_alt_speed_limits: !!session['alt-speed-enabled'],
				connection_status: 'connected',
				dht_nodes: 0,
			},
			categories: {},
			tags: [],
			torrents: {},
			removed: [],
		})
	}

	if (path === '/v2/sync/torrentPeers') {
		const hash = q.get('hash') ?? ''
		if (!hash) return json({ full_update: true, peers: {}, rid: 0, show_flags: false })
		const torrents = await torrentGet(cacheKey, instance, ['hashString', 'peers'], [hash])
		const t = torrents[0]
		const peers: Record<string, Record<string, unknown>> = {}
		for (const p of t?.peers ?? []) {
			const key = `${p.address}:${p.port}`
			peers[key] = {
				ip: p.address,
				port: p.port,
				client: p.clientName || '',
				progress: p.progress ?? 0,
				dl_speed: p.rateToClient ?? 0,
				up_speed: p.rateToPeer ?? 0,
				downloaded: p.bytesToClient ?? 0,
				uploaded: p.bytesToPeer ?? 0,
				connection: p.isIncoming ? 'incoming' : 'outgoing',
				flags: p.flagStr ?? '',
				flags_desc: '',
				relevance: 0,
				files: '',
			}
		}
		return json({ full_update: true, peers, rid: 0, show_flags: false })
	}

	// --- torrents: read ----------------------------------------------------
	if (path === '/v2/torrents/info') {
		const torrents = await torrentGet(cacheKey, instance, LIST_FIELDS)
		let mapped = torrents.map(toQbTorrent)
		const filter = q.get('filter') ?? 'all'
		const category = q.get('category')
		const tag = q.get('tag')
		const hashes = splitHashes(q.get('hashes') ?? undefined)
		if (filter && filter !== 'all') mapped = mapped.filter((t) => matchesFilter(t, filter))
		if (category) mapped = mapped.filter((t) => t.category === category)
		if (tag) mapped = mapped.filter((t) => t.tags.split(', ').includes(tag))
		if (hashes.length) {
			const set = new Set(hashes.map((h) => h.toLowerCase()))
			mapped = mapped.filter((t) => set.has(t.hash.toLowerCase()))
		}
		return json(mapped)
	}

	if (path === '/v2/torrents/categories') {
		const torrents = await torrentGet(cacheKey, instance, ['labels'])
		const out: Record<string, { name: string; savePath: string }> = {}
		for (const t of torrents) for (const label of t.labels ?? []) out[label] = { name: label, savePath: '' }
		return json(out)
	}

	if (path === '/v2/torrents/tags') {
		const torrents = await torrentGet(cacheKey, instance, ['labels'])
		const set = new Set<string>()
		for (const t of torrents) for (const label of t.labels ?? []) set.add(label)
		return json([...set])
	}

	if (path === '/v2/torrents/properties') {
		const hash = q.get('hash') ?? ''
		const torrents = await torrentGet(
			cacheKey,
			instance,
			[
				'hashString',
				'name',
				'percentDone',
				'downloadDir',
				'dateCreated',
				'pieceSize',
				'comment',
				'creator',
				'corruptEver',
				'uploadedEver',
				'downloadedEver',
				'uploadLimit',
				'uploadLimited',
				'downloadLimit',
				'downloadLimited',
				'secondsSeeding',
				'peersConnected',
				'peerLimit',
				'uploadRatio',
				'addedDate',
				'doneDate',
				'rateDownload',
				'rateUpload',
				'eta',
				'activityDate',
				'peersGettingFromUs',
				'peersSendingToUs',
				'haveValid',
				'pieceCount',
				'totalSize',
				'sizeWhenDone',
				'isPrivate',
			],
			[hash]
		)
		const t = torrents[0]
		if (!t) return json({ error: 'Torrent not found' }, 404)
		return json({
			save_path: t.downloadDir ?? '',
			download_path: t.downloadDir ?? '',
			creation_date: t.dateCreated ?? 0,
			piece_size: t.pieceSize ?? 0,
			comment: t.comment ?? '',
			total_wasted: t.corruptEver ?? 0,
			total_uploaded: t.uploadedEver ?? 0,
			total_uploaded_session: 0,
			total_downloaded: t.downloadedEver ?? 0,
			total_downloaded_session: 0,
			up_limit: kbToBytes(t.uploadLimit, t.uploadLimited),
			dl_limit: kbToBytes(t.downloadLimit, t.downloadLimited),
			time_elapsed: 0,
			seeding_time: t.secondsSeeding ?? 0,
			nb_connections: t.peersConnected ?? 0,
			nb_connections_limit: t.peerLimit ?? 0,
			share_ratio: t.uploadRatio ?? 0,
			addition_date: t.addedDate ?? 0,
			completion_date: t.doneDate ?? 0,
			created_by: t.creator ?? '',
			dl_speed_avg: 0,
			dl_speed: t.rateDownload ?? 0,
			eta: (t.eta ?? -1) < 0 ? INFINITE_ETA : t.eta,
			last_seen: t.activityDate ?? 0,
			peers: t.peersGettingFromUs ?? 0,
			peers_total: t.peersConnected ?? 0,
			pieces_have: t.pieceSize && t.pieceSize > 0 ? Math.round((t.haveValid ?? 0) / t.pieceSize) : 0,
			pieces_num: t.pieceCount ?? 0,
			reannounce: 0,
			seeds: t.peersSendingToUs ?? 0,
			seeds_total: t.peersSendingToUs ?? 0,
			total_size: t.sizeWhenDone ?? t.totalSize ?? 0,
			up_speed_avg: 0,
			up_speed: t.rateUpload ?? 0,
			is_private: !!t.isPrivate,
			infohash_v1: t.hashString,
			popularity: 0,
		})
	}

	if (path === '/v2/torrents/trackers') {
		const hash = q.get('hash') ?? ''
		const torrents = await torrentGet(cacheKey, instance, ['hashString', 'trackerStats', 'trackers'], [hash])
		const stats = torrents[0]?.trackerStats
		const basic = torrents[0]?.trackers
		if (stats && stats.length) {
			return json(
				stats.map((s) => ({
					url: s.announce,
					status: trackerStatus(s),
					tier: s.tier ?? 0,
					num_peers: s.leecherCount ?? 0,
					num_seeds: s.seederCount ?? 0,
					num_leeches: s.leecherCount ?? 0,
					num_downloaded: s.downloadCount ?? 0,
					msg: s.lastAnnounceResult ?? '',
				}))
			)
		}
		return json(
			(basic ?? []).map((s) => ({
				url: s.announce,
				status: 1,
				tier: s.tier ?? 0,
				num_peers: 0,
				num_seeds: 0,
				num_leeches: 0,
				num_downloaded: 0,
				msg: '',
			}))
		)
	}

	if (path === '/v2/torrents/files') {
		const hash = q.get('hash') ?? ''
		const torrents = await torrentGet(cacheKey, instance, [
			'hashString',
			'files',
			'fileStats',
			'wanted',
			'priorities',
		], [hash])
		const t = torrents[0]
		const files = t?.files ?? []
		return json(
			files.map((f, index) => {
				const stat = t?.fileStats?.[index]
				const wanted = t?.wanted?.[index]
				let priority = 1
				if (wanted === false) priority = 0
				else if (stat?.priority === 1) priority = 6
				else if (stat?.priority === -1) priority = 1
				return {
					index,
					name: f.name,
					size: f.length,
					progress: f.length > 0 ? f.bytesCompleted / f.length : 0,
					priority,
					is_seed: false,
					availability: 1,
					piece_range: [f.beginPiece ?? 0, Math.max(f.beginPiece ?? 0, (f.endPiece ?? 1) - 1)],
				}
			})
		)
	}

	if (path === '/v2/torrents/webseeds') {
		const hash = q.get('hash') ?? ''
		const torrents = await torrentGet(cacheKey, instance, ['hashString', 'webseedsEx'], [hash])
		return json((torrents[0]?.webseedsEx ?? []).map((w) => ({ url: w.url })))
	}

	if (path === '/v2/log/main' || path === '/v2/log/peers') {
		return json([])
	}

	if (path.startsWith('/v2/rss/')) {
		if (path === '/v2/rss/items') return json({})
		if (path === '/v2/rss/rules') return json({})
		return ok()
	}

	// --- torrents: write ---------------------------------------------------
	if (path === '/v2/torrents/add' && method === 'POST') {
		let parsed: Record<string, BodyValue> = {}
		try {
			parsed = (await c.req.parseBody()) as Record<string, BodyValue>
		} catch {
			parsed = {}
		}
		const urls = firstString(parsed.urls)
		const savepath = firstString(parsed.savepath)
		const category = firstString(parsed.category)
		const tags = splitList(firstString(parsed.tags))
		const pausedRaw = firstString(parsed.paused)
		const paused = pausedRaw === undefined ? undefined : pausedRaw === 'true'
		const labels = [...(category ? [category] : []), ...tags]
		const files = fileList(parsed.torrents)

		const add = async (args: Record<string, unknown>): Promise<void> => {
			await rpc(cacheKey, instance, 'torrent-add', args)
		}

		if (urls) {
			for (const u of urls.split(/\s*\n\s*/).map((s) => s.trim()).filter(Boolean)) {
				const args: Record<string, unknown> = { filename: u }
				if (savepath) args['download-dir'] = savepath
				if (labels.length) args.labels = labels
				if (paused !== undefined) args.paused = paused
				await add(args)
			}
		}

		for (const file of files) {
			const metainfo = Buffer.from(await file.arrayBuffer()).toString('base64')
			const args: Record<string, unknown> = { metainfo }
			if (savepath) args['download-dir'] = savepath
			if (labels.length) args.labels = labels
			if (paused !== undefined) args.paused = paused
			await add(args)
		}

		return ok()
	}

	if (path === '/v2/torrents/start' || path === '/v2/torrents/stop' || path === '/v2/torrents/recheck' || path === '/v2/torrents/reannounce' || path === '/v2/torrents/delete') {
		if (method !== 'POST') return text('Method not allowed', 405)
		const params = await body()
		const ids = splitHashes(params.get('hashes') ?? undefined)
		if (path === '/v2/torrents/delete') {
			const deleteFiles = params.get('deleteFiles') === 'true'
			await rpc(cacheKey, instance, 'torrent-remove', { ids, 'delete-local-data': deleteFiles })
		} else if (path === '/v2/torrents/start') {
			await rpc(cacheKey, instance, 'torrent-start', { ids })
		} else if (path === '/v2/torrents/stop') {
			await rpc(cacheKey, instance, 'torrent-stop', { ids })
		} else if (path === '/v2/torrents/recheck') {
			await rpc(cacheKey, instance, 'torrent-verify', { ids })
		} else {
			await rpc(cacheKey, instance, 'torrent-reannounce', { ids })
		}
		return ok()
	}

	if (path === '/v2/torrents/setCategory' && method === 'POST') {
		const params = await body()
		const ids = splitHashes(params.get('hashes') ?? undefined)
		const category = params.get('category') ?? ''
		const current = await getLabels(cacheKey, instance, ids)
		for (const id of ids) {
			const existing = current.get(id) ?? []
			const rest = existing.slice(1)
			const labels = category ? [category, ...rest] : rest
			await torrentSet(cacheKey, instance, [id], { labels })
		}
		return ok()
	}

	if ((path === '/v2/torrents/addTags' || path === '/v2/torrents/removeTags') && method === 'POST') {
		const params = await body()
		const ids = splitHashes(params.get('hashes') ?? undefined)
		const changes = splitList(params.get('tags') ?? undefined)
		const current = await getLabels(cacheKey, instance, ids)
		const addTags = path === '/v2/torrents/addTags'
		for (const id of ids) {
			const existing = current.get(id) ?? []
			const labels = addTags
				? [...existing, ...changes.filter((t) => !existing.includes(t))]
				: existing.filter((t) => !changes.includes(t))
			await torrentSet(cacheKey, instance, [id], { labels })
		}
		return ok()
	}

	if ((path === '/v2/torrents/createTags' || path === '/v2/torrents/deleteTags') && method === 'POST') {
		return ok()
	}

	if (
		(path === '/v2/torrents/createCategory' || path === '/v2/torrents/editCategory' || path === '/v2/torrents/removeCategories') &&
		method === 'POST'
	) {
		return ok()
	}

	if ((path === '/v2/torrents/setDownloadLimit' || path === '/v2/torrents/setUploadLimit') && method === 'POST') {
		const params = await body()
		const ids = splitHashes(params.get('hashes') ?? undefined)
		const limit = Number(params.get('limit') ?? 0)
		const args: Record<string, unknown> =
			path === '/v2/torrents/setDownloadLimit'
				? { downloadLimit: bytesToKb(limit), downloadLimited: limit > 0 }
				: { uploadLimit: bytesToKb(limit), uploadLimited: limit > 0 }
		await torrentSet(cacheKey, instance, ids, args)
		return ok()
	}

	if (path === '/v2/torrents/setLocation' && method === 'POST') {
		const params = await body()
		const ids = splitHashes(params.get('hashes') ?? undefined)
		const location = params.get('location') ?? ''
		await rpc(cacheKey, instance, 'torrent-set-location', { ids, location, move: true })
		return ok()
	}

	if (path === '/v2/torrents/setDownloadPath' && method === 'POST') {
		const params = await body()
		const ids = splitHashes(params.get('hashes') ?? undefined)
		const location = params.get('downloadPath') ?? ''
		await rpc(cacheKey, instance, 'torrent-set-location', { ids, location, move: false })
		return ok()
	}

	if (path === '/v2/torrents/rename' && method === 'POST') {
		const params = await body()
		const hash = params.get('hash') ?? ''
		const name = params.get('name') ?? ''
		const torrents = await torrentGet(cacheKey, instance, ['hashString', 'name'], [hash])
		const oldName = torrents[0]?.name
		if (!oldName) return json({ error: 'Torrent not found' }, 404)
		await rpc(cacheKey, instance, 'torrent-rename-path', { ids: [hash], path: oldName, name })
		return ok()
	}

	if (path === '/v2/torrents/filePrio' && method === 'POST') {
		const params = await body()
		const hash = params.get('hash') ?? ''
		const indexes = (params.get('id') ?? '')
			.split('|')
			.map((v) => Number(v.trim()))
			.filter((v) => Number.isFinite(v))
		const priority = Number(params.get('priority') ?? 1)
		const args: Record<string, unknown> = {}
		if (priority === 0) args['files-unwanted'] = indexes
		else {
			args['files-wanted'] = indexes
			if (priority >= 6) args['priority-high'] = indexes
			else if (priority === 1) args['priority-normal'] = indexes
			else args['priority-normal'] = indexes
		}
		await torrentSet(cacheKey, instance, [hash], args)
		return ok()
	}

	if ((path === '/v2/torrents/addTrackers' || path === '/v2/torrents/removeTrackers') && method === 'POST') {
		const params = await body()
		const hash = params.get('hash') ?? ''
		const urls = (params.get('urls') ?? '')
			.split(/[\n|]/)
			.map((u) => u.trim())
			.filter(Boolean)
		const torrents = await torrentGet(cacheKey, instance, ['hashString', 'trackerStats', 'trackers'], [hash])
		const existing = (torrents[0]?.trackers ?? []).map((t) => t.announce)
		const next =
			path === '/v2/torrents/addTrackers'
				? [...existing, ...urls.filter((u) => !existing.includes(u))]
				: existing.filter((u) => !urls.includes(u))
		await torrentSet(cacheKey, instance, [hash], { trackerList: next.join('\n\n') })
		return ok()
	}

	if (path === '/v2/torrents/export') {
		return json({ error: 'Exporting torrent files is not supported for Transmission instances' }, 501)
	}

	// --- transmission-native session ---------------------------------------
	if (path === '/v2/transmission/session') {
		if (method === 'GET') {
			const session = await rpc<TrSessionArgs>(cacheKey, instance, 'session-get')
			return json(session)
		}
		if (method === 'POST') {
			let payload: Record<string, unknown> = {}
			try {
				payload = (await c.req.json()) as Record<string, unknown>
			} catch {
				return json({ error: 'Invalid JSON payload' }, 400)
			}
			await rpc(cacheKey, instance, 'session-set', payload)
			return ok()
		}
	}

	log.warn(`[Transmission] Unhandled facade path: ${method} ${path} (instance ${instance.id})`)
	return json({ error: `Unsupported endpoint for Transmission: ${path}` }, 404)
}

// ---------------------------------------------------------------------------
// Instance statistics / connection testing
// ---------------------------------------------------------------------------

export interface TransmissionStats {
	online: boolean
	total: number
	downloading: number
	seeding: number
	paused: number
	error: number
	dlSpeed: number
	upSpeed: number
	allTimeDownload: number
	allTimeUpload: number
	freeSpaceOnDisk: number
}

interface CachedStats {
	at: number
	data: TransmissionStats
}

const statsCache = new Map<number, CachedStats>()
const STATS_CACHE_TTL_MS = 5000

export async function fetchTransmissionStats(
	instance: TransmissionInstance & { id: number },
	timeoutMs = 5000
): Promise<TransmissionStats> {
	const cached = statsCache.get(instance.id)
	if (cached && Date.now() - cached.at < STATS_CACHE_TTL_MS) {
		return cached.data
	}

	const key = `instance:${instance.id}`
	const base: TransmissionStats = {
		online: false,
		total: 0,
		downloading: 0,
		seeding: 0,
		paused: 0,
		error: 0,
		dlSpeed: 0,
		upSpeed: 0,
		allTimeDownload: 0,
		allTimeUpload: 0,
		freeSpaceOnDisk: 0,
	}

	try {
		const stats = await rpc<TrSessionStats>(key, instance, 'session-stats', undefined, timeoutMs)
		base.online = true
		base.total = stats.torrentCount ?? 0
		base.paused = stats.pausedTorrentCount ?? 0
		base.dlSpeed = stats.downloadSpeed ?? 0
		base.upSpeed = stats.uploadSpeed ?? 0
		base.allTimeDownload = cumulative(stats).downloadedBytes ?? 0
		base.allTimeUpload = cumulative(stats).uploadedBytes ?? 0

		const statuses = await torrentGet(key, instance, ['status', 'error', 'percentDone'])
		let downloading = 0
		let seeding = 0
		let errored = 0
		for (const t of statuses) {
			if (t.error) {
				errored++
				continue
			}
			if (t.status === 0) continue
			if (t.status === 6) seeding++
			else if (t.status === 4 || t.status === 3) downloading++
			else if (t.status === 5) seeding++
			else if (t.status === 1 || t.status === 2) {
				if ((t.percentDone ?? 0) >= 1) seeding++
				else downloading++
			}
		}
		base.downloading = downloading
		base.seeding = seeding
		base.error = errored

		try {
			const session = await rpc<TrSessionArgs>(key, instance, 'session-get', { fields: ['download-dir'] })
			const dir = session['download-dir']
			if (dir) {
				const free = await rpc<{ 'size-bytes'?: number; size_bytes?: number }>(
					key,
					instance,
					'free-space',
					{ path: dir },
					timeoutMs
				)
				base.freeSpaceOnDisk = freeSpaceBytes(free)
			}
		} catch {
			base.freeSpaceOnDisk = 0
		}

		statsCache.set(instance.id, { at: Date.now(), data: base })
		return base
	} catch {
		statsCache.set(instance.id, { at: Date.now(), data: base })
		return base
	}
}

export async function addTransmissionTorrent(
	cacheKey: string,
	instance: TransmissionInstance,
	options: {
		url?: string
		metainfoBase64?: string
		savepath?: string
		category?: string
		tags?: string[]
		paused?: boolean
	}
): Promise<void> {
	const args: Record<string, unknown> = {}
	if (options.url) args.filename = options.url
	if (options.metainfoBase64) args.metainfo = options.metainfoBase64
	if (options.savepath) args['download-dir'] = options.savepath
	const labels = [...(options.category ? [options.category] : []), ...(options.tags ?? [])]
	if (labels.length) args.labels = labels
	if (options.paused !== undefined) args.paused = options.paused
	await rpc(cacheKey, instance, 'torrent-add', args)
}

export type TransmissionTestResult =
	| { success: true; version: string }
	| { success: false; error: string; status?: number }

export async function testTransmissionConnection(
	url: string,
	username?: string,
	password?: string,
	skipAuth?: boolean,
	id = 0
): Promise<TransmissionTestResult> {
	const instance: TransmissionInstance = {
		url,
		qbt_username: username ?? null,
		qbt_password_encrypted: null,
		skip_auth: skipAuth ? 1 : 0,
	}
	const key = `test:${id}:${url}`
	try {
		if (skipAuth) {
			const session = await rpc<TrSessionArgs>(key, instance, 'session-get', { fields: ['version'] }, 8000)
			return { success: true, version: session.version ?? 'Transmission' }
		}
		if (!username || !password) return { success: false, error: 'Credentials required' }
		const headers = new Headers({ 'Content-Type': 'application/json' })
		headers.set('Authorization', `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`)
		const res = await fetchWithTls(rpcEndpoint(url), {
			method: 'POST',
			headers,
			body: JSON.stringify({ method: 'session-get', arguments: { fields: ['version'] } }),
			signal: AbortSignal.timeout(8000),
		})
		if (res.status === 401) return { success: false, error: 'Invalid credentials', status: 401 }
		if (res.status === 409) {
			const sid = res.headers.get(SESSION_HEADER)
			if (sid) headers.set(SESSION_HEADER, sid)
			const retry = await fetchWithTls(rpcEndpoint(url), {
				method: 'POST',
				headers,
				body: JSON.stringify({ method: 'session-get', arguments: { fields: ['version'] } }),
				signal: AbortSignal.timeout(8000),
			})
			if (retry.status === 401) return { success: false, error: 'Invalid credentials', status: 401 }
			if (!retry.ok) return { success: false, error: `Login failed: HTTP ${retry.status}` }
			const json = (await retry.json()) as RpcEnvelope<TrSessionArgs>
			if (json.result !== 'success') return { success: false, error: json.result || 'Login failed' }
			if (sid) sessionIds.set(key, sid)
			return { success: true, version: json.arguments?.version ?? 'Transmission' }
		}
		if (!res.ok) return { success: false, error: `Login failed: HTTP ${res.status}` }
		const json = (await res.json()) as RpcEnvelope<TrSessionArgs>
		if (json.result !== 'success') return { success: false, error: json.result || 'Login failed' }
		return { success: true, version: json.arguments?.version ?? 'Transmission' }
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Connection failed' }
	}
}

export async function testStoredTransmissionInstance(
	instance: TransmissionInstance & { id: number }
): Promise<TransmissionTestResult> {
	try {
		const session = await rpc<TrSessionArgs>(`instance:${instance.id}`, instance, 'session-get', {
			fields: ['version'],
		})
		return { success: true, version: session.version ?? 'Transmission' }
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Connection failed'
		return { success: false, error: message, status: message === 'Invalid credentials' ? 401 : undefined }
	}
}
