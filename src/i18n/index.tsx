import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { en } from './locales/en'
import { zhCN } from './locales/zh-CN'

export type Lang = 'zh-CN' | 'en'

export type LocaleDict = Record<string, string>

export interface I18nContextValue {
	lang: Lang
	setLang: (lang: Lang) => void
	t: (key: string, params?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'qbitwebui.lang'
const DEFAULT_LANG: Lang = 'zh-CN'

const dictionaries: Record<Lang, LocaleDict> = {
	'zh-CN': zhCN,
	'en': en,
}

let currentLang: Lang = DEFAULT_LANG

export function getInitialLang(): Lang {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored === 'en' || stored === 'zh-CN') return stored
	} catch {}
	return DEFAULT_LANG
}

export function formatMessage(
	dict: LocaleDict,
	fallbackDict: LocaleDict,
	key: string,
	params?: Record<string, string | number>
): string {
	let text = dict[key] ?? fallbackDict[key] ?? key
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replaceAll(`{${k}}`, String(v))
		}
	}
	return text
}

export function tGlobal(key: string, params?: Record<string, string | number>): string {
	return formatMessage(dictionaries[currentLang] ?? dictionaries['zh-CN'], dictionaries.en, key, params)
}

export function getCurrentLang(): Lang {
	return currentLang
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(getInitialLang)

	const setLang = (next: Lang) => {
		setLangState(next)
		currentLang = next
		try {
			localStorage.setItem(STORAGE_KEY, next)
		} catch {}
		document.documentElement.lang = next
	}

	useEffect(() => {
		currentLang = lang
		document.documentElement.lang = lang
	}, [lang])

	const value = useMemo<I18nContextValue>(() => {
		const dict = dictionaries[lang] ?? dictionaries['zh-CN']
		const fallback = dictionaries.en
		const t = (key: string, params?: Record<string, string | number>) => {
			return formatMessage(dict, fallback, key, params)
		}
		return { lang, setLang, t }
	}, [lang])

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext)
	if (!ctx) {
		return {
			lang: currentLang,
			setLang: () => {},
			t: (key, params) =>
				formatMessage(dictionaries[currentLang] ?? dictionaries['zh-CN'], dictionaries.en, key, params),
		}
	}
	return ctx
}

export function translateError(
	rawError: string | undefined | null,
	t: (key: string, params?: Record<string, string | number>) => string
): string {
	if (!rawError) return ''

	const trimmed = rawError.trim()

	// Exact matches
	const directMap: Record<string, string> = {
		'Unauthorized': 'errors.unauthorized',
		'Registration is disabled': 'errors.registrationDisabled',
		'Username must be 3-32 characters': 'errors.usernameLength',
		'Username already exists': 'errors.usernameExists',
		'Invalid credentials': 'errors.invalidCredentials',
		'Current password is incorrect': 'errors.currentPasswordIncorrect',
		'Credentials required': 'errors.credentialsRequired',
		'Connection failed': 'errors.connectionFailed',
		'Instance not found': 'errors.instanceNotFound',
		'Failed to connect to qBittorrent instance': 'errors.failedToConnectQbit',
		'Agent not enabled for this instance': 'errors.agentNotEnabled',
		'Agent not reachable': 'errors.agentNotReachable',
		'Agent not reachable - try custom URL': 'errors.agentNotReachableCustom',
		'Agent is reachable': 'errors.agentReachable',
		'Agent not responding': 'errors.agentNotResponding',
		'Failed to connect to agent': 'errors.failedToConnectAgent',
		'Missing required fields': 'errors.missingRequiredFields',
		'URL is required': 'errors.urlRequired',
		'Credentials required when skip_auth is disabled': 'errors.credentialsRequiredWhenSkipAuth',
		'Failed to create instance': 'errors.failedToCreateInstance',
		'Instance with this label already exists': 'errors.instanceLabelExists',
		'Failed to update instance': 'errors.failedToUpdateInstance',
		'Enter a qBittorrent URL first': 'errors.enterQbitUrlFirst',
		'New passwords do not match': 'errors.passwordsDoNotMatch',
		'Password must be at least 8 characters': 'errors.passwordLength',
		'Failed to change password': 'errors.failedToChangePassword',
		'Unsupported integration type': 'errors.unsupportedIntegrationType',
		'Integration not found': 'errors.integrationNotFound',
		'Failed to create integration': 'errors.failedToCreateIntegration',
		'Integration with this label already exists': 'errors.integrationLabelExists',
		'URL and API key are required': 'errors.urlAndApiKeyRequired',
		'Failed to fetch indexers': 'errors.failedToFetchIndexers',
		'Failed to fetch categories': 'errors.failedToFetchCategories',
		'Query is required': 'errors.queryRequired',
		'Search failed': 'errors.searchFailed',
		'Failed to grab release': 'errors.failedToGrabRelease',
		'Rate limited': 'errors.rateLimited',
		'Timeout': 'errors.timeout',
		'Magnet links not supported': 'errors.magnetNotSupported',
		'No download URL available': 'errors.noDownloadUrlAvailable',
		'Failed to authenticate with qBittorrent': 'errors.failedAuthQbit',
		'File browser not configured': 'errors.fileBrowserNotConfigured',
		'Invalid path': 'errors.invalidPath',
		'Path not found': 'errors.pathNotFound',
		'Not a directory': 'errors.notADirectory',
		'Failed to list directory': 'errors.failedToListDir',
		'Path is required': 'errors.pathRequired',
		'File not found': 'errors.fileNotFound',
		'Failed to download file': 'errors.failedToDownloadFile',
		'Destination must be a directory': 'errors.destMustBeDir',
		'Destination does not exist': 'errors.destNotExist',
		'Cannot rename root directory': 'errors.cannotRenameRoot',
		'Scan already in progress': 'errors.scanInProgress',
		'No scan running': 'errors.noScanRunning',
		'Searchee not found': 'errors.searcheeNotFound',
		'No Prowlarr integration configured': 'errors.noProwlarrConfigured',
	}

	if (directMap[trimmed]) {
		return t(directMap[trimmed])
	}

	// Pattern matches
	const tooManyAttemptsMatch = trimmed.match(/^Too many attempts\. Try again in (\d+)s$/)
	if (tooManyAttemptsMatch) {
		return t('errors.tooManyAttempts', { seconds: tooManyAttemptsMatch[1] })
	}

	const connectedQbitMatch = trimmed.match(/^Connected! qBittorrent (.+)$/)
	if (connectedQbitMatch) {
		return t('instances.connectedVersion', { version: connectedQbitMatch[1] })
	}

	const loginFailedHttpMatch = trimmed.match(/^Login failed: HTTP (\d+)$/)
	if (loginFailedHttpMatch) {
		return t('errors.loginFailedHttp', { status: loginFailedHttpMatch[1] })
	}

	const connFailedHttpMatch = trimmed.match(/^Connection failed: HTTP (\d+)$/)
	if (connFailedHttpMatch) {
		return t('errors.connectionFailedHttp', { status: connFailedHttpMatch[1] })
	}

	const searchFailedHttpMatch = trimmed.match(/^Search failed: HTTP (\d+)$/)
	if (searchFailedHttpMatch) {
		return t('errors.searchFailedHttp', { status: searchFailedHttpMatch[1] })
	}

	return trimmed
}
