export type TransmissionSession = Record<string, unknown>

export async function getTransmissionSession(instanceId: number): Promise<TransmissionSession> {
	const res = await fetch(`/api/instances/${instanceId}/qbt/v2/transmission/session`, {
		credentials: 'include',
	})
	if (!res.ok) throw new Error(`Failed to fetch Transmission session: ${res.status}`)
	return res.json()
}

export async function setTransmissionSession(
	instanceId: number,
	args: Record<string, unknown>
): Promise<void> {
	const res = await fetch(`/api/instances/${instanceId}/qbt/v2/transmission/session`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(args),
	})
	if (!res.ok) throw new Error(`Failed to save Transmission session: ${res.status}`)
}
