import { useState, useEffect } from 'react'
import { getStats, type PeriodStats } from '../api/stats'
import { tGlobal } from '../i18n'

export const PERIODS = [
	{ value: '15m', key: 'stats.period15m' },
	{ value: '30m', key: 'stats.period30m' },
	{ value: '1h', key: 'stats.period1h' },
	{ value: '4h', key: 'stats.period4h' },
	{ value: '12h', key: 'stats.period12h' },
	{ value: '1d', key: 'stats.period1d' },
	{ value: '1w', key: 'stats.period1w' },
	{ value: '1mo', key: 'stats.period1mo' },
	{ value: '6mo', key: 'stats.period6mo' },
	{ value: '1y', key: 'stats.period1y' },
	{ value: 'all', key: 'stats.allTime' },
] as const

export interface PeriodData {
	period: string
	label: string
	uploaded: number
	downloaded: number
	hasData: boolean
}

export interface InstanceOption {
	id: number
	label: string
}

interface UseStatsResult {
	periodData: PeriodData[] | null
	instances: InstanceOption[]
	selectedInstance: string
	setSelectedInstance: (value: string) => void
	isLoading: boolean
	hasAnyData: boolean
}

export function useStats(): UseStatsResult {
	const [periodData, setPeriodData] = useState<PeriodData[] | null>(null)
	const [instances, setInstances] = useState<InstanceOption[]>([])
	const [selectedInstance, setSelectedInstance] = useState<string>('all')

	useEffect(() => {
		let cancelled = false

		async function fetchAllPeriods(): Promise<void> {
			const results = await Promise.all(
				PERIODS.map(async (p) => {
					try {
						return { period: p.value, stats: await getStats(p.value) }
					} catch {
						return { period: p.value, stats: [] as PeriodStats[] }
					}
				})
			)

			if (cancelled) return

			const firstWithData = results.find((r) => r.stats.length > 0)
			if (firstWithData) {
				const uniqueInstances: InstanceOption[] = []
				for (const s of firstWithData.stats) {
					if (!uniqueInstances.some((i) => i.id === s.instanceId)) {
						uniqueInstances.push({ id: s.instanceId, label: s.instanceLabel })
					}
				}
				setInstances(uniqueInstances)
			}

			const processed = results.map(({ period, stats }) => {
				const periodConfig = PERIODS.find((p) => p.value === period)!
				const filtered =
					selectedInstance === 'all' ? stats : stats.filter((s) => s.instanceId === Number(selectedInstance))
				return {
					period,
					label: tGlobal(periodConfig.key),
					uploaded: filtered.reduce((sum, s) => sum + s.uploaded, 0),
					downloaded: filtered.reduce((sum, s) => sum + s.downloaded, 0),
					hasData: filtered.some((s) => s.hasData) || period === 'all',
				}
			})
			setPeriodData(processed)
		}

		fetchAllPeriods()
		return () => {
			cancelled = true
		}
	}, [selectedInstance])

	return {
		periodData,
		instances,
		selectedInstance,
		setSelectedInstance,
		isLoading: periodData === null,
		hasAnyData: periodData?.some((p) => p.hasData) ?? false,
	}
}
