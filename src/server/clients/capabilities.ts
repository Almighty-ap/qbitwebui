export type ClientKind = 'qbittorrent' | 'transmission'

export interface InstanceCapabilities {
	kind: ClientKind
	rss: boolean
	logs: boolean
	categories: boolean
	tags: boolean
	networkAgent: boolean
	crossSeed: boolean
	preferences: 'full' | 'partial' | 'none'
	torrentExport: boolean
	trackerEditing: boolean
	filePriority: boolean
	rename: boolean
	setLocation: boolean
	speedLimits: boolean
	queueing: boolean
}

export function normalizeKind(kind: unknown): ClientKind {
	return kind === 'transmission' ? 'transmission' : 'qbittorrent'
}

export function capabilitiesFor(kind: unknown): InstanceCapabilities {
	if (normalizeKind(kind) === 'transmission') {
		return {
			kind: 'transmission',
			rss: false,
			logs: false,
			categories: false,
			tags: true,
			networkAgent: false,
			crossSeed: false,
			preferences: 'partial',
			torrentExport: false,
			trackerEditing: true,
			filePriority: true,
			rename: true,
			setLocation: true,
			speedLimits: true,
			queueing: false,
		}
	}
	return {
		kind: 'qbittorrent',
		rss: true,
		logs: true,
		categories: true,
		tags: true,
		networkAgent: true,
		crossSeed: true,
		preferences: 'full',
		torrentExport: true,
		trackerEditing: true,
		filePriority: true,
		rename: true,
		setLocation: true,
		speedLimits: true,
		queueing: true,
	}
}
