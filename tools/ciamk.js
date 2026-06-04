const CIAMK_VERSION = '1.3.1';

import * as fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
// import { EOL } from "node:os";
// const SEP = path.sep;

const MEDIATYPES = {
    image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    audio: ['mp3', 'm4a'],
    video: ['mp4']
};

const padId = (id) => {
    let result = id;
    while (!/^\d{3}/.test(result)) {
        result = '0' + result;
    }
    return result;
};

const range = (start, length) => {
    return [...Array(length).keys().map((key) => key + start)];
};

const printLogs = (logs) => {
    for (const log of logs) {
        if (typeof log === 'string') {
            console.warn(log);
        } else if (typeof log === 'object') {
            if (typeof log.type === 'undefined' || log.type == 'warn') {
                console.warn(log.log);
            } else if (log.type == 'info') {
                console.info(log.log);
            } else if (log.type == 'error') {
                console.error(log.log);
            }
        }
    }
};

const QUIZ_FILES_PATH = './js/quizFiles.js';

const readQuizFileCodes = () => {
    if (!fs.existsSync(QUIZ_FILES_PATH)) {
        return null;
    }
    const quizFiles = fs.readFileSync(QUIZ_FILES_PATH, 'utf8');
    const windowAssign = quizFiles.match(/window\.ktronQuizFiles\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (windowAssign) {
        return JSON.parse(windowAssign[1]);
    }
    const matches = quizFiles.match(/(?:export\s+)?const\s+ktronQuizFiles\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (matches) {
        return JSON.parse(matches[1]);
    }
    const legacy = quizFiles.match(/\[[\s\S]*\]/);
    return legacy ? JSON.parse(legacy[0]) : [];
};

const writeQuizFiles = (codes) => {
    fs.writeFileSync(QUIZ_FILES_PATH, `window.ktronQuizFiles = ${JSON.stringify(codes)};\n`);
};

const addCodeToQuizFiles = async (code) => {
    let codes = readQuizFileCodes() ?? [];
    if (!codes.includes(code)) {
        codes.push(code);
    }
    writeQuizFiles(codes);
};

const removeCodeFromQuizFiles = async (rl) => {
    const logs = [];
    if (fs.existsSync(QUIZ_FILES_PATH)) {
        const parsed = readQuizFileCodes();
        if (!parsed?.length) {
            logs.push({ log: '\nLista konkursów jest pusta.', type: 'error' });
        } else {
            let codes = parsed;
            console.warn('\nUsuwanie quizu z aplikacji');
            codes.forEach((code, index) => {
                console.log(`${index + 1} - ${code}`);
            });
            console.log(`q - Wyjście z usuwania`);
            console.log('\nKtóry konkurs chcesz usunąć?');
            let choice;
            while (!(range(1, codes.length).map((n) => n.toString()).concat(['q'])).includes(choice)) {
                if (typeof choice !== 'undefined') {
                    console.warn('\nWybierz jedną z opcji\n');
                }
                choice = (await rl.question('> ')).trim();
            }
            if (choice == 'q') {
                return;
            } else {
                const code = codes[parseInt(choice) - 1];
                codes = codes.filter((existingCode) => existingCode != code);
                writeQuizFiles(codes);
                logs.push({ log: `\nUsunięto: ${code}`, type: 'warn' });
                printLogs(logs);
                return;
            }
        }
    } else {
        logs.push({ log: '\nLista konkursów jeszcze nie stworzona!', type: 'error' });
    }
    printLogs(logs);
};

const migrateOldQuizes = async (rl) => {
    const logs = [];
    let migrated = false;
    const pathName = './pytania/js';
    if (fs.existsSync(pathName)) {
        const files = fs.readdirSync(pathName, { withFileTypes: true });
        for (const file of files) {
            if (file.name.endsWith('.js')) {
                const filePath = `${file.parentPath}/${file.name}`;
                const fileContents = fs.readFileSync(filePath).toString();
                const codeMatch = fileContents.match(/"code":"(.+?)"/);
                if (codeMatch) {
                    const code = codeMatch[1];
                    if (fs.existsSync(`./pytania/${code}`)) {
                        fs.cpSync(filePath, `./pytania/${code}/${code}.js`);
                        await addCodeToQuizFiles(code);
                        migrated = true;
                        logs.push({ log: `Zmigrowano: ${code}`, type: 'warn' });
                    } else {
                        logs.push({ log: `Znaleziono konkurs o kodzie ${code}, ale w katalogu "pytania" brak folderu ${code}`, type: 'error' });
                    }
                } else {
                    logs.push(`Plik ${filePath} wydaje się wadliwy.`);
                }
            }
        }
    } else {
        logs.push({ log: 'Nie znaleziono katalogu z quizami z poprzedniej wersji Konkursotrona (katalogu {pytania/js})', type: 'error' });
    }
    printLogs(logs);
};

const findFile = (pathName, id, mediaType, context = 'question') => {
    const suffix = (context == 'answer') ? 'a' : '';
    const extensions = MEDIATYPES[mediaType];
    const candidates = extensions.flatMap((ext) => {
        return [
            `${id}${suffix}.${ext.toLowerCase()}`, `${id.substring(1, 3)}${suffix}.${ext.toLowerCase()}`, `${id.substring(2, 3)}${suffix}.${ext.toLowerCase()}`,
            `${id}${suffix}.${ext.toUpperCase()}`, `${id.substring(1, 3)}${suffix}.${ext.toUpperCase()}`, `${id.substring(2, 3)}${suffix}.${ext.toUpperCase()}`
        ];
    });
    const found = candidates.find((candidate) => {
        return fs.existsSync(`${pathName}/${candidate}`);
    });
    return found ? `${pathName}/${found}` : undefined;
};

const normaliseFileName = (filePath) => {
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const newPath = `${dir}/${padId(fileName)}${ext.toLowerCase()}`;
    fs.renameSync(filePath, filePath + '_temp');
    fs.renameSync(filePath + '_temp', newPath);
    return newPath;
};

const verifyMedia = async (code, questions) => {
    const pathName = `./pytania/${code}`;
    let errors = [];
    let warnings = [];
    let ids = [];
    let foundFiles = [];
    questions.forEach((question) => {
        if (ids.includes(question.id)) {
            errors.push(`Powtórzone id pytania: ${question.id}`);
        }
        ids.push(question.id);
        if (question.questionType) {
            const questionMediaTypes = question.questionType.split('|');
            const resultQuestionTypes = [];
            questionMediaTypes.forEach((mediaType) => {
                const foundFile = findFile(pathName, question.id, mediaType, 'question');
                if (foundFile) {
                    const newPath = normaliseFileName(foundFile);
                    resultQuestionTypes.push(path.extname(newPath).replace('.', ''));
                    foundFiles.push(path.basename(newPath));
                } else {
                    errors.push(`Brak pliku: ${question.id}`);
                }
            });
            if (resultQuestionTypes.count == questionMediaTypes.count) {
                question.questionType = resultQuestionTypes.join('|');
            }
        }
        if (question.answerType) {
            const answerMediaTypes = question.answerType.split('|');
            const answerQuestionTypes = [];
            answerMediaTypes.forEach((mediaType) => {
                const foundFile = findFile(pathName, question.id, mediaType, 'answer');
                if (foundFile) {
                    const newPath = normaliseFileName(foundFile);
                    answerQuestionTypes.push(path.extname(newPath).replace('.', ''));
                    foundFiles.push(path.basename(newPath));
                } else {
                    errors.push(`Brak pliku: ${question.id}a`);
                }
            });
            if (answerQuestionTypes.count == answerMediaTypes.count) {
                question.answerType = answerQuestionTypes.join('|');
            }
        }
    });
    let allFiles = fs.readdirSync(pathName, { withFileTypes: true });
    allFiles = allFiles.filter((file) => {
        return !foundFiles.includes(file.name)
            && !file.name.endsWith('.csv')
            && !file.name.endsWith('.js');
    });
    if (allFiles.length) {
        allFiles.forEach((file) => {
            warnings.push(`Nadmiarowy plik: ${file.name}`);
        });
    }
    if (errors.length) {
        return { success: false, warnings: warnings, errors: errors };
    } else {
        return { success: true };
    }
};

const checkCSVColumns = (rec) => {
    const fields = ['question', 'questionType', 'answer', 'answerType'];
    return fields.every((field) => typeof rec[field] !== 'undefined');
};

const arrayIntersection = (arr1, arr2) => {
	const set1 = new Set(arr1);
	const set2 = new Set(arr2);
	return Array.from(set1.intersection(set2));
};

const normaliseMediaType = (question) => {
    const result = structuredClone(question);

    const questionMediaTypes = question.questionType.split('|');
    let intersection = arrayIntersection(MEDIATYPES.image.concat('image'), questionMediaTypes);
    const resultQuestionType = [];
    if (intersection.length) {
        resultQuestionType.push('image');
    }
    intersection = arrayIntersection(MEDIATYPES.audio.concat('audio'), questionMediaTypes);
    if (intersection.length) {
        resultQuestionType.push('audio');
    }
    intersection = arrayIntersection(MEDIATYPES.video.concat('video'), questionMediaTypes);
    if (intersection.length) {
        resultQuestionType.push('video');
    }
    result.questionType = resultQuestionType.join('|');

    const answerMediaTypes = question.answerType.split('|');
    intersection = arrayIntersection(MEDIATYPES.image.concat('image'), answerMediaTypes);
    const resultAnswerType = [];
    if (intersection.length) {
        resultAnswerType.push('image');
    }
    intersection = arrayIntersection(MEDIATYPES.audio.concat('audio'), answerMediaTypes);
    if (intersection.length) {
        resultAnswerType.push('audio');
    }
    intersection = arrayIntersection(MEDIATYPES.video.concat('video'), answerMediaTypes);
    if (intersection.length) {
        resultAnswerType.push('video');
    }
    result.answerType = resultAnswerType.join('|');
    return result;
};

const choicesAreSeparatedByWhitespace = (text) => {
    const matches = [...text.matchAll(/[a-z]\)/g)];

  for (let i = 1; i < matches.length; i++) {
    const markerIndex = matches[i].index;

    if (!/\s/.test(text[markerIndex - 1])) {
      return false;
    }
  }

  return true;
};

const transformMultipleChoiceQuestion = (question, errors) => {
    if (!['[x_x]', 'a)', 'b)'].every(el => question.questionText.includes(el))) {
        return question;
    }
    if (!question.questionText.includes(question.answerText)) {
        errors.push(`Odpowiedź wielokrotnego wyboru z pytania ${question.id} nie występuje w treści pytania.`);
        return question;
    }
    const questionSplit = question.questionText.split('[x_x]');
    if (questionSplit.length > 2) {
        errors.push(`Pytanie ${question.id} zawiera zbyt wiele markerów oddzielających: [x_x].`);
        return question;
    }
    const result = structuredClone(question);
    if (!choicesAreSeparatedByWhitespace(questionSplit[1])) {
        errors.push(`W pytaniu ${question.id} odpowiedzi wielokrotnego wyboru nie są rozdzielone spacjami.`);
        return question;
    }
    const choices = questionSplit[1].replace(/\s(?=[a-z]\))/g, '[br]');
    result.questionText = questionSplit[0] + '[br][br]' + choices;
    const answerSplit = choices.split(question.answerText);
    result.answerText = questionSplit[0] + '[br][br]' + answerSplit[0] + '[blue]' + result.answerText + '[/blue]' + answerSplit[1];

    return result;
};

