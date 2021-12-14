import Brain from '../brain'
import { initialize_s3 } from '../helpers/s3'
import { initialize_dynamodb } from '../helpers/dynamodb'

const db_brain   = new Brain()

const db_name    = 'companywebsite'
const name       = 'users'                    // table name
const indexed_fields = ["id", "age", "name"]  // fields to index


// initiliaze 
beforeAll(async () => {
  await initialize_s3(db_brain.s3, db_brain.s3_bucket)
  await initialize_dynamodb(db_brain.dynamo)
  return
})




test('create table', async () => {
  const event: {
    method: HttpMethod,
    path: string,
    body: CreateTableBody,
  } = {
    method: "POST",
    path: `/dbs/${db_name}/tables`,
    body: {
      name,
      indexed_fields,
    },
  }
  
  const result = await db_brain.handle(event)
  expect(result.statusCode).toEqual(200)
  const body = JSON.parse(result.body) as CreateTableResponseBody
  expect(body.created).toEqual(true)
})


