import * as fs from 'node:fs';

if (process.argv.length < 3) {
    console.error('Nie podano pliku konfiguracyjnego.');
    process.exit(1);
}

const configFile = process.argv.pop();
if (!fs.existsSync(configFile)) {
    console.error('Podany plik konfiguracyjny nie istnieje.');
    process.exit(2);
}

const config = JSON.parse(fs.readFileSync(configFile));
console.log(config);
