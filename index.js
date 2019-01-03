'use strict'

import fetch from 'node-fetch'

export default class CDR {
  constructor (config) {
    this.url = config.url
    this.authentication = this._basic(config.authentication.username, config.authentication.password)
  }

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

  _basic (username, password) {
    return 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
  }

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
