import Brain from "../brain"
import { AWSError } from "aws-sdk"



export const initialize_dynamodb = async (dynamo_conn) => {
  // delete all tables
  await delete_all_tables(dynamo_conn)
}

export const delete_all_tables = async (dynamo_conn) => {
  // check if NOT connected to Amazon (accidently deleting all production DynamoDB tables)
  if (dynamo_conn.endpoint.hostname.includes("amazon") || dynamo_conn.endpoint.hostname.includes("aws")) throw new Error('Almost deleted all your DynamoDB tables on AWS! Please provide a local DynamoDB endpoint in config/env!')
  
  const all_tables = await dynamo_conn.listTables({}).promise()
  const delete_tables = all_tables.TableNames ? await Promise.all(
    all_tables.TableNames.map(table =>
      dynamo_conn.deleteTable({
        TableName: table,
      }).promise()
    )
  ) : []
  return delete_tables
}



export async function write_index(this: Brain, dynamo_table: string, field: string, value: string | number, s3_index: string) {
  return await this.dynamo.updateItem({
    TableName: `${dynamo_table}-${typeof value === "string" ? "S" : "N"}`,
    Key: {
      "field": { S: `${field}` },
      "value": { [typeof value === "string" ? "S" : "N"]: `${value}` },
    },
    ExpressionAttributeNames: {
      '#IDX': "index",
    },
    ExpressionAttributeValues: {
      ':idx': { 'S': s3_index },
    },
    UpdateExpression: 'SET #IDX = if_not_exists(#IDX, :idx)',
    ReturnValues: "UPDATED_NEW",
  }).promise()
  .then(
    (data) => {
      // console.log('field,value:', field, ',', value,"--dynamo_index UPDATE returns attributes:", data.Attributes)
      // console.log("returning", s3_index)
      const s3_index_key = data.Attributes?.index.S
      if (!s3_index_key) throw new Error(`Failed to set/get DynamoDB index. It returned: ${JSON.stringify(data.Attributes)}`)
      return s3_index_key
    },
    (error: AWSError) => {
      throw error
    }
  )
}

export async function read_indexes(this: Brain, dynamo_table: string, query: TableQuery) {

  const exact_query = read_indexes_exact.call(this, dynamo_table, query)
  const comparison_queries = read_indexes_comparison.call(this, dynamo_table, query)

  const exact_result = await exact_query
  // console.log("exact_result::", exact_result)
  const comparison_result = await comparison_queries
  // console.log("comparison_result::", comparison_result)

  const all_result = [...exact_result, ...comparison_result]
  // console.log("all_result::", all_result)

  return all_result
}

async function read_indexes_exact(this: Brain, dynamo_table: string, query: TableQuery) {
  const string_queries: { field: { S: string; }, value: { S: string; }}[] = []
  const number_queries: { field: { S: string; }, value: { N: string; }}[] = []

  Object.entries(query).forEach(([field, value]) => {
    if (typeof value === "string") {
      string_queries.push({
        "field": { S: field },
        "value": { S: value },
      })
    }
    else if (typeof value === "number") {
      number_queries.push({
        "field": { S: field },
        "value": { N: `${value}` },
      })
    }
  })
  
  const exact_query = (string_queries.length + number_queries.length) === 0 ? [] : this.dynamo.batchGetItem({
    RequestItems: {
      ...(string_queries.length > 0 && {
        [`${dynamo_table}-S`]: {
          Keys: string_queries,
          ExpressionAttributeNames: {
            '#IDX': "index",
          },
          ProjectionExpression: "#IDX,field",
        }
      }),
      ...(number_queries.length > 0 && {
        [`${dynamo_table}-N`]: {
          Keys: number_queries,
          ExpressionAttributeNames: {
            '#IDX': "index",
          },
          ProjectionExpression: "#IDX,field",
        }
      }),
    }
  }).promise()
  .then(
    (data) => {
      const responses = data.Responses?.[`${dynamo_table}-S`] || []
      const s3_index_keys: [ field: string, index: string[] ][] = responses.flatMap(r => r.index.S && r.field.S ? [[ r.field.S, [ r.index.S ] ]] : [])
      return s3_index_keys
    },
    (error: AWSError) => {
      throw error
    }
  )

  return exact_query
}

async function read_indexes_comparison(this: Brain, dynamo_table: string, query: TableQuery) {
  // do DynamoDB.query for each `operator` query
  const comp_queries = Object.entries(query).flatMap(([field, operators]) => {
    if (typeof operators !== "object") return []

    // check if all operator values are of type number
    if (
      (operators['$lt'] !== undefined && typeof operators['$lt'] !== "number") ||
      (operators['$gt'] !== undefined && typeof operators['$gt'] !== "number")
    ) return []
    
    // craft expression for DynamoDB.query
    const expression = "$gt" in operators && "$lt" in operators ? `#field = :field AND #value BETWEEN :gt AND :lt` :
      "$gt" in operators ? `#field = :field AND #value > :gt` :
      "$lt" in operators ? `#field = :field AND #value < :lt` : null
    if (!expression) return []
    // console.log("EXPRESSION:", expression)
    
    // return promise of DynamoDB.query
    return this.dynamo.query({
      TableName: `${dynamo_table}-N`,
      KeyConditionExpression: expression,
      ExpressionAttributeValues: {
        ":field": { S: field },
        ...(operators['$lt'] !== undefined && { ":lt": { N: `${operators['$lt']}` } }),
        ...(operators['$gt'] !== undefined && { ":gt": { N: `${operators['$gt']}` } }),
      },
      ExpressionAttributeNames: {
        "#field": "field",
        "#value": "value",
      }
    }).promise()
    .then(
      (data) => {
        const responses = data.Items || []
        
        const s3_index_keys: string[] = responses.flatMap(r => r.index.S ? r.index.S : [])
        const result: [field: string, index: string[]] = [ field, s3_index_keys ]
        // console.log("dynamoDB query RESPONSE:", result)
        return result
      },
      (error: AWSError) => {
        throw error
      }
    )
  })

  return Promise.all(comp_queries)
}




export async function print_table(this: Brain, dynamo_table: string) {
  const items = await this.dynamo.scan({
    TableName: dynamo_table
  }).promise()
  items.Items?.forEach(item => console.log("item:", item))
}

