const Overtime = require('../js/model/overtime').Overtime;

const pointsToPlaces = (results) => {
	const places = [
		[],
		[],
		[],
	];
	let maxPoints = results[0].points;
    let currentPlace = 0;
    results.forEach((result) => {
        if (currentPlace > 2) {
            return;
        }
        if (result.points == maxPoints) {
            places[currentPlace].push(result);
        } else {
            currentPlace += places[currentPlace].length;
            maxPoints = result.points;
            if (currentPlace > 2) {
                return;
            }
            places[currentPlace].push(result);
        }
    });
	return places;
};

const padInfo = (text) => {
    let result = `\n--- ${text} `;
    return result.padEnd(100, '-') + '\n';
};

console.log(padInfo('markAnswer and endRound tests'));

console.log('Case 1: Two in first place, two in third place.');

let results = [
    {ID: 2, name: 'Czarek', order: 3, points: 3},
    {ID: 1, name: 'Darek', order: 1, points: 3},
    {ID: 3, name: 'Jarek', order: 4, points: 2},
    {ID: 4, name: 'Marek', order: 2, points: 2},
    {ID: 5, name: 'Sarek', order: 7, points: 1},
    {ID: 6, name: 'Barek', order: 5, points: 1},
    {ID: 7, name: 'Garek', order: 6, points: 1},
];

let overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 1-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 1-1: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 1-1: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 2, 'Case 1-1: There should be two people in the third place.');

overtime.markAnswer(1, 'pass');
overtime.markAnswer(2, 'fail');
overtime.markAnswer(3, 'pass');
overtime.markAnswer(4, 'fail');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 1-2: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Darek', 'Case 1-2: Darek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Czarek', 'Case 1-2: Czarek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Jarek', 'Case 1-2: Jarek should be in the third place.');

console.log('Case 2: Two in first place, one in third place.');

results = [
    {ID: 4, name: 'Marek', order: 2, points: 2},
    {ID: 5, name: 'Sarek', order: 7, points: 2},
    {ID: 1, name: 'Darek', order: 1, points: 1},
    {ID: 2, name: 'Czarek', order: 3, points: 0.5},
    {ID: 3, name: 'Jarek', order: 4, points: 0.5},
    {ID: 6, name: 'Barek', order: 5, points: 0},
    {ID: 7, name: 'Garek', order: 6, points: 0},
];

overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 2-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 2-1: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 2-1: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 1, 'Case 2-1: There should be one person in the third place.');

overtime.markAnswer(4, 'pass');
overtime.markAnswer(5, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 2-2: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 2-2: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 2-2: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 1, 'Case 2-2: There should be one person in the third place.');

overtime.markAnswer(4, 'fail');
overtime.markAnswer(5, 'pass');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 2-3: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Sarek', 'Case 2-3: Sarek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Marek', 'Case 2-3: Marek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Darek', 'Case 2-3: Darek should be in the third place.');

console.log('Case 3: Three in first place.');

results = [
    {ID: 3, name: 'Jarek', order: 4, points: 4},
    {ID: 6, name: 'Barek', order: 5, points: 4},
    {ID: 7, name: 'Garek', order: 6, points: 4},
    {ID: 4, name: 'Marek', order: 2, points: 3},
    {ID: 5, name: 'Sarek', order: 7, points: 3},
    {ID: 1, name: 'Darek', order: 1, points: 3},
    {ID: 2, name: 'Czarek', order: 3, points: 3},
];

overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 3-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 3, 'Case 3-1: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 3-1: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 3-1: There should be no people in the third place.');

