import Brain from "../brain"
import {
  insert_document,
  take_document,
  write_index as s3_write_index,
  read_index as s3_read_index,
} from "../helpers/s3"
import {
  write_index as dynamo_write_index,
  read_indexes as dynamo_read_indexes,
  print_table,
} from "../helpers/dynamodb"
import {
  intersection
} from "../helpers/array"


export async function insert(this: Brain, document: object, db: string, table: string, indexed_fields: string[]): Promise<string> {
  // insert document into table (its s3 path), and get its unique document_id
  const { document_id, insert_promise } = await insert_document.call(this, document, db, table)

  // add document to indexes
  //
  // for each `indexed_fields`, do:
  //  1. write to DynamoDB index    { field: `foo`, value: `bar`, index: *s3_index_key* }
  //        -- returns *s3_index_key*, which is:
  //            - if field+value already exists in DynamoDB: it returns the former set `index` value
  //            - if not exists: set `index` value to just inserted `document_id` (since this value unique in current table), and return it
  //  2. write to S3 index          `/databases/${db}/tables/${table}/index/`field`/`s3_index_key`/*complete_index*`
  //        -- write to S3 index of this table, located at `/databases/${db}/tables/${table}/index/`field`/`s3_index_key`/`
  //           insert a new object with `Key` value of `document_id`
  const dynamo_tablename = `${db}-${table}`
  const indexes =  Promise.all(
    indexed_fields.flatMap(field =>
      !document.hasOwnProperty(field) ? [] :
        dynamo_write_index.call(this, dynamo_tablename, field, document[field], document_id)
        .then((s3_index_key) => {
          s3_write_index.call(this, db, table, field, s3_index_key, document_id)
        })
    )
  )

  // wait for document to be inserted, and indexes to be updated
  await insert_promise
  await indexes

  // await print_table.call(this, dynamo_tablename)
  
  return document_id
}


export async function find(this: Brain, query: TableQuery, db: string, table: string, indexed_fields: string[]): Promise<object[]> {
  const dynamo_tablename = `${db}-${table}`

  // await print_table.call(this, dynamo_tablename)

  // validate?
  const indexes = Object.keys(query)
  if (indexes.length === 0) return []   // TODO: should return all OR invalid ??
  //                                    // TODO: dont lookup fields not in `indexed_fields`, since they are not indexed. these should be filtered at the end (when all objects are loaded from S3)!
  // console.log("get dynamo indexes:", indexes)

  // execute query on dynamo subindex
  const s3_index_keys = await dynamo_read_indexes.call(this, dynamo_tablename, query)
  if (s3_index_keys.length < indexes.length) return []  // nothing matches OR not full query matches

  // get index data from S3
  const get_indexes = s3_index_keys.map(([field, index_ids]) =>
    index_ids.map(index_id =>
      s3_read_index.call(this, db, table, field, index_id)
    )
  )
  const all_indexes = (await Promise.all(get_indexes.map(gi => Promise.all(gi)))).map(x => x.flatMap(y => y))
  // console.log("value of s3_indexes:", all_indexes)
  
  // get matching `document_ids`
  const document_ids = all_indexes.length < 2 ? all_indexes[0] : intersection(...all_indexes)
  // console.log("matching document ids:", document_ids)

  // get all objects
  const documents = await Promise.all(
    document_ids.map(document_id => 
      take_document.call(this, document_id, db, table)
    )
  )
  
  // return it
  return documents
}

