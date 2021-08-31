# sourced-repo-typeorm

A sourced repo that uses TypeORM to persist events. This allows for passing different connection options, and thus, allows for different database for the persistence layer:
https://typeorm.io/#/connection-api

Currently has only been tested with PostgreSQL. Uses the `bigint` and `jsonb` types so CockroachDB should work as well.

With minor adjustments - using `json` instead of `jsonb`, MariaDB and MySQL could be supported as well. PRs welcome!

## Usage

See `__tests__/integration` for example usage.