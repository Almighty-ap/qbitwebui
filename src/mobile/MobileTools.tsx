import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react'
import {
	Search,
	FolderOpen,
	AlertTriangle,
	Rss,
	FileText,
	ArrowLeftRight,
	ChevronRight,
	BarChart3,
	Network,
} from 'lucide-react'
import { type Instance } from '../api/instances'
import { useI18n } from '../i18n'

const MobileSearchPanel = lazy(() => import('./MobileSearchPanel').then((m) => ({ default: m.MobileSearchPanel })))
const MobileFileBrowser = lazy(() => import('./MobileFileBrowser').then((m) => ({ default: m.MobileFileBrowser })))
const MobileOrphanManager = lazy(() =>
	import('./MobileOrphanManager').then((m) => ({ default: m.MobileOrphanManager }))
)
const MobileRSSManager = lazy(() => import('./MobileRSSManager').then((m) => ({ default: m.MobileRSSManager })))
const MobileLogViewer = lazy(() => import('./MobileLogViewer').then((m) => ({ default: m.MobileLogViewer })))
const MobileCrossSeedManager = lazy(() =>
	import('./MobileCrossSeedManager').then((m) => ({ default: m.MobileCrossSeedManager }))
)
const MobileStatistics = lazy(() => import('./MobileStatistics').then((m) => ({ default: m.MobileStatistics })))
const MobileNetworkTools = lazy(() => import('./MobileNetworkTools').then((m) => ({ default: m.MobileNetworkTools })))

type Tool = 'search' | 'files' | 'orphans' | 'rss' | 'logs' | 'cross-seed' | 'statistics' | 'network' | null

const Spinner = (
	<div className="flex items-center justify-center p-8">
		<div
			className="w-6 h-6 border-2 rounded-full animate-spin"
			style={{ borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', borderTopColor: 'var(--accent)' }}
		/>
	</div>
)

function LazyTool({ children }: { children: ReactNode }): ReactNode {
	return <Suspense fallback={Spinner}>{children}</Suspense>
}

interface Props {
	instances: Instance[]
	activeTool: Tool
	onToolChange: (tool: Tool) => void
}

export function MobileTools({ instances, activeTool, onToolChange }: Props): ReactNode {
	const { t } = useI18n()
	const [filesEnabled, setFilesEnabled] = useState(false)

	useEffect(() => {
		fetch('/api/config')
			.then((r) => r.json())
			.then((c) => setFilesEnabled(c.filesEnabled))
			.catch(() => {})
	}, [])

	const handleBack = () => onToolChange(null)

	switch (activeTool) {
		case 'search':
			return (
				<LazyTool>
					<MobileSearchPanel instances={instances} onBack={handleBack} />
				</LazyTool>
			)
		case 'files':
			return (
				<LazyTool>
					<MobileFileBrowser onBack={handleBack} />
				</LazyTool>
			)
		case 'orphans':
			return (
				<LazyTool>
					<MobileOrphanManager instances={instances} onBack={handleBack} />
				</LazyTool>
			)
		case 'rss':
			return (
				<LazyTool>
					<MobileRSSManager instances={instances} onBack={handleBack} />
				</LazyTool>
			)
		case 'logs':
			return (
				<LazyTool>
					<MobileLogViewer instances={instances} onBack={handleBack} />
				</LazyTool>
			)
		case 'cross-seed':
			return (
				<LazyTool>
					<MobileCrossSeedManager instances={instances} onBack={handleBack} />
				</LazyTool>
			)
		case 'statistics':
			return (
				<LazyTool>
					<MobileStatistics onBack={handleBack} />
				</LazyTool>
			)
		case 'network':
			return (
				<LazyTool>
					<MobileNetworkTools instances={instances} onBack={handleBack} />
				</LazyTool>
			)
	}

	return (
		<div className="p-4 space-y-3">
			<button
				onClick={() => onToolChange('search')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
					>
						<Search className="w-6 h-6" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('search.prowlarrSearch')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('tools.searchIndexersDesc')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>

			{filesEnabled && (
				<button
					onClick={() => onToolChange('files')}
					className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
					style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
				>
					<div className="flex items-start gap-4">
						<div
							className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
							style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 15%, transparent)' }}
						>
							<FolderOpen className="w-6 h-6" style={{ color: 'var(--warning)' }} strokeWidth={1.5} />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
								{t('files.title')}
							</h3>
							<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
								{t('tools.browseDownloadsDesc')}
							</p>
						</div>
						<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
					</div>
				</button>
			)}

			<button
				onClick={() => onToolChange('orphans')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, var(--error) 15%, transparent)' }}
					>
						<AlertTriangle className="w-6 h-6" style={{ color: 'var(--error)' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('orphans.manager')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('orphans.findMissing')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>

			<button
				onClick={() => onToolChange('rss')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
					>
						<Rss className="w-6 h-6" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('rss.manager')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('rss.managerDesc')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>

			<button
				onClick={() => onToolChange('logs')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, var(--text-muted) 15%, transparent)' }}
					>
						<FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('logs.viewer')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('logs.viewerDesc')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>

			<button
				onClick={() => onToolChange('cross-seed')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform relative"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<span className="absolute top-3 right-3" title={t('common.experimentalFeature')}>
					<AlertTriangle className="w-6 h-6" style={{ color: 'var(--error)' }} />
				</span>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
					>
						<ArrowLeftRight className="w-6 h-6" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('crossSeed.title')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('crossSeed.findMatchesDesc')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>

			<button
				onClick={() => onToolChange('statistics')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, #a6e3a1 15%, transparent)' }}
					>
						<BarChart3 className="w-6 h-6" style={{ color: '#a6e3a1' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('stats.title')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('stats.viewHistoryDesc')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>

			<button
				onClick={() => onToolChange('network')}
				className="w-full p-4 rounded-2xl border text-left active:scale-[0.98] transition-transform"
				style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
			>
				<div className="flex items-start gap-4">
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
						style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
					>
						<Network className="w-6 h-6" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
							{t('network.title')}
						</h3>
						<p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
							{t('network.runDiagnosticsDesc')}
						</p>
					</div>
					<ChevronRight className="w-5 h-5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
				</div>
			</button>
		</div>
	)
}
