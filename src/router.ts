import { match } from "path-to-regexp"
import { Route } from "../typings/global/types/route"

// import endpoint (route) functions
// import db from "./endpoints/db"
import dbs from "./endpoints/dbs"
import table from "./endpoints/table"
import tables from "./endpoints/tables"



/**
 * Router finds and executes the function which is attached to the URL path being called.
 * It also extracts the path parameters, such as "db" and "table", and passes this to the function.
 */

class Router {
  routes: Route[];

  constructor() {
    this.routes = [
      [match('/dbs/:db/tables/:table'), table],
      [match('/dbs/:db/tables'), tables],
      // [match('/dbs/:db'), db],
      [match('/dbs'), dbs],
    ]
  }

  route({ path }: {
    path: string,
  }): [(args: LambdaRequest) => Promise<ResponseFormat>, PathParameters] {
    // find route
    for (const [match, func] of this.routes) {
      const matched = match(path)
      if (matched !== false) {
        const path_params = matched.params as PathParameters
        return [func, path_params]
      }
    }
    
    // default route
    return [default_route, {}]
  }
}

export default Router



export const default_route = (): Promise<ResponseFormat> => {
  const response: DefaultResponseBody = {
    "message": "Not found"
  }
  return Promise.resolve({
    statusCode: 404,
    body: response
  })
}

