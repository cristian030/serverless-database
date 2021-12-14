import Brain from '../brain'
import { initialize_s3 } from '../helpers/s3'

const db_brain = new Brain()
const db_name = 'new_db'


// initiliaze 
beforeAll(async () => {
  const result = await initialize_s3(db_brain.s3, db_brain.s3_bucket)
  return result
})


test('create database', async () => {
  const event: {
    method: HttpMethod,
    path: string,
    body: object,
  } = {
    method: "POST",
    path: "/dbs",
    body: {
      name: db_name
    },
  }
  
  const result = await db_brain.handle(event)
  expect(result.statusCode).toEqual(200)
  const body = JSON.parse(result.body) as CreateDatabaseResponseBody
  expect(body.created).toEqual(true)
})

test('get databases', async () => {
  const event: {
    method: HttpMethod,
    path: string,
    body: object,
  } = {
    method: "GET",
    path: "/dbs",
    body: {},
  }
  
  const result = await db_brain.handle(event)
  expect(result.statusCode).toEqual(200)
  const body = JSON.parse(result.body) as GetDatabaseResponseBody
  expect(body.databases).toEqual([db_name])
})




