

export const is_TableFind = (x: any): x is TableFind => {
  const properties = Object.keys(x)
  const valid_properties = ["method", "query", "projection"]
  return (
    x.hasOwnProperty("method") && x.method === "find",
    x.hasOwnProperty("query") &&
    // has no other unexpected properties
    properties.filter(p => !valid_properties.includes(p)).length === 0
  )
}

export const is_TableInsert = (x: any): x is TableInsert => {
  const properties = Object.keys(x)
  const valid_properties = ["method", "document"]
  return (
    x.hasOwnProperty("method") && x.method === "insert",
    x.hasOwnProperty("document") &&
    // has no other unexpected properties
    properties.filter(p => !valid_properties.includes(p)).length === 0
  )
}

