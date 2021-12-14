import { default_route } from "../router"
import Brain from "../brain"
import {
  is_TableFind,
  is_TableInsert,
} from '../helpers/table_methods'
import {
  insert,
  find,
} from '../helpers/table'



async function execute(this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  const _db = args.path_params?.db
  const _table = args.path_params?.table
  const method = args.body as TableMethod
  
  // validate request
  if (!_db || typeof _db !== "string") throw Error('Database name in request path is invalid')
  if (!_table || typeof _table !== "string") throw Error('Table name in request path is invalid')
  const db = _db.toLowerCase()
  const table = _table.toLowerCase()

  const table_config = await this.get_table_state({ database: db, table })

  /* FIND */
  if (is_TableFind(method)) {
    const indexed_fields = table_config.indexes
    if (indexed_fields.length < 1) throw new Error("Table has no indexed fields!")

    const found_documents = await find.call(this, method.query, db, table, indexed_fields)

    const response: TableFindResponse = {
      documents: found_documents
    }
    return {
      body: response
    }
  }

  /* INSERT */
  else if (is_TableInsert(method)) {
    const indexed_fields = table_config.indexes
    if (indexed_fields.length < 1) throw new Error("Table has no indexed fields!")

    const inserted_id = Array.isArray(method.document) ? await Promise.all(method.document.map(document => insert.call(this, document, db, table, indexed_fields))) : await insert.call(this, method.document, db, table, indexed_fields)

    const response: TableInsertResponse = {
      inserted_id
    }
    return {
      body: response
    }
  }


  const response: TableMethodErrorResponse = {
    error: "Invalid Table method"
  }
  return {
    body: response
  }
}




const methods: {
  [key in HttpMethod]: (args: LambdaRequest) => Promise<ResponseFormat>
} = {
  "POST": execute,

  "GET": default_route,
  "DELETE": default_route,
  "PUT": default_route,
}

function table (this: Brain, args: LambdaRequest): Promise<ResponseFormat> {
  try {
    return methods[args.method].call(this, args)
  } catch (e) {}
  return default_route()
}

export default table

