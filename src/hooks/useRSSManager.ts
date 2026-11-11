import { useState, useEffect, useCallback, useRef } from 'react'
import { type Instance } from '../api/instances'
import {
	getRSSItems,
	addRSSFeed,
	addRSSFolder,
	removeRSSItem,
	refreshRSSItem,
	getRSSRules,
	setRSSRule,
	removeRSSRule,
	getMatchingArticles,
	getCategories,
	addTorrent,
	type Category,
} from '../api/qbittorrent'
import type { RSSItems, RSSFeedData, RSSRule, RSSRules, MatchingArticles } from '../types/rss'
import { tGlobal } from '../i18n'

const FEED_REFRESH_DELAY = 500

export interface FlatFeed {
	path: string
	name: string
	url: string
	isFolder: boolean
	depth: number
	data?: RSSFeedData
}

export function flattenFeeds(items: RSSItems, parentPath = '', depth = 0): FlatFeed[] {
	const result: FlatFeed[] = []
	for (const [name, value] of Object.entries(items)) {
		const path = parentPath ? `${parentPath}\\${name}` : name
		if (typeof value === 'string') {
			result.push({ path, name, url: value, isFolder: false, depth })
		} else if (value && typeof value === 'object' && 'uid' in value) {
			result.push({ path, name, url: (value as RSSFeedData).url, isFolder: false, depth, data: value as RSSFeedData })
		} else {
			result.push({ path, name, url: '', isFolder: true, depth })
			result.push(...flattenFeeds(value as RSSItems, path, depth + 1))
		}
	}
	return result
}

export const defaultRule: RSSRule = {
	enabled: true,
	mustContain: '',
	mustNotContain: '',
	useRegex: false,
	episodeFilter: '',
	smartFilter: false,
	previouslyMatchedEpisodes: [],
	affectedFeeds: [],
	ignoreDays: 0,
	lastMatch: '',
	addPaused: null,
	assignedCategory: '',
	savePath: '',
}

interface UseRSSManagerOptions {
	instances: Instance[]
	onViewChange?: (view: 'list' | 'articles' | 'editor') => void
}