const importNewQuiz = async (rl) => {
    let logs = [];
    const pathName = './pytania';
    if (fs.existsSync(pathName)) {
        const files = fs.readdirSync(pathName, { withFileTypes: true });
        const dirs = files.filter((file) => file.isDirectory() && file.name != 'js');
        if (dirs.length) {
            console.warn('\nDodanie nowego konkursu');
            dirs.forEach((dir, index) => {
                console.log(`${index + 1} - ${dir.name}`);
            });
            console.log(`q - Wyjście z importu`);
            console.log('\nKtóry konkurs chcesz dodać?');
            let choice;
            while (!(range(1, dirs.length).map((n) => n.toString()).concat(['q'])).includes(choice)) {
                if (typeof choice !== 'undefined') {
                    console.warn('\nWybierz jedną z opcji\n');
                }
                choice = (await rl.question('> ')).trim();
            }
            if (choice == 'q') {
                return;
            } else {
                try {
                    const code = dirs[parseInt(choice) - 1].name;
                    const filesInDir = fs.readdirSync(`${pathName}/${code}`, { withFileTypes: true });
                    const csvFiles = filesInDir.filter((file) => file.name.endsWith('.csv'));
                    if (!csvFiles.length) {
                        logs.push(`W katalogu {pytania/${code}} nie znaleziono pliku csv`);
                    } else {
                        const selectedCsvFile = csvFiles[0];
                        const csvFileContents = fs.readFileSync(`${selectedCsvFile.parentPath}/${selectedCsvFile.name}`);
                        const records = parse(csvFileContents, { columns: true });
                        const json = {};
                        json['code'] = code;
                        json['questions'] = [];
                        // TODO: Handle HTML tags
                        // TODO: Handle the [spoiler] prefix
                        const multipleChoiceErrors = [];
                        records.forEach((rec, index) => {
                            if (!checkCSVColumns(rec)) {
                                throw new Error('Niepoprawne nagłówki kolumn w pliku csv.');
                            }
                            let question = {
                                id: padId((index + 1).toString()),
                                questionText: rec.question.trim(),
                                questionType: rec.questionType.trim(),
                                answerText: rec.answer.trim(),
                                answerType: rec.answerType.trim(),
                            };
                            question = normaliseMediaType(question);
                            if (typeof rec.category !== 'undefined' && rec.category.trim()) {
                                question['category'] = rec.category.trim();
                            }
                            question = transformMultipleChoiceQuestion(question, multipleChoiceErrors);
                            json.questions.push(question);
                        });
                        const verificationResult = await verifyMedia(code, json.questions);
                        if (multipleChoiceErrors.length) {
                            logs = logs.concat(multipleChoiceErrors);
                            throw new Error('Błędy w pytaniach wielokrotnego wyboru.');
                        }
                        if (verificationResult.success) {
                            json['author'] = '';
                            json['title'] = '';
                            while (!json.author) {
                                json.author = (await rl.question('Autor konkursu? > ')).trim();
                            }
                            while (!json.title) {
                                json.title = (await rl.question('Tytuł konkursu? > ')).trim();
                            }
                            const jsonString = JSON.stringify(json, null, 2);
                            const fileContents = `if (typeof KTron != 'undefined' && typeof KTron['quizzes'] != 'undefined') {
KTron.quizzes.push(${jsonString});
}\n`;
                            fs.writeFileSync(`./pytania/${code}/${code}.js`, fileContents);
                            await addCodeToQuizFiles(code);
                            logs.push(`\nKonkurs ${code} poprawnie dodany`);
                            printLogs(logs);
                            return;
                        } else {
                            logs = logs.concat(verificationResult.errors);
                            logs = logs.concat(verificationResult.warnings);
                        }
                    }
                } catch (error) {
                    logs.push({ log: error.message, type: 'error' });
                }
            }
        } else {
            logs.push('W katalogu {pytania} nie znaleziono żadnego podkatalogu');
        }
    } else {
        logs.push({ log: 'Katalog {pytania} nie istnieje!', type: 'error' });
    }
    printLogs(logs);
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    console.clear();
    let answer = '';
    while (answer.toLowerCase() !== 'q') {
        console.warn(`\nCiamk ${CIAMK_VERSION}`);
        console.info('1 - Dodaj nowy konkurs');
        console.info('2 - Usuń konkurs z listy');
        console.info('3 - Migruj istniejące konkursy z wersji 2.x');
        console.info('q - Wyjście\n');
        answer = (await rl.question('> ')).trim();
        switch (answer.toLowerCase()) {
            case '1':
                console.clear();
                await importNewQuiz(rl);
                break;
            case '2':
                console.clear();
                await removeCodeFromQuizFiles(rl);
                break;
            case '3':
                await migrateOldQuizes(rl);
                break;
            case 'q':
                rl.close();
                break;
        }
    }
})();