overtime.markAnswer(3, 'fail');
overtime.markAnswer(6, 'pass');
overtime.markAnswer(7, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 3-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 3-1: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3-1: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 3-1: There should be no people in the third place.');

overtime.markAnswer(6, 'pass');
overtime.markAnswer(7, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 3-2: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 3-2: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3-2: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 3-2: There should be no people in the third place.');

overtime.markAnswer(6, 'fail');
overtime.markAnswer(7, 'fail');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 3-3: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 3-3: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3-3: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 3-3: There should be no people in the third place.');

overtime.markAnswer(6, 'fail');
overtime.markAnswer(7, 'pass');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 3-4: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Garek', 'Case 3-4: Garek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Barek', 'Case 3-4: Barek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Jarek', 'Case 3-4: Jarek should be in the third place.');

console.log('Case 4: Five in first place.');

results = [
    {ID: 3, name: 'Jarek', order: 4, points: 4},
    {ID: 6, name: 'Barek', order: 5, points: 4},
    {ID: 7, name: 'Garek', order: 6, points: 4},
    {ID: 1, name: 'Darek', order: 1, points: 4},
    {ID: 2, name: 'Czarek', order: 3, points: 4},
    {ID: 4, name: 'Marek', order: 2, points: 3},
    {ID: 5, name: 'Sarek', order: 7, points: 3},
];

overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 4-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 5, 'Case 4-1: There should be five people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 4-1: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 4-1: There should be no people in the third place.');

overtime.markAnswer(3, 'fail');
overtime.markAnswer(6, 'pass');
overtime.markAnswer(7, 'pass');
overtime.markAnswer(1, 'pass');
overtime.markAnswer(2, 'fail');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 4-2: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 3, 'Case 4-2: There should be three people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 4-2: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 4-2: There should be no people in the third place.');

overtime.markAnswer(6, 'pass');
overtime.markAnswer(7, 'pass');
overtime.markAnswer(1, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 4-3: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 3, 'Case 4-3: There should be three people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 4-3: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 4-3: There should be no people in the third place.');

overtime.markAnswer(6, 'pass');
overtime.markAnswer(7, 'pass');
overtime.markAnswer(1, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 4-4: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 3, 'Case 4-4: There should be three people in the first place.');
console.assert(overtime.secondPlace.length == 0, 'Case 4-4: There should be no people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 4-4: There should be no people in the third place.');

overtime.markAnswer(6, 'pass');
overtime.markAnswer(7, 'pass');
overtime.markAnswer(1, 'fail');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 4-5: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 2, 'Case 4-5: There should be two people in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 4-5: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 4-5: There should be no people in the third place.');

overtime.markAnswer(6, 'fail');
overtime.markAnswer(7, 'pass');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 4-6: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Garek', 'Case 4-6: Garek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Barek', 'Case 4-6: Barek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Darek', 'Case 4-6: Darek should be in the third place.');

console.log('Case 5: One in first place, three in second place, two pass first round.');

results = [
    {ID: 4, name: 'Marek', order: 2, points: 4},
    {ID: 2, name: 'Czarek', order: 3, points: 2.5},
    {ID: 3, name: 'Jarek', order: 4, points: 2.5},
    {ID: 7, name: 'Garek', order: 6, points: 2.5},
    {ID: 6, name: 'Barek', order: 5, points: 2},
    {ID: 5, name: 'Sarek', order: 7, points: 2},
    {ID: 1, name: 'Darek', order: 1, points: 1},
];

overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 5-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 5-1: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 3, 'Case 5-1: There should be three people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 5-1: There should be no people in the third place.');

overtime.markAnswer(2, 'pass');
overtime.markAnswer(3, 'pass');
overtime.markAnswer(7, 'fail');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 5-2: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 5-2: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 2, 'Case 5-2: There should be two people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 5-2: There should be no people in the third place.');

overtime.markAnswer(2, 'pass');
overtime.markAnswer(3, 'fail');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 5-3: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Marek', 'Case 5-3: Marek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Czarek', 'Case 5-3: Czarek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Jarek', 'Case 5-3: Jarek should be in the third place.');

console.log('Case 6: One in first place, three in second place, one passes first round.');

results = [
    {ID: 4, name: 'Marek', order: 2, points: 4},
    {ID: 2, name: 'Czarek', order: 3, points: 2.5},
    {ID: 3, name: 'Jarek', order: 4, points: 2.5},
    {ID: 7, name: 'Garek', order: 6, points: 2.5},
    {ID: 6, name: 'Barek', order: 5, points: 2},
    {ID: 5, name: 'Sarek', order: 7, points: 2},
    {ID: 1, name: 'Darek', order: 1, points: 1},
];

overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 6-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 6-1: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 3, 'Case 6-1: There should be three people in the second place.');
console.assert(overtime.thirdPlace.length == 0, 'Case 6-1: There should be no people in the third place.');

overtime.markAnswer(2, 'pass');
overtime.markAnswer(3, 'fail');
overtime.markAnswer(7, 'fail');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 6-2: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 6-2: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 6-2: There should be three people in the second place.');
console.assert(overtime.thirdPlace.length == 2, 'Case 6-2: There should be no people in the third place.');