export function useRSSManager({ instances, onViewChange }: UseRSSManagerOptions) {
	const [selectedInstance, setSelectedInstance] = useState<Instance | null>(instances[0] || null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	const [feeds, setFeeds] = useState<FlatFeed[]>([])
	const [selectedFeed, setSelectedFeed] = useState<FlatFeed | null>(null)
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
	const [showAddFeed, setShowAddFeed] = useState(false)
	const [showAddFolder, setShowAddFolder] = useState(false)
	const [feedUrl, setFeedUrl] = useState('')
	const [feedPath, setFeedPath] = useState('')
	const [folderName, setFolderName] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [refreshing, setRefreshing] = useState<string | null>(null)
	const [deleteConfirm, setDeleteConfirm] = useState<FlatFeed | null>(null)

	const [rules, setRules] = useState<RSSRules>({})
	const [selectedRule, setSelectedRule] = useState<string | null>(null)
	const [editingRule, setEditingRule] = useState<RSSRule | null>(null)
	const [newRuleName, setNewRuleName] = useState('')
	const [showNewRule, setShowNewRule] = useState(false)
	const [ruleDeleteConfirm, setRuleDeleteConfirm] = useState<string | null>(null)
	const [matchingArticles, setMatchingArticles] = useState<MatchingArticles | null>(null)
	const [loadingMatches, setLoadingMatches] = useState(false)
	const [savingRule, setSavingRule] = useState(false)
	const [ruleSaved, setRuleSaved] = useState(false)

	const [categories, setCategories] = useState<Record<string, Category>>({})
	const [grabbing, setGrabbing] = useState<string | null>(null)
	const [grabResult, setGrabResult] = useState<{ id: string; success: boolean } | null>(null)
	const [instanceDropdown, setInstanceDropdown] = useState<string | null>(null)

	const mountedRef = useRef(true)
	const ruleSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const grabResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
			if (ruleSavedTimerRef.current) clearTimeout(ruleSavedTimerRef.current)
			if (grabResultTimerRef.current) clearTimeout(grabResultTimerRef.current)
		}
	}, [])

	const loadFeeds = useCallback(async () => {
		if (!selectedInstance) return
		try {
			const items = await getRSSItems(selectedInstance.id, true)
			if (!mountedRef.current) return
			const flat = flattenFeeds(items)
			setFeeds(flat)
			setExpandedFolders(new Set(flat.filter((f) => f.isFolder).map((f) => f.path)))
			setSelectedFeed((prev) => (prev ? flat.find((f) => f.path === prev.path) || null : null))
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedLoadFeeds'))
		}
	}, [selectedInstance])

	const loadRules = useCallback(async () => {
		if (!selectedInstance) return
		try {
			const data = await getRSSRules(selectedInstance.id)
			if (!mountedRef.current) return
			setRules(data)
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedLoadRules'))
		}
	}, [selectedInstance])

	const loadCategories = useCallback(async () => {
		if (!selectedInstance) return
		try {
			const data = await getCategories(selectedInstance.id)
			if (!mountedRef.current) return
			setCategories(data)
		} catch {
			if (!mountedRef.current) return
			setCategories({})
		}
	}, [selectedInstance])

	useEffect(() => {
		if (!selectedInstance) return
		queueMicrotask(() => {
			setLoading(true)
			setError('')
			Promise.all([loadFeeds(), loadRules(), loadCategories()]).finally(() => {
				if (mountedRef.current) setLoading(false)
			})
		})
	}, [selectedInstance, loadFeeds, loadRules, loadCategories])

	function selectRule(ruleName: string | null) {
		setSelectedRule(ruleName)
		if (ruleName && rules[ruleName]) {
			setEditingRule({ ...rules[ruleName] })
			setMatchingArticles(null)
		} else {
			setEditingRule(null)
			setMatchingArticles(null)
		}
	}

	function extractFeedName(url: string): string {
		try {
			const urlObj = new URL(url)
			const pathParts = urlObj.pathname.split('/').filter(Boolean)
			if (pathParts.length > 0) {
				const lastPart = pathParts[pathParts.length - 1]
				return lastPart.replace(/\.(xml|rss|atom)$/i, '') || urlObj.hostname
			}
			return urlObj.hostname
		} catch {
			return url.slice(0, 30)
		}
	}

	async function handleAddFeed(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedInstance) return
		setSubmitting(true)
		setError('')
		const url = feedUrl
		const folder = feedPath
		try {
			const feedName = extractFeedName(url)
			const path = folder ? `${folder}\\${feedName}` : undefined
			await addRSSFeed(selectedInstance.id, url, path)
			setShowAddFeed(false)
			setFeedUrl('')
			setFeedPath('')
			await new Promise((r) => setTimeout(r, FEED_REFRESH_DELAY))
			if (!mountedRef.current) return
			const items = await getRSSItems(selectedInstance.id, true)
			if (!mountedRef.current) return
			const flat = flattenFeeds(items)
			const newFeed = flat.find((f) => !f.isFolder && f.url === url)
			if (newFeed) {
				await refreshRSSItem(selectedInstance.id, newFeed.path)
				await new Promise((r) => setTimeout(r, FEED_REFRESH_DELAY))
				if (!mountedRef.current) return
				const updatedItems = await getRSSItems(selectedInstance.id, true)
				if (!mountedRef.current) return
				const updatedFlat = flattenFeeds(updatedItems)
				setFeeds(updatedFlat)
				setExpandedFolders(new Set(updatedFlat.filter((f) => f.isFolder).map((f) => f.path)))
				setSelectedFeed(updatedFlat.find((f) => f.path === newFeed.path) || null)
			} else {
				setFeeds(flat)
				setExpandedFolders(new Set(flat.filter((f) => f.isFolder).map((f) => f.path)))
			}
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedAddFeed'))
		} finally {
			if (mountedRef.current) setSubmitting(false)
		}
	}

	async function handleAddFolder(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedInstance) return
		setSubmitting(true)
		setError('')
		try {
			await addRSSFolder(selectedInstance.id, folderName)
			setShowAddFolder(false)
			setFolderName('')
			await loadFeeds()
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedAddFolder'))
		} finally {
			if (mountedRef.current) setSubmitting(false)
		}
	}

	async function handleDeleteItem() {
		if (!selectedInstance || !deleteConfirm) return
		const deletingPath = deleteConfirm.path
		try {
			await removeRSSItem(selectedInstance.id, deletingPath)
			setDeleteConfirm(null)
			if (selectedFeed?.path === deletingPath) {
				setSelectedFeed(null)
				onViewChange?.('list')
			}
			await loadFeeds()
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedDelete'))
		}
	}

	async function handleRefresh(feed: FlatFeed) {
		if (!selectedInstance) return
		setRefreshing(feed.path)
		try {
			await refreshRSSItem(selectedInstance.id, feed.path)
			await loadFeeds()
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedRefresh'))
		} finally {
			if (mountedRef.current) setRefreshing(null)
		}
	}

	async function handleSaveRule() {
		if (!selectedInstance || !selectedRule || !editingRule) return
		setSavingRule(true)
		setError('')
		setRuleSaved(false)
		try {
			await setRSSRule(selectedInstance.id, selectedRule, editingRule)
			await loadRules()
			if (!mountedRef.current) return
			setRuleSaved(true)
			if (ruleSavedTimerRef.current) clearTimeout(ruleSavedTimerRef.current)
			ruleSavedTimerRef.current = setTimeout(() => {
				if (mountedRef.current) setRuleSaved(false)
			}, 2000)
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedSaveRule'))
		} finally {
			if (mountedRef.current) setSavingRule(false)
		}
	}

	function handleCancelEdit() {
		if (selectedRule && rules[selectedRule]) {
			setEditingRule({ ...rules[selectedRule] })
		}
		setMatchingArticles(null)
	}

	async function handleCreateRule(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedInstance || !newRuleName.trim()) return
		const ruleName = newRuleName.trim()
		setSubmitting(true)
		setError('')
		try {
			await setRSSRule(selectedInstance.id, ruleName, defaultRule)
			setShowNewRule(false)
			setNewRuleName('')
			await loadRules()
			if (!mountedRef.current) return
			selectRule(ruleName)
			onViewChange?.('editor')
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedCreateRule'))
		} finally {
			if (mountedRef.current) setSubmitting(false)
		}
	}

	async function handleDeleteRule() {
		if (!selectedInstance || !ruleDeleteConfirm) return
		const ruleName = ruleDeleteConfirm
		try {
			await removeRSSRule(selectedInstance.id, ruleName)
			setRuleDeleteConfirm(null)
			if (selectedRule === ruleName) {
				selectRule(null)
				onViewChange?.('list')
			}
			await loadRules()
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedDeleteRule'))
		}
	}

	async function handlePreviewMatches() {
		if (!selectedInstance || !selectedRule) return
		setLoadingMatches(true)
		try {
			const data = await getMatchingArticles(selectedInstance.id, selectedRule)
			if (!mountedRef.current) return
			setMatchingArticles(data)
		} catch (err) {
			if (!mountedRef.current) return
			setError(err instanceof Error ? err.message : tGlobal('rss.failedLoadMatches'))
		} finally {
			if (mountedRef.current) setLoadingMatches(false)
		}
	}

	async function handleGrabArticle(url: string, articleId: string, instanceId: number) {
		setGrabbing(articleId)
		setGrabResult(null)
		try {
			await addTorrent(instanceId, { urls: url })
			if (!mountedRef.current) return
			setGrabResult({ id: articleId, success: true })
			if (grabResultTimerRef.current) clearTimeout(grabResultTimerRef.current)
			grabResultTimerRef.current = setTimeout(() => {
				if (mountedRef.current) setGrabResult(null)
			}, 3000)
		} catch {
			if (!mountedRef.current) return
			setGrabResult({ id: articleId, success: false })
		} finally {
			if (mountedRef.current) {
				setGrabbing(null)
				setInstanceDropdown(null)
			}
		}
	}

	function toggleFolder(path: string) {
		setExpandedFolders((prev) => {
			const next = new Set(prev)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			return next
		})
	}

	function selectInstance(instance: Instance) {
		setSelectedInstance(instance)
		setSelectedFeed(null)
		selectRule(null)
	}

	function clearError() {
		setError('')
	}

	function cancelAddFeed() {
		setShowAddFeed(false)
		setFeedUrl('')
		setFeedPath('')
	}

	function cancelAddFolder() {
		setShowAddFolder(false)
		setFolderName('')
	}

	function cancelNewRule() {
		setShowNewRule(false)
		setNewRuleName('')
	}

	const visibleFeeds = feeds.filter((f) => {
		if (f.depth === 0) return true
		const parts = f.path.split('\\')
		for (let i = 1; i < parts.length; i++) {
			const parentPath = parts.slice(0, i).join('\\')
			if (!expandedFolders.has(parentPath)) return false
		}
		return true
	})

	const feedUrls = feeds.filter((f) => !f.isFolder).map((f) => f.url)
	const feedArticles = selectedFeed?.data?.articles || []

	return {
		selectedInstance,
		loading,
		error,
		feeds,
		visibleFeeds,
		selectedFeed,
		expandedFolders,
		showAddFeed,
		showAddFolder,
		feedUrl,
		feedPath,
		folderName,
		submitting,
		refreshing,
		deleteConfirm,
		rules,
		selectedRule,
		editingRule,
		newRuleName,
		showNewRule,
		ruleDeleteConfirm,
		matchingArticles,
		loadingMatches,
		savingRule,
		ruleSaved,
		categories,
		grabbing,
		grabResult,
		instanceDropdown,
		feedUrls,
		feedArticles,
		setSelectedFeed,
		setShowAddFeed,
		setShowAddFolder,
		setFeedUrl,
		setFeedPath,
		setFolderName,
		setDeleteConfirm,
		selectRule,
		setEditingRule,
		setNewRuleName,
		setShowNewRule,
		setRuleDeleteConfirm,
		setInstanceDropdown,
		selectInstance,
		clearError,
		cancelAddFeed,
		cancelAddFolder,
		cancelNewRule,
		toggleFolder,
		handleAddFeed,
		handleAddFolder,
		handleDeleteItem,
		handleRefresh,
		handleSaveRule,
		handleCancelEdit,
		handleCreateRule,
		handleDeleteRule,
		handlePreviewMatches,
		handleGrabArticle,
	}
}
