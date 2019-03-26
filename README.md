# graphql-api-diff [Under Development]

    a cli tool to generate schema file from GraphQL endpoint, and compare it with former version.

## Features

   - get schemas from remote GraphQL endpoint. (using [get-graphql-schema](https://www.npmjs.com/package/get-graphql-schema))
   - check diff between current version with former version. (using [graphql-inspector](https://www.npmjs.com/package/@graphql-inspector/core))

## Getting Started

 * git clone this repository.
 * install: `yarn install`
 * edit `config.json` with the remote GraphQL API info.
 * build: `yarn build`
 * start: node .

## License

[MIT](LICENSE).
