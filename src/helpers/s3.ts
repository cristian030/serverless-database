import Brain from "../brain"
import { randomBytes } from "crypto"
import { AWSError } from "aws-sdk"



export const initialize_s3 = async (s3conn, bucket_name) => {
  try {
    // delete bucket
    await delete_bucket(s3conn, bucket_name)
  } catch (e) {}
  try {
    // create empty bucket
    await s3conn.createBucket({
      Bucket: bucket_name
    }).promise()
  } catch (e) {}
}


export const delete_bucket = async (s3conn, bucket_name) => {
  // delete objects in bucket
  let object_listing = await s3conn.listObjectsV2({
    Bucket: bucket_name,
  }).promise()
  
  while (true) {
    if (!object_listing.Contents) break;
    await Promise.all(
      object_listing.Contents.flatMap(item => !item.Key ? [] :
        s3conn.deleteObject({
          Bucket: bucket_name,
          Key: item.Key
        }).promise()
      )
    )
    if (object_listing.IsTruncated) {
      object_listing = await s3conn.listObjectsV2({
        Bucket: bucket_name,
        ContinuationToken: object_listing.NextContinuationToken,
      }).promise()
    } else { break; }
  }

  // delete bucket
  await s3conn.deleteBucket({
    Bucket: bucket_name
  }).promise()
}



export async function get_app_state(this: Brain): Promise<AppState> {
  return this.s3.listObjectsV2({
    Bucket: this.s3_bucket,
    Prefix: `/databases/`,
    Delimiter: "/"
  }).promise()
  .then(
    (data) => {
      if (!data.Contents) return { databases: [] }
      const keys = data.Contents.flatMap(c => c.Key ? c.Key : []).map(
        s3_path => s3_path.substring(s3_path.indexOf("/databases/") + "/databases/".length)   // get just the key
      )
      // console.log("databases:", keys)
      return {
        databases: keys
      }
    }
  )
}

export async function get_database_state(this: Brain, database: string): Promise<DatabaseState> {
  return this.s3.listObjectsV2({
    Bucket: this.s3_bucket,
    Prefix: `/databases/${database}/tables/`,
    Delimiter: "/"
  }).promise()
  .then(
    (data) => {
      if (!data.Contents) return { tables: [] }
      const keys = data.Contents.flatMap(c => c.Key ? c.Key : []).map(
        s3_path => s3_path.substring(s3_path.indexOf(`/${database}/tables/`) + `/${database}/tables/`.length)   // get just the key
      )
      // console.log("tables:", keys)
      return {
        tables: keys
      }
    }
  )
}

export async function get_table_state(this: Brain, database: string, table: string): Promise<TableState> {
  return this.s3.listObjectsV2({
    Bucket: this.s3_bucket,
    Prefix: `/databases/${database}/tables/${table}/index/`,
    Delimiter: "/"
  }).promise()
  .then(
    (data) => {
      if (!data.Contents) return { indexes: [] }
      const keys = data.Contents.flatMap(c => c.Key ? c.Key : []).map(
        s3_path => s3_path.substring(s3_path.indexOf(`/${table}/index/`) + `/${table}/index/`.length)   // get just the key
      )
      // console.log("table indexes:", keys)
      return {
        indexes: keys
      }
    }
  )
}


const generate_uuid = () => {
  return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (_c) => {
    const c = parseInt(_c)
    return (c ^ (randomBytes(1)[0] & (15 >> (c / 4)))).toString(16)
  })
}

export async function insert_document(this: Brain, document: object, db: string, table: string) {
  // generate UUID
  const document_id = generate_uuid()
  // console.log("generated uuid:", doc_id)

  // check if UUID is unique
  const unique = await this.s3.headObject({
    Bucket: this.s3_bucket,
    Key: `/databases/${db}/tables/${table}/data/${document_id}`
  }).promise()
  .then(
    (data) => {
      return false
    },
    (error: AWSError) => {
      if (error.code === "NotFound") return true
      return false
    }
  )
  if (!unique) throw new Error('Failed to generate unique UUID for document. Please try again.')

  // insert document
  const insert_promise = this.s3.putObject({
    Bucket: this.s3_bucket,
    Key: `/databases/${db}/tables/${table}/data/${document_id}`,
    Body: JSON.stringify(document),
    ContentType: `application/json`,
  }).promise()


  return {document_id, insert_promise}
}

export async function take_document(this: Brain, document_id: string, db: string, table: string) {
  return await this.s3.getObject({
    Bucket: this.s3_bucket,
    Key: `/databases/${db}/tables/${table}/data/${document_id}`
  }).promise()
  .then(({ Body }) => {
    if (!Body) throw new Error("Document found but has no body")
    return JSON.parse(Body.toString('utf-8')) as object
  })
}


export async function write_index(this: Brain, db: string, table: string, field: string, index_id: string, document_id: string) {
  return await this.s3.putObject({
    Bucket: this.s3_bucket,
    Key: `/databases/${db}/tables/${table}/index/${field}/${index_id}/${document_id}`
  }).promise()
}

export async function read_index(this: Brain, db: string, table: string, field: string, index_id: string) {
  return await this.s3.listObjectsV2({
    Bucket: this.s3_bucket,
    Prefix: `/databases/${db}/tables/${table}/index/${field}/${index_id}/`,
  }).promise()
  .then(
    (data) => {
      const contents = data.Contents
      // console.log("contents:", contents)
      if (!contents) return []
      return contents.flatMap(o => o.Key ? o.Key : []).map(
        s3_path => s3_path.substring(s3_path.indexOf(index_id) + index_id.length + 1)   // get just the key
      )
    }
  )
}




export async function print_objectlist(this: Brain, prefix: string) {
  const list =  await this.s3.listObjectsV2({
    Bucket: this.s3_bucket,
    Prefix: prefix,
    Delimiter: "/"
  }).promise()
  console.log("list", prefix, ":")
  console.log(` contents:`)
  list.Contents?.forEach(o => console.log(`  `, o.Key))
  console.log(` commonprefixes:`)
  list.CommonPrefixes?.forEach(o => console.log(`  `, o.Prefix))
}

