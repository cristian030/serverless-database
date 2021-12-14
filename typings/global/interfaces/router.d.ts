import { Route } from "../types/route"


interface Router {
  routes: Route[],
  route: (
    http_method: HttpMethod,
    path: string,
  ) => LambdaResponse,
}


