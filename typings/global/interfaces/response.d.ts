
/*
https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
*/

interface ResponseFormat {
  statusCode?: number,        // default = 200
  headers?: ResponseHeaders,  // default = app/json
  body: object,
}

interface LambdaResponse {
  statusCode: number,
  headers: ResponseHeaders,
  body: string,
}

interface ResponseHeaders {
  [key: string]: string
}

interface DefaultResponseBody {
  message: string,
}

interface ErrorResponseBody {
  message: string,
}

