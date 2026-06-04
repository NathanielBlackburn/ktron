export const GameSession = {
	code: undefined,

	get inProgress() {
		return typeof this.code !== 'undefined' && this.code !== '';
	},
};
