import { Router } from "./router";


interface Brain {
  s3_location: string,
  dynamo_location: string,

  s3_bucket: string,

  config: object,
  router: Router,

  handle: (
    http_method: HttpMethod,
    path: string,
  ) => LambdaResponse
}


