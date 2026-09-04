export const Assets = {
	defaults: {
		LOGO_IMAGE: 'corto',
		/** Bumped when the shipping default logo changes; drives one-time settings upgrade. */
		LOGO_DEFAULT_VERSION: '3.2.0',
		VICTORY_IMAGE: 'victory_image_default',
		VICTORY_FANFARE: 'victory_fanfare_default',
	},
	/** Prior app-default logos that should be replaced when LOGO_DEFAULT_VERSION advances. */
	previousDefaultLogos: ['colorado'],
	imageTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pre:question', 'pre:answer'],
	audioTypes: ['mp3', 'm4a'],
	videoTypes: ['mp4', 'webm'],
	isVideoFileName(fileName) {
		const ext = fileName.split('.').pop()?.toLowerCase();
		return this.videoTypes.includes(ext);
	},
};

/**
 * One-time upgrade of the stored logo when the app default changes.
 * Replaces missing / previous-default logos; leaves explicit choices (totoro, custom, …) alone.
 * Idempotent via ktron_settings.logoDefaultVersion.
 */
export const applyLogoDefaultUpgrade = () => {
	if (typeof window === 'undefined' || !window.localStorage) {
		return false;
	}
	let stored;
	try {
		const raw = window.localStorage.getItem('ktron_settings');
		if (!raw) {
			return false;
		}
		stored = JSON.parse(raw);
	} catch {
		return false;
	}
	const targetVersion = Assets.defaults.LOGO_DEFAULT_VERSION;
	if (stored.logoDefaultVersion === targetVersion) {
		return false;
	}
	const previousDefaults = Assets.previousDefaultLogos || [];
	if (typeof stored.logo === 'undefined' || !stored.logo || previousDefaults.includes(stored.logo)) {
		stored.logo = Assets.defaults.LOGO_IMAGE;
	}
	stored.logoDefaultVersion = targetVersion;
	window.localStorage.setItem('ktron_settings', JSON.stringify(stored));
	return true;
};
