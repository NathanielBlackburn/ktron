import { DB } from '../db.js';
import { Overtime } from './overtime.js';

export const OvertimeRepository = {

	load() {
		const data = DB.fetchOvertimeData();
		return data ? Overtime.hydrate(data) : null;
	},

	save(overtime) {
		DB.saveOvertimeData(overtime.serialize());
	},

	begin(overtime) {
		DB.setGameStatus('overtime');
		OvertimeRepository.save(overtime);
		return overtime;
	},
};