overtime.markAnswer(3, 'fail');
overtime.markAnswer(7, 'pass');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 6-2: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Marek', 'Case 6-2: Marek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Czarek', 'Case 6-2: Czarek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Garek', 'Case 6-2: Garek should be in the third place.');

console.log('Case 7: One in first place, one in second place, three in third place.');

results = [
    {ID: 5, name: 'Sarek', order: 7, points: 7},
    {ID: 2, name: 'Czarek', order: 3, points: 6.5},
    {ID: 4, name: 'Marek', order: 2, points: 5},
    {ID: 7, name: 'Garek', order: 6, points: 5},
    {ID: 6, name: 'Barek', order: 5, points: 5},
    {ID: 3, name: 'Jarek', order: 4, points: 2.5},
    {ID: 1, name: 'Darek', order: 1, points: 1},
];

overtime = new Overtime(pointsToPlaces(results));

console.assert(!overtime.isPodiumComplete, 'Case 7-1: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 7-1: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 7-1: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 3, 'Case 7-1: There should be three people in the third place.');

overtime.markAnswer(4, 'pass');
overtime.markAnswer(7, 'pass');
overtime.markAnswer(6, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 6: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 3: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 3, 'Case 3: There should be three people in the third place.');

overtime.markAnswer(4, 'fail');
overtime.markAnswer(7, 'pass');
overtime.markAnswer(6, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 6: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 3: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 2, 'Case 3: There should be two people in the third place.');

overtime.markAnswer(7, 'fail');
overtime.markAnswer(6, 'fail');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 6: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 3: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 2, 'Case 3: There should be two people in the third place.');

overtime.markAnswer(7, 'pass');
overtime.markAnswer(6, 'pass');
overtime.endRound();

console.assert(!overtime.isPodiumComplete, 'Case 6: Podium should not be completed.');
console.assert(overtime.firstPlace.length == 1, 'Case 3: There should be one person in the first place.');
console.assert(overtime.secondPlace.length == 1, 'Case 3: There should be one person in the second place.');
console.assert(overtime.thirdPlace.length == 2, 'Case 3: There should be two people in the third place.');

overtime.markAnswer(7, 'fail');
overtime.markAnswer(6, 'pass');
overtime.endRound();

console.assert(overtime.isPodiumComplete, 'Case 6: Podium should be completed.');
console.assert(overtime.firstPlace[0].name == 'Sarek', 'Case 3: Sarek should be in the first place.');
console.assert(overtime.secondPlace[0].name == 'Czarek', 'Case 3: Czarek should be in the second place.');
console.assert(overtime.thirdPlace[0].name == 'Barek', 'Case 3: Barek should be in the third place.');

console.log(padInfo('serialization tests'));

results = [
    {ID: 2, name: 'Czarek', order: 3, points: 3},
    {ID: 1, name: 'Darek', order: 1, points: 3},
    {ID: 3, name: 'Jarek', order: 4, points: 2},
    {ID: 4, name: 'Marek', order: 2, points: 2},
    {ID: 5, name: 'Sarek', order: 7, points: 1},
    {ID: 6, name: 'Barek', order: 5, points: 1},
    {ID: 7, name: 'Garek', order: 6, points: 1},
];

overtime = new Overtime(pointsToPlaces(results));

console.log('Case 1: In and out.');

let overtimeJSON = overtime.stringify();
let restoredOvertime = Overtime.initFromJSON(overtimeJSON);

console.assert(restoredOvertime.equals(overtime));

console.log('Case 2: Change status.');

overtime.markAnswer(3, 'fail');
overtime.markAnswer(1, 'pass');
overtimeJSON = overtime.stringify();
restoredOvertime = Overtime.initFromJSON(overtimeJSON);

console.assert(restoredOvertime.equals(overtime), 'Case 2: Restored is not equal to the original.');
console.assert(restoredOvertime.thirdPlace[0].status == 'fail', `Jarek should be failed, instead his status is: ${restoredOvertime.thirdPlace[0].status}`);
console.assert(restoredOvertime.firstPlace[1].status == 'pass', `Darek should be passed, instead his status is: ${restoredOvertime.firstPlace[1].status}`);
