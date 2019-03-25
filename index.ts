import { fork } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { diff, Change} from '@graphql-inspector/core';
import { loadSchema } from '@graphql-inspector/load';
import dateFormat from 'dateFormat';
import { default as config } from './config.json';

const suffixFileName = dateFormat(new Date(), 'yyyymmddHH');
// constant
const schemasPath = path.join(__dirname, './schemas');

// TODO make it parallel later
const task = config[0];

function _forkPromise(a, b): Promise<any> {
    return new Promise((resolve, reject) => {
        let result = '';
        const child = fork(a, b, { stdio: 'pipe' });
        child.stdout!.on('data', (data) => {
            result += data;
        });
        child.on('close', (code) => {
            // console.log(`child process exited with code ${code}`);
            return resolve(result);
        });
        child.stderr!.on('error', (e) => {
            return reject(e)
        });
    })
}

async function _get2SchemaFile(name): Promise<(String | null) []> {
    const re = new RegExp(`^${name}\\S+graphql`);
    const files = fs.readdirSync(schemasPath).map(filename => re.test(filename)?filename:null).sort().reverse().slice(0,2);
    if (files == null) {
        return [];
    }
    if (files.length > 2) {
        throw new Error('can not find at least 2 files match name:' + name);
    } else {
        return files;
    }
}

async function genNewSchemaFile() : Promise<void>{
    const schema = await _forkPromise(
        path.join(__dirname, '../node_modules/.bin/get-graphql-schema'),
        [task.url]
    );
    await fs.writeFileSync(`${schemasPath}/${task.name}-${suffixFileName}.graphql`, schema);
}

async function reportSchemasDiff(): Promise<Change []>{
    const files = await _get2SchemaFile(task.name);
    const newSchema = await loadSchema(`${schemasPath}/${files[0]}`);
    const oldSchema = await loadSchema(`${schemasPath}/${files[1]}`);
    const changes: Change [] = diff(oldSchema, newSchema);
    return changes;
}

async function main() {
    try {
        await genNewSchemaFile();
        console.log('generate new schema file done.');
    } catch (err) {
        console.log('genNewSchemaFile err: ' + err);
    }
    const result = await reportSchemasDiff();
    console.log('reporting...');
    console.log(result);
    console.log('done');
}

main();
