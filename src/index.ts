// import Brain from './brain'

// // initialize database brain
// const db_brain = new Brain()

// // handle requests coming from API Gateway
// exports.handler = async function(event) {
//   return db_brain.handle(event)
// }


import dotenv from 'dotenv'
dotenv.config({ path: process.cwd() + '/.env' })

import Brain from './brain'
import { initialize_s3, print_objectlist } from './helpers/s3'
import { initialize_dynamodb } from './helpers/dynamodb'


// LAMBDA request / response format:
//   https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html



const db_brain = new Brain()
const db_name    = 'companywebsite'
const table_name = 'users'
const indexed_fields = ["id", "age", "name"]


const create_table_event: {
  method: HttpMethod,
  path: string,
  body: object,
} = {
  method: "POST",
  path: `/dbs/${db_name}/tables`,
  body: {
    name: table_name,
    indexed_fields
  },
}

const insert1_document_event: {
  method: HttpMethod,
  path: string,
  body: TableInsert,
 } = {
  method: "POST",
  path: `/dbs/${db_name}/tables/${table_name}`,
  body: {
    method: "insert",
    document: { id: 1, name: 'Alice', age: 21 }
  },
}
const insert2_document_event: {
  method: HttpMethod,
  path: string,
  body: TableInsert,
 } = {
  method: "POST",
  path: `/dbs/${db_name}/tables/${table_name}`,
  body: {
    method: "insert",
    document: { id: 2, name: 'Bob', age: 16 }
  },
}
// const insert1_document_event: {
//   method: HttpMethod,
//   path: string,
//   body: TableInsert,
//  } = {
//   method: "POST",
//   path: `/dbs/${db_name}/tables/${table_name}`,
//   body: {
//     method: "insert",
//     document: { id: 3, name: 'Santa', age: 91 }
//   },
// }
// const insert2_document_event: {
//   method: HttpMethod,
//   path: string,
//   body: TableInsert,
//  } = {
//   method: "POST",
//   path: `/dbs/${db_name}/tables/${table_name}`,
//   body: {
//     method: "insert",
//     document: { id: 4, name: 'Pete', age: 21 }
//   },
// }

// const read1_event: {
//   method: HttpMethod,
//   path: string,
//   body: TableFind,
// } = {
//   method: "POST",
//   path: `/dbs/${db_name}/tables/${table_name}`,
//   body: {
//     method: "find",
//     query: { age: "21" }
//   }
// }
const read1_event: {
  method: HttpMethod,
  path: string,
  body: TableFind,
} = {
  method: "POST",
  path: `/dbs/${db_name}/tables/${table_name}`,
  body: {
    method: "find",
    // query: { name: "Bob", age: { "$lt": 21 } },
    // query: { age: { "$gt": 16, "$lt": 21 } },
    query: { age: { $gt: 16, $lt: 21 }, id: { $gt: 1 } },
    // query: { age: { "$lt": 90 } }
    // query: { age: { "$gt": 0 } }
  }
}

async function main() {
  // INSERT
  //  await initialize_s3(db_brain.s3, db_brain.s3_bucket)
  //  await initialize_dynamodb(db_brain.dynamo)
   
  //  console.time("createTable")
  //  const result = await db_brain.handle(create_table_event)
  //  console.log("create table:", result)
  //  console.timeEnd("createTable")

  //  console.time("insert1")
  //  const result2 = await db_brain.handle(insert1_document_event)
  //  console.log("insert 1:", result2)
  //  console.timeEnd("insert1")

  //  console.time("insert2")
  //  const result3 = await db_brain.handle(insert2_document_event)
  //  console.log("insert 2:", result3)
  //  console.timeEnd("insert2")

  // READ
  console.time("read")
  const readresult = await db_brain.handle(read1_event)
  console.timeEnd("read")
  console.log("readresult:", readresult)

  // console.time("read2")
  // const read2result = await db_brain.handle(read1_event)
  // console.timeEnd("read2")

  // await print_objectlist.call(db_brain, "/databases/companywebsite/tables/users/index/")
}
main()

