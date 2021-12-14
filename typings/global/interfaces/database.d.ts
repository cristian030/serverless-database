


interface Database {
  name: string,
  tables: Table[],
}



// REQUESTS
interface CreateDatabaseBody {
  name: string
}


// RESPONSES
interface GetDatabaseResponseBody {
  databases: string[],
}

interface CreateDatabaseResponseBody {
  created: boolean,
}


