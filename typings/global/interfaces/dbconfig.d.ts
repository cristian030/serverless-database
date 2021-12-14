

interface DbConfig {
  databases: Database[]
}

interface DbConfigCache {
  last_refresh?: number,
  config?: DbConfig,
}

