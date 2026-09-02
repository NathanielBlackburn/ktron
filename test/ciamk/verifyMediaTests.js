import { getBaseFileNameFromAlt, isAccountedAltFile } from '../../tools/ciamk.js';

console.log('Case 1: Alt filenames map back to their base file.');

console.assert(getBaseFileNameFromAlt('101-alt.png') === '101.png', 'Question alt image should map to base image.');
console.assert(getBaseFileNameFromAlt('69a-alt.webp') === '69a.webp', 'Answer alt image should map to base image.');
console.assert(getBaseFileNameFromAlt('lit-a-alt.png') === 'lit-a.png', 'Category cover alt image should map to base image.');
console.assert(getBaseFileNameFromAlt('101.png') === null, 'Base image should not be treated as alt.');
console.assert(getBaseFileNameFromAlt('random-alt-extra.png') === null, 'Only filenames ending with -alt should be treated as alt versions.');

console.log('Case 2: Accounted alt files are excluded from redundancy checks.');

const foundFiles = ['101.png', '042a.jpg', 'geo.png'];
console.assert(isAccountedAltFile('101-alt.png', foundFiles), 'Alt of accounted question image should be accepted.');
console.assert(isAccountedAltFile('042a-alt.jpg', foundFiles), 'Alt of accounted answer image should be accepted.');
console.assert(isAccountedAltFile('geo-alt.png', foundFiles), 'Alt of accounted cover image should be accepted.');
console.assert(!isAccountedAltFile('999-alt.png', foundFiles), 'Alt without accounted base should stay redundant.');
console.assert(!isAccountedAltFile('101.png', foundFiles), 'Base file itself is not an alt file.');

console.log('All verifyMedia alt-file tests passed.');
