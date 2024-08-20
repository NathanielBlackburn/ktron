import * as fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import * as readline from 'node:readline/promises';

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    console.clear();
    let answer = '';
    while (answer.toLowerCase() !== 'q') {
        console.warn('\nCiamk 1.0-Beta');
        console.info('1 - Migruj istniejące konkursy z wersji 2.x');
        console.info('2 - Usuń konkurs z listy');
        console.info('q - Wyjście\n');
        answer = (await rl.question('> ')).trim();
        switch (answer.toLowerCase()) {
            case '1':
                console.clear();
                await migrateOldQuizes(rl);
                break;
            case '2':
                console.clear();
                await removeCodeFromQuizFiles(rl);
                break;
            case 'q':
                rl.close();
                break;
        }
    }
})();
