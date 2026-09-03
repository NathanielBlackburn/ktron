import { applyLogoDefaultUpgrade, Assets } from '../../js/core/assets.js';

const installLocalStorage = (initial = {}) => {
	const store = { ...initial };
	globalThis.window = {
		localStorage: {
			getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
			setItem: (key, value) => {
				store[key] = String(value);
			},
		},
	};
	return store;
};

console.log('Case 1: Colorado (3.1 default) upgrades to corto once.');

{
	const store = installLocalStorage({
		ktron_settings: JSON.stringify({ logo: 'colorado', language: 'pl' }),
	});
	console.assert(applyLogoDefaultUpgrade() === true, 'First upgrade should change settings.');
	const after = JSON.parse(store.ktron_settings);
	console.assert(after.logo === 'corto', 'Colorado should become corto.');
	console.assert(after.logoDefaultVersion === Assets.defaults.LOGO_DEFAULT_VERSION, 'Upgrade version should be stored.');
	console.assert(applyLogoDefaultUpgrade() === false, 'Second run should be a no-op.');
	console.assert(JSON.parse(store.ktron_settings).logo === 'corto', 'Logo should stay corto after idempotent run.');
}

console.log('Case 2: Explicit non-default logos are preserved.');

{
	const store = installLocalStorage({
		ktron_settings: JSON.stringify({ logo: 'totoro' }),
	});
	applyLogoDefaultUpgrade();
	const after = JSON.parse(store.ktron_settings);
	console.assert(after.logo === 'totoro', 'Totoro should be left alone.');
	console.assert(after.logoDefaultVersion === Assets.defaults.LOGO_DEFAULT_VERSION, 'Version flag should still be set.');
}

console.log('Case 3: Missing settings payload is ignored.');

{
	installLocalStorage({});
	console.assert(applyLogoDefaultUpgrade() === false, 'Missing ktron_settings should not throw or claim a change.');
}

console.log('All logo default upgrade tests passed.');
