

interface Table {
  name: string,
  indexed_fields: string[],
}

// TABLE METHODS REQUESTS
interface TableMethod {
  method: "find" | "insert",
}
interface TableFind extends TableMethod {
  query: TableQuery,
  projection?: {
    [field: string]: boolean,
  }
}
interface TableInsert extends TableMethod {
  document: object | object[],
}

// TABLE METHODS RESPONSE
interface TableMethodResponse {}
interface TableFindResponse extends TableMethodResponse {
  documents: object[],
}
interface TableInsertResponse extends TableMethodResponse {
  inserted_id: string | string[],
}
interface TableMethodErrorResponse {
  error: string,
}



// REQUESTS
interface CreateTableBody {
  name: string,
  indexed_fields: string[],
}

type TableMethodBody = TableFind | TableInsert



// RESPONSES
interface GetTablesResponseBody {
  database: string,
  tables: Table[],
}

interface CreateTableResponseBody {
  created: boolean,
  ready: boolean,
}

type ExecuteTableResponseBody = TableFindResponse | TableInsertResponse




// DOCUMENT QUERY
interface TableQuery {
  [field: string]: string | number | {
      [operator: QueryComparisonNumber]: number
    }
}

type QueryComparisonNumber = "$gt" | "$lt"


