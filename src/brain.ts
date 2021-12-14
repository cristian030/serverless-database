import Router from "./router"
import S3 from "aws-sdk/clients/s3"
import DynamoDB from "aws-sdk/clients/dynamodb"
import {
  get_app_state,
  get_database_state,
  get_table_state,
} from './helpers/s3'



class Brain {
  s3_location: string;
  s3_bucket: string;
  dynamo_location: string;
  dynamo_region: string;
  _state: StateCache;
  router: Router;
  s3: S3;
  dynamo: DynamoDB;

  constructor({ s3_location, s3_bucket, dynamo_location, dynamo_region }: {
    s3_location?: string,
    s3_bucket?: string,
    dynamo_location?: string,
    dynamo_region?: string,
  }={}) {
    this.s3_location = s3_location || process.env.AWS_S3_ENDPOINT || ""
    this.s3_bucket = s3_bucket || process.env.AWS_S3_BUCKET || ""
    this.dynamo_location = dynamo_location || process.env.AWS_DYNAMODB_ENDPOINT || ""
    this.dynamo_region = dynamo_region || process.env.AWS_DYNAMODB_REGION || ""
  
    this._state = {}
    this.router = new Router()

    // initialize clients
    this.s3 = new S3({
      endpoint: this.s3_location,
      s3ForcePathStyle: true,
    })
    this.dynamo = new DynamoDB({
      endpoint: this.dynamo_location,
      region: this.dynamo_region,
    })
  }

  handle({ method, path, body }: {
    method: HttpMethod,
    path: string,
    body: object,
  }): Promise<LambdaResponse> {
    // determine function to execute, based on given path
    const [handler, path_params] = this.router.route({ path })
    
    // execute function
    return handler.call(this, { method, path_params, body })
    .then(response => {
      
      // environment === lambda   `LambdaResponse`
      return {
        statusCode: response?.statusCode || 200,
        headers: {
          "Content-Type": "application/json"
        } || response?.headers,
        body: JSON.stringify(response.body),
      }

    })
    // if any errors occur, respond with error
    .catch((err: Error) => {
      console.log("error:", err)
      const response: ErrorResponseBody = {
        "message": "Error occured: " + err
      }
      return {
        statusCode: 500,
        headers: {},
        body: JSON.stringify(response),
      }
    })
  }

  // returns available databases
  async get_app_state() {
    const refresh_time  = Number.parseInt(process.env.REFRESH_CONFIG_SECONDS || `${10}`)
    const current_epoch = Math.round((new Date()).getTime() / 1000)
    if (!this._state.app || this._state.app.last_refresh < (current_epoch - refresh_time)) {
      this._state.app = {
        state: await get_app_state.call(this), last_refresh: current_epoch
      }
    }
    return this._state.app.state
  }

  // returns tables in database
  async get_database_state({ database }: { database: string }) {
    const refresh_time  = Number.parseInt(process.env.REFRESH_CONFIG_SECONDS || `${10}`)
    const current_epoch = Math.round((new Date()).getTime() / 1000)
    if (!this._state.database) {
      this._state.database = {
        [database]: { state: await get_database_state.call(this, database), last_refresh: current_epoch }
      }
    }
    else if (!this._state.database[database] || this._state.database[database].last_refresh < (current_epoch - refresh_time)) {
      this._state.database[database] = {
        state: await get_database_state.call(this, database), last_refresh: current_epoch
      }
    }
    return this._state.database[database].state
  }

  // returns indexed fields of table
  async get_table_state({ database, table }: { database: string, table: string }) {
    const refresh_time  = Number.parseInt(process.env.REFRESH_CONFIG_SECONDS || `${10}`)
    const current_epoch = Math.round((new Date()).getTime() / 1000)
    if (!this._state.table) {
      this._state.table = {
        [database]: { [table]: { state: await get_table_state.call(this, database, table), last_refresh: current_epoch } }
      }
    }
    else if (!this._state.table[database]) {
      this._state.table[database] = {
        [table]: { state: await get_table_state.call(this, database, table), last_refresh: current_epoch }
      }
    }
    else if (!this._state.table[database][table] || this._state.table[database][table].last_refresh < (current_epoch - refresh_time)) {
      this._state.table[database][table] = {
        state: await get_table_state.call(this, database, table), last_refresh: current_epoch
      }
    }
    return this._state.table[database][table].state
  }

}

export default Brain

