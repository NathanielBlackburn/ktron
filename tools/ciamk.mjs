import * as fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import * as readline from 'node:readline/promises';
// import * as path from 'node:path';
// import { EOL } from "node:os";
// const SEP = path.sep;
// console.log(EOL);

const padId = (id) => {
    return id.toString().padStart(3, '0');
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
            logs.push({log: '\nLista konkursów jest pusta.', type: 'error'});
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
                logs.push({log: `\nUsunięto: ${code}`, type: 'warn'});
            }
        }
    } else {
        logs.push({log: '\nLista konkursów jeszcze nie stworzona!', type: 'error'});
    }
    printLogs(logs);
};

const migrateOldQuizes = async (rl) => {
    const logs = [];
    const path = './pytania/js';
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path, {withFileTypes: true});
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
                        logs.push({log: `Zmigrowano: ${code}`, type: 'warn'});
                    } else {
                        logs.push({log: `Znaleziono konkurs o kodzie ${code}, ale w katalogu "pytania" brak folderu ${code}`, type: 'error'});
                    }
                } else {
                    logs.push(`Plik ${filePath} wydaje się wadliwy.`);
                }
            }
        }
    } else {
        logs.push({log: 'Nie znaleziono katalogu z quizami z poprzedniej wersji Konkursotrona (katalogu {pytania/js})', type: 'error'});
    }
    printLogs(logs);
};

const verifyMedia = async (code, questions) => {
    const images = ['png', 'gif', 'jpg', 'jpeg', 'webp'];
    const audio = ['mp3', 'm4a'];
    const video = ['mp4'];
    const path = `./pytania/${code}`;
    let errors = [];
    let ids = [];
    let foundFiles = [];
    questions.forEach((question) => {
        if (ids.includes(question.id)) {
            errors.push(`Powtórzone id pytania: ${question.id}`);
        }
        ids.push(question.id);
        // TODO: Check other type extensions and change file name accordingly?
        // TODO: Make file names case insensitive
        if (question.questionType) {
            const questionTypeFile = `${question.id}.${question.questionType}`;
            const omittedFirstLetterFile = `${question.id.substring(1, 3)}.${question.questionType}`;
            const omittedFirstTwoLettersFile = `${question.id.substring(2, 3)}.${question.questionType}`;
            if (!fs.existsSync(`${path}/${questionTypeFile}`)) {
                if (fs.existsSync(`${path}/${omittedFirstLetterFile}`)) {
                    fs.renameSync(`${path}/${omittedFirstLetterFile}`, `${path}/${questionTypeFile}`);
                    foundFiles.push(questionTypeFile);
                } else if (fs.existsSync(`${path}/${omittedFirstTwoLettersFile}`)) {
                    fs.renameSync(`${path}/${omittedFirstTwoLettersFile}`, `${path}/${questionTypeFile}`);
                    foundFiles.push(questionTypeFile);
                } else {
                    errors.push(`Brak pliku: ${questionTypeFile}`);
                }
            } else {
                foundFiles.push(questionTypeFile);
            }
        }
        if (question.answerType) {
            const answerTypeFile = `${question.id}a.${question.answerType}`;
            const omittedFirstLetterFile = `${question.id.substring(1, 3)}a.${question.answerType}`;
            const omittedFirstTwoLettersFile = `${question.id.substring(2, 3)}a.${question.answerType}`;
            if (!fs.existsSync(`${path}/${answerTypeFile}`)) {
                if (fs.existsSync(`${path}/${omittedFirstLetterFile}`)) {
                    fs.renameSync(`${path}/${omittedFirstLetterFile}`, `${path}/${answerTypeFile}`);
                    foundFiles.push(answerTypeFile);
                } else if (fs.existsSync(`${path}/${omittedFirstTwoLettersFile}`)) {
                    fs.renameSync(`${path}/${omittedFirstTwoLettersFile}`, `${path}/${answerTypeFile}`);
                    foundFiles.push(answerTypeFile);
                } else {
                    errors.push(`Brak pliku: ${answerTypeFile}`);
                }
            } else {
                foundFiles.push(answerTypeFile);
            }
        }
    });
    let allFiles = fs.readdirSync(path, {withFileTypes: true});
    allFiles = allFiles.filter((file) => {
        return !foundFiles.includes(file.name)
            && !file.name.endsWith('.csv')
            && !file.name.endsWith('.js');
    });
    if (allFiles.length) {
        allFiles.forEach((file) => {
            errors.push(`Nadmiarowy plik: ${file.name}`);
        });
    }
    if (errors.length) {
        return {errors: errors, success: false};
    } else {
        return {success: true};
    }
};

const importNewQuiz = async (rl) => {
    let logs = [];
    const path = './pytania';
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path, {withFileTypes: true});
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
                const code = dirs[parseInt(choice) - 1].name;
                const filesInDir = fs.readdirSync(`${path}/${code}`, {withFileTypes: true});
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
                    // TODO: Handle both file extensions and media types, change the former to media types
                    // TODO: Handle the "same" type?
                    // TODO: Handle HTML tags
                    // TODO: Handle the [spoiler] prefix
                    records.forEach((rec) => {
                        let question = {
                            id: padId(rec.id),
                            questionText: rec.question.trim(),
                            questionType: rec.questionType.trim(),
                            answerText: rec.answer.trim(),
                            answerType: rec.answerType.trim(),
                        };
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
                        const jsonString = JSON.stringify(json);
                        const fileContents = `if (typeof KTron != 'undefined' && typeof KTron['quizzes'] != 'undefined') {
        KTron.quizzes.push(JSON.parse('${jsonString}'));
    }\n`;
                        fs.writeFileSync(`./pytania/${code}/${code}.js`, fileContents);
                        await addCodeToQuizFiles(code);
                        logs.push(`\nKonkurs ${code} poprawnie zaimportowany`);
                    } else {
                        logs = logs.concat(verificationResult.errors);
                    }
                }
            }
        } else {
            logs.push('W katalogu {pytania} nie znaleziono żadnego podkatalogu');
        }
    } else {
        logs.push({log: 'Katalog {pytania} nie istnieje!', type: 'error'});
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
        console.warn('\nCiamk 1.0-Beta');
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
