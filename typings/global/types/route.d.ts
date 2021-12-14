import type {
  MatchFunction
} from "path-to-regexp"


type Route = [
  MatchFunction<object>,
  (args: LambdaRequest) => Promise<ResponseFormat>
]

