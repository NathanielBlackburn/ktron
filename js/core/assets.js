export const Assets = {
	defaults: {
		LOGO_IMAGE: 'colorado',
		VICTORY_IMAGE: 'victory_image_default',
		VICTORY_FANFARE: 'victory_fanfare_default',
	},
	imageTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pre:question', 'pre:answer'],
	audioTypes: ['mp3', 'm4a'],
	videoTypes: ['mp4', 'webm'],
	isVideoFileName(fileName) {
		const ext = fileName.split('.').pop()?.toLowerCase();
		return this.videoTypes.includes(ext);
	},
};
