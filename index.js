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
export default class CDR {
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
