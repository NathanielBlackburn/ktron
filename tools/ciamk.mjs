import * as fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import * as path from "node:path";
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

const addCodeToQuizFiles = async (code) => {
    const quizFilesPath = './js/quizFiles.js';
    let codes;
    if (fs.existsSync(quizFilesPath)) {
        const quizFiles = fs.readFileSync(quizFilesPath).toString();
        const matches = quizFiles.match(/.+(\[.+\])/);
        if (matches) {
            codes = JSON.parse(matches[1]);
        } else {
            codes = [];
        }
        if (!codes.includes(code)) {
            codes.push(code);
        }
    } else {
        codes = [code];
    }
    const quizFilesContent = `const ktronQuizFiles = ${JSON.stringify(codes)};`;
    fs.writeFileSync(quizFilesPath, quizFilesContent);
};

const removeCodeFromQuizFiles = async (rl) => {
    const logs = [];
    const quizFilesPath = './js/quizFiles.js';
    if (fs.existsSync(quizFilesPath)) {
        const quizFiles = fs.readFileSync(quizFilesPath).toString();
        const matches = quizFiles.match(/.+(\[.+\])/);
        if (!matches) {
            logs.push({ log: '\nLista konkursów jest pusta.', type: 'error' });
        } else {
            let codes = JSON.parse(matches[1]);
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
                const quizFilesContent = `const ktronQuizFiles = ${JSON.stringify(codes)};`;
                fs.writeFileSync(quizFilesPath, quizFilesContent);
                logs.push({ log: `\nUsunięto: ${code}`, type: 'warn' });
            }
        }
    } else {
        logs.push({ log: '\nLista konkursów jeszcze nie stworzona!', type: 'error' });
    }
    printLogs(logs);
};

const migrateOldQuizes = async (rl) => {
    const logs = [];
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
            const foundFile = findFile(pathName, question.id, question.questionType, 'question');
            if (foundFile) {
                const newPath = normaliseFileName(foundFile);
                question.questionType = path.extname(newPath).replace('.', '');
                foundFiles.push(path.basename(newPath));
            } else {
                errors.push(`Brak pliku: ${question.id}`);
            }
        }
        if (question.answerType) {
            const foundFile = findFile(pathName, question.id, question.answerType, 'answer');
            if (foundFile) {
                const newPath = normaliseFileName(foundFile);
                question.answerType = path.extname(newPath).replace('.', '');
                foundFiles.push(path.basename(newPath));
            } else {
                errors.push(`Brak pliku: ${question.id}`);
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

const normaliseMediaType = (question) => {
    let result = structuredClone(question);
    if (MEDIATYPES.image.includes(result.questionType)) {
        result.questionType = 'image';
    } else if (MEDIATYPES.audio.includes(result.questionType)) {
        result.questionType = 'audio';
    } else if (MEDIATYPES.video.includes(result.questionType)) {
        result.questionType = 'video';
    }
    if (MEDIATYPES.image.includes(result.answerType)) {
        result.answerType = 'image';
    } else if (MEDIATYPES.audio.includes(result.answerType)) {
        result.answerType = 'audio';
    } else if (MEDIATYPES.video.includes(result.answerType)) {
        result.answerType = 'video';
    }
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
                            json.questions.push(question);
                        });
                        const verificationResult = await verifyMedia(code, json.questions);
                        if (verificationResult.success) {
                            json['author'] = '';
                            json['title'] = '';
                            while (!json.author) {
                                json.author = (await rl.question('Autor konkursu? > ')).trim();
                            }
                            while (!json.title) {
                                json.title = (await rl.question('Tytuł konkursu? > ')).trim();
                            }
                            const jsonString = JSON.stringify(json).replace(/"/g, '\\"');
                            const fileContents = `if (typeof KTron != 'undefined' && typeof KTron['quizzes'] != 'undefined') {
        KTron.quizzes.push(JSON.parse('${jsonString}'));
    }\n`;
                            fs.writeFileSync(`./pytania/${code}/${code}.js`, fileContents);
                            await addCodeToQuizFiles(code);
                            logs.push(`\nKonkurs ${code} poprawnie dodany`);
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
        console.warn('\nCiamk 1.2');
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
