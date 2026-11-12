import { useQuery } from '@tanstack/react-query'
import { getTransferInfo } from '../api/qbittorrent'
import { useInstance } from './useInstance'

export function useTransferInfo() {
	const instance = useInstance()
	return useQuery({
		queryKey: ['transferInfo', instance.id],
		queryFn: () => getTransferInfo(instance.id),
		refetchInterval: instance.kind === 'transmission' ? 5000 : 2000,
	})
}
