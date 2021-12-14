

interface AppState {
  databases: string[],
}

interface DatabaseState {
  tables: string[],
}

interface TableState {
  indexes: string[],
}


// cache
interface StateCache {
  app?: {
    state: AppState,
    last_refresh: number,
  },
  database?: {
    [database: string]: {
      state: DatabaseState,
      last_refresh: number,
    }
  },
  table?: {
    [database: string]: {
      [table: string]: {
        state: TableState,
        last_refresh: number,
      }
    }
  }
}

