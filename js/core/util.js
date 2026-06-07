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

export const escapeHTML = (html) => {
	const escape = document.createElement('textarea');
	escape.textContent = html;
	return escape.innerHTML;
};

export const unescapeHTML = (text) => {
	const escape = document.createElement('textarea');
	escape.innerHTML = text;
	return escape.textContent;
};

export const renderTags = (text) => {
	const escaped = escapeHTML(text);
	return escaped
		.replace(/\[br\]/g, '<br>')
		.replace(/\[blue\](.*?)\[\/blue\]/g, '<span class="blue">$1</span>');
};
