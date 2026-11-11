import { ArrowDown, ArrowUp, AlertCircle } from 'lucide-react'
import { formatSize } from '../utils/format'
import { Select } from './ui'
import { useStats } from '../hooks/useStats'
import { useI18n } from '../i18n'

export function Statistics() {
	const { t } = useI18n()
	const { periodData, instances, selectedInstance, setSelectedInstance, isLoading, hasAnyData } = useStats()

	const instanceOptions = [
		{ value: 'all', label: t('common.allInstances') },
		...instances.map((i) => ({ value: String(i.id), label: i.label })),
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
					{t('stats.transferStatistics')}
				</h1>
				{instances.length > 1 && (
					<div className="w-48">
						<Select value={selectedInstance} onChange={setSelectedInstance} options={instanceOptions} />
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
					{t('stats.loading')}
				</div>
			) : (
				<>
					{!hasAnyData && (
						<div
							className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
							style={{
								backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
								color: 'var(--warning)',
							}}
						>
							<AlertCircle className="w-5 h-5 flex-shrink-0" />
							<div>
								<div className="font-medium">{t('stats.noData')}</div>
								<div className="text-xs opacity-80 mt-0.5">
									{t('stats.noDataDesc')}
								</div>
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
						{periodData!.map((data) => (
							<div
								key={data.period}
								className={`px-4 py-3 rounded-xl border ${data.period === 'all' ? 'col-span-2' : ''}`}
								style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
							>
								<div className="flex items-center justify-between">
									<div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
										{data.label}
									</div>
									<div className="flex items-center gap-4">
										<div className="flex items-center gap-1.5">
											<ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
											<span
												className="text-sm font-semibold tabular-nums"
												style={{ color: data.hasData ? 'var(--accent)' : 'var(--text-muted)' }}
											>
												{data.hasData ? formatSize(data.downloaded) : t('common.na')}
											</span>
										</div>
										<div className="flex items-center gap-1.5">
											<ArrowUp className="w-3.5 h-3.5" style={{ color: '#a6e3a1' }} />
											<span
												className="text-sm font-semibold tabular-nums"
												style={{ color: data.hasData ? '#a6e3a1' : 'var(--text-muted)' }}
											>
												{data.hasData ? formatSize(data.uploaded) : t('common.na')}
											</span>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					<ul className="text-xs space-y-1 list-disc list-inside" style={{ color: 'var(--text-muted)' }}>
						<li>{t('stats.note1')}</li>
						<li>{t('stats.note2')}</li>
						<li>{t('stats.note3')}</li>
						<li>{t('stats.note4')}</li>
					</ul>
				</>
			)}
		</div>
	)
}
