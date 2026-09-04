import { DB } from '../core/db.js';
import { QuizEngine } from '../quiz/quizEngine.js';

export const Admin = {

	purge: () => {
		QuizEngine.resetDontRandomize();
		DB.purge();
	},

	totalReset: () => {
		QuizEngine.resetDontRandomize();
		DB.totalReset();
	}
};
