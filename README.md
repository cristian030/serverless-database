
Table of contents:

- [How to use](#how-to-use-serverless-database)
- [Query functionality (currently implemented)](#query-functionality-currently)
- [How it works](#how-it-works)


# How to use Serverless Database

This Serverless Database repository is a proof of concept that I had an idea about for quite some time. It currently has just basic functionality.


## Try out on local machine (without AWS)

You can try out this project locally, without using AWS:

1. Run DynamoDB local, using docker container: `docker run -p 8000:8000 amazon/dynamodb-local`

2. Run S3 local, using docker container: `docker run -it -p 4566:4566 -p 4571:4571 localstack/localstack -e "SERVICES=s3"`

3. Set location of DynamoDB and S3 as environment variables in `.env` file.

4. After cloning this repo, install dependencies by running `npm install` in root.

5. Run (for example) the Jest tests with command `npm test`.

6. Run your own code (in `src/index.ts`) using command `npm run start`.


## Create database

Initialize a `new database brain` (this can [run anywhere](#where-can-i-run-the-brains-of-serverless-database), as long as it can connect to DynamoDB and S3):
```
import Brain from './brain'

const db_brain = new Brain()
```


Create a `new database` called `acme`:
```
const event = {
  method: "POST",
  path: "/dbs",
  body: {
    name: 'acme'
  },
}
const result = await db_brain.handle(event)
```



## Create table

Create a `new table` called `users`:
```
const event = {
  method: "POST",
  path: `/dbs/acme/tables`,
  body: {
    name: 'users',
    indexed_fields: [ 'id', 'age', 'name' ],
  },
}
const result = await db_brain.handle(event)
```



## Insert document(s)

Insert `new document`:
```
const event = {
  method: "POST",
  path: `/dbs/acme/tables/users`,
  body: {
    method: "insert",
    document: { id: 0, name: 'Bob', age: 16 }
  },
}
const result = await db_brain.handle(event)
```


Insert `multiple documents`:
```
const event = {
  method: "POST",
  path: `/dbs/acme/tables/users`,
  body: {
    method: "insert",
    document: [
      { id: 1, name: 'Alice', age: 21  },
      { id: 2, name: 'Santa',  age: 91 },
      { id: 3, name: 'Pete',  age: 20  },
    ]
  },
}
const result = await db_brain.handle(event)
```



## Find (query) documents

`Find` documents:
```
const event = {
  method: "POST",
  path: `/dbs/acme/tables/users`,
  body: {
    method: "find",
    query: { age: { $gt: 10, $lt: 30 }, id: { $gt: 0 } },
  },
}
const result = await db_brain.handle(event)
/* Expected result:
[
  { id: 3, name: 'Pete', age: 20 },
  { id: 1, name: 'Alice', age: 21 }
]
*/
```

Note: you can currently only query on fields that are [marked as `indexed_fields`](#create-table) while creating the table, and the field should be at the root of the document.

It [is possible](#query-functionality-currently) to implement more 'advanced' query functionality (for strings), such as "begins_with", case-insensitive search, etc.




# Where can I run the `Brain`(s) of Serverless Database

The original idea was to run the Serverless Database brain as an AWS Lambda function, something like this (mock code):
```
import Brain from './brain'

// initialize database brain
const db_brain = new Brain()

// handle requests coming from API Gateway
exports.handler = async function(event) {
  return db_brain.handle(event)
}
```


But I realized you can actually run it anywhere you want. This way, you don't need a seperate database at all.

For example, just inside your API (mock code):
```
const express = require('express')
const app = express()
const port = 3000

import Brain from './brain'


// initialize database brain
const db_brain = new Brain()

app.get('/users', async (req, res) => {
  const result = await db_brain.handle({
    method: "POST",
    path: `/dbs/acme/tables/users`,
    body: {
      method: "find",
      query: { age: { $gt: 10, $lt: 30 }, id: { $gt: 0 } },
    },
  })
  res.send(result.documents)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
```


# Query functionality (currently)

The `query` field of the `find`-method can do:

`Exact match`: 
{
  query: {
    <field_name>: <field_value>
  }
}


`Greater than` (if also '$lt' provided, it functions as `greater than equal to` and `less than equal to`): 
{
  query: {
    $gt: <numeric_value>
  }
}


`Less than` (if also '$gt' provided, it functions as `less than equal to` and `greater than equal to`): 
{
  query: {
    $lt: <numeric_value>
  }
}

It is possible to implement more 'advanced' query functionality (for strings), such as "begins_with", case-insensitive search, etc.



# How it works

Serverless Database is written in JavaScript (TypeScript). It uses S3 and DynamoDB.


## S3

Documents in the serverless database will be saved in an S3 object. The actual location in S3 is as follows:

`/databases/**db_name**/tables/**table_name**/data/**documents_here**`

Each document will be assigned an unique ID, which will be the name (Key) of the object in S3.

Documents can now be easily (and efficiently) retrieved if you know its unique ID. However, it is not possible to query on other fields than ID (other than opening every single document and check its values). DynamoDB is needed to make querying on document fields possible, and locating matching documents easier and faster (more efficient, by indexing each inserted document).


## DynamoDB

An item in the DynamoDB table looks like this:

`{ field: "name", value: "Bob", index: *table_index* }`

The value of field `index` contains all document_IDs that, in this case, have a field called **name** with the value **Bob**. Since DynamoDB gets more expensive the bigger its items, `index` does not directly contain all document_IDs. Instead, it refers to the `table_index`, which is located in S3:

`/databases/**db_name**/tables/**table_name**/index/**field**/**table_index**/**document_ids**`

Thus, to save costs, DynamoDB actually functions as subindex.


