import { DB } from '../core/db.js';

export const Admin = {

	purge: () => {
		DB.purge();
	},

	totalReset: () => {
		DB.totalReset();
	}
};
