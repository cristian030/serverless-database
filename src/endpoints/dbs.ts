import { default_route } from "../router"
import Brain from "../brain"



async function get_databases(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  const response: GetDatabaseResponseBody = await this.get_app_state()
  
  return {
    body: response
  }
}

async function create_database(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  // validate request
  let { name } = args.body as CreateDatabaseBody
  if (!name || typeof name !== "string") throw Error('Please specify `name` (as string) for the new database in request body')
  name = name.toLowerCase()

  // create database (create structure in S3)
  await this.s3.putObject({
    Bucket: this.s3_bucket,
    Key: `/databases/${name}`,
  }).promise()

  // response
  const response: CreateDatabaseResponseBody = {
    created: true
  }

  return {
    body: response,
  }
}

async function delete_database(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  // TODO
  return {
    body: {"message": "Not implemented yet!"}
  }
}


const methods: {
  [key in HttpMethod]: (args: LambdaRequest) => Promise<ResponseFormat>
} = {
  "GET": get_databases,
  "POST": create_database,
  "DELETE": delete_database,

  "PUT": default_route,
}

function dbs (this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  try {
    return methods[args.method].call(this, args)
  } catch (e) {}
  return default_route()
}

export default dbs

