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
            return reject(e);
        });
    })
}

async function _get2SchemaFile(name): Promise<(String | null) []> {
    const re = new RegExp(`^${name}\\S+graphql`);
    const files = fs.readdirSync(schemasPath).map(filename => re.test(filename)?filename:null).sort().reverse().slice(0,2);
    if (files == null) {
        return [];
    }
    return files;
}

async function genNewSchemaFile() : Promise<void>{
    try {
        const schema = await _forkPromise(
            path.join(__dirname, '../node_modules/.bin/get-graphql-schema'),
            [task.url]
        );
        if (!schema) {
            throw new Error('child process exit with empty schema');
        }
        if (!fs.existsSync(schemasPath)) {
            fs.mkdirSync(schemasPath);
        }
        await fs.writeFileSync(`${schemasPath}/${task.name}-${suffixFileName}.graphql`, schema);
    } catch (err) {
        throw new Error('can not create schema files, ' + err.message);
    }
}

async function reportSchemasDiff(): Promise<Change []>{
    const files = await _get2SchemaFile(task.name);
    if (files.length === 0) {
        throw new Error(`can not find at least 2 files match name: ${task.name}`);
    }
    if (files.length === 1) {
        return [];
    }
    const newSchema = await loadSchema(`${schemasPath}/${files[0]}`);
    const oldSchema = await loadSchema(`${schemasPath}/${files[1]}`);
    const changes: Change [] = diff(oldSchema, newSchema);
    return changes;
}

async function main() {
    try {
        console.log('generate new schema file...');
        await genNewSchemaFile();
    } catch (err) {
        console.log('genNewSchemaFile fail ' + err);
        throw err;
    }
    try {
        console.log('check remote schema changes...');
        const result = await reportSchemasDiff();
        if (result.length === 0) {
            console.log('no changes');
        } else {
            console.log(result);
        }
        console.log('done');
    } catch (err) {
        console.log(`reportSchemasDiff fail ${err}`);
        throw err;
    }
}

main()
    .catch(err => {
        return;
    });
