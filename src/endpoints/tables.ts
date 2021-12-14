import { default_route } from "../router"
import Brain from "../brain"



async function get_tables(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {

  // TODO : perform this.get_database_state

  const response: GetTablesResponseBody = {
    database: "mock",
    tables: [],
  }
  
  return {
    body: response
  }
}

async function create_table(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  const _db = args.path_params?.db
  let { name, indexed_fields } = args.body as CreateTableBody
  
  // validate request
  if (!name || typeof name !== "string") throw Error('Please specify `name` (as string) for the new table in request body')
  if (!indexed_fields || !Array.isArray(indexed_fields) || indexed_fields.some(field => typeof field !== "string") || indexed_fields.length < 1) throw Error('Please specify `indexed_fields` (array of strings) for the new table in request body')
  if (!_db || typeof _db !== "string") throw Error('Database name in request path is invalid')
  const db = _db.toLowerCase()
  const table = name.toLowerCase()
  indexed_fields = indexed_fields.map(field => field.toLowerCase())
  
  // create two DynamoDB tables (to be used for indexing); one for STRING values and one for NUMERIC values
  const dynamo_tablename = `${db}-${table}`
  const dynamo_table_S = this.dynamo.createTable({
    AttributeDefinitions: [
      { AttributeName: `field`, AttributeType: `S` },
      { AttributeName: `value`, AttributeType: `S` },
    ],
    KeySchema: [
      { AttributeName: `field`, KeyType: `HASH` },
      { AttributeName: `value`, KeyType: `RANGE` },
    ],
    BillingMode: `PAY_PER_REQUEST`,
    TableName: `${dynamo_tablename}-S`,
  }).promise()
  const dynamo_table_N = this.dynamo.createTable({
    AttributeDefinitions: [
      { AttributeName: `field`, AttributeType: `S` },
      { AttributeName: `value`, AttributeType: `N` },
    ],
    KeySchema: [
      { AttributeName: `field`, KeyType: `HASH` },
      { AttributeName: `value`, KeyType: `RANGE` },
    ],
    BillingMode: `PAY_PER_REQUEST`,
    TableName: `${dynamo_tablename}-N`,
  }).promise()

  // create table and indexes (create structure in S3)
  const create_indexes = Promise.all(
    indexed_fields.map(field =>
      this.s3.putObject({
        Bucket: this.s3_bucket,
        Key: `/databases/${db}/tables/${table}/index/${field}`,
      }).promise()
    )
  )
  
  // wait for dynamo tables to be created
  const dynamo_tables = [await dynamo_table_S, await dynamo_table_N]
  // check if all tables are created
  if (dynamo_tables.some(dynamo_table => !dynamo_table.TableDescription)) {
    const response: CreateTableResponseBody = {
      created: false,
      ready: false,
    }
    return {
      body: response
    }
  }

  // wait for table and indexes to be created
  await create_indexes

  const response: CreateTableResponseBody = {
    created: true,
    ready: dynamo_tables.every(dynamo_table => dynamo_table.TableDescription && dynamo_table.TableDescription.TableStatus === "ACTIVE"),
    // TODO : need `/dbs/${db_name}/tables/${table_name}` endpoint to check if status of DynamoDB tables is 'ready'
  }
  return {
    body: response
  }
}

async function delete_table(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  
  // TODO
  
  return {
    body: {}
  }
}



const methods: {
  [key in HttpMethod]: (args: LambdaRequest) => Promise<ResponseFormat>
} = {
  "GET": get_tables,
  "POST": create_table,
  "DELETE": delete_table,

  "PUT": default_route,
}

function tables (this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  try {
    return methods[args.method].call(this, args)
  } catch (e) {}
  return default_route()
}

export default tables

