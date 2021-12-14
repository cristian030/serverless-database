

interface LambdaRequest {
  method: HttpMethod,
  path_params?: PathParameters,
  body: object
}


type PathParameters = {[key: string]: string}

