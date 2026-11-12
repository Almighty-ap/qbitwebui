import { useQuery } from '@tanstack/react-query'
import { getSyncMaindata } from '../api/qbittorrent'
import { useInstance } from './useInstance'

export function useSyncMaindata() {
	const instance = useInstance()
	return useQuery({
		queryKey: ['syncMaindata', instance.id],
		queryFn: () => getSyncMaindata(instance.id),
		refetchInterval: instance.kind === 'transmission' ? 5000 : 2000,
	})
}
