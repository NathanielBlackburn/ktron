export const randomizeArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

export const arrayIntersection = (arr1, arr2) => {
	const set1 = new Set(arr1);
	const set2 = new Set(arr2);
	return Array.from(set1.intersection(set2));
};
