'use strict'

import fetch from 'node-fetch'

/**
 * A connection to a single Clinical Data Repository
 * @param {Object} config CDR configuration
 * @param {String} config.url API URL (without a trailing /)
 * @param {Object} config.authentication Authentication configuration
 * @param {'basic'} config.authentication.type Type of authentication (currently only supports Basic)
 * @param {String} config.authentication.username Username for authentication
 * @param {String} config.authentication.password Password for authentication
 */
export class CDR {
  constructor (config) {
    this.url = config.url
    this.authentication = this._basic(config.authentication.username, config.authentication.password)
  }

  /**
   * Runs an AQL query against the CDR
   * @param {String} aql The AQL query to run
   * @returns {Promise<Object>} A promise resolving with the parsed JSON result of the query from the CDR, or rejecting with a {@link CDRError}
   */
  async query (aql) {
    return fetch(this.url + '/rest/v1/query', {
      method: 'post',
      body: JSON.stringify({ aql }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authentication
      }
    }).then(res => this._checkStatus(res))
  }

  /** @private **/
  _basic (username, password) {
    return 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
  }

  /** @private **/
  _checkStatus (res) {
    if (res.status === 204) {
      return {}
    } else if (!res.ok) {
      throw new CDRError(res)
    } else {
      return res.json()
    }
  }
}

/**
 * A connection to multiple Clinical Data Repositories
 * @param {Array<CDR>} cdrs Array of CDRs to connect to
 */
export class CDRs {
  constructor (cdrs) {
    this.cdrs = cdrs
  }

  /**
   * Runs an AQL query against the CDRs
   * @param {String} aql The AQL query to run
   * @returns {CDRsResponse<Array<Promise>>} Object representing responses from the CDRs
   */
  query (aql) {
    return new CDRsResponse(this.cdrs.map(c => c.query(aql)))
  }
}

/**
 * Class which combines responses from multiple CDRs
 * @param {Array<Promises>} promises Array of promises from calling the API
 */
export class CDRsResponse {
  constructor (promises) {
    this.promises = promises
  }

  /**
   * Wait for all API calls to succeed before resolving. If one fails, they all fail.
   * @returns {CDRsFormatter<Promise>}
   */
  all () {
    return new CDRsFormatter(Promise.all(this.promises))
  }
}

/**
 * Class which formats responses from multiple CDRs
 * @param {Promise} promise Promise which resolves with the result of an API call
 */
export class CDRsFormatter {
  constructor (promise) {
    this.promise = promise
  }

  /**
   * Concatenate results of multiple API calls
   * @returns {Promise} Promise which resolves with concatenated results
   */
  concat () {
    return this.promise
  }
}

/**
* Represents an error when communicating with a Clinical Data Repository
* @extends Error
* @param {Object} res node-fetch response object
* @property {String} message Status code and text returned by CDR
* @property {Object|String} body Error body returned by CDR: either parsed JSON or a HTML string
*/
export class CDRError extends Error {
  constructor (res) {
    super(res.status + ' ' + res.statusText)
    if (res.headers.get('content-type').includes('application/json')) {
      this.body = res.json()
    } else {
      this.body = res.text()
    }
  }
}
