import CDR, { CDRError } from '../index'
import nock from 'nock'
import path from 'path'

nock.back.fixtures = path.join(__dirname, '/fixtures')
// nock.back.setMode('record')
nock.back.setMode('lockdown')

let nockDone
let nockContext

async function nockBack (fixture) {
  let back = await nock.back(fixture, { recorder: { enable_reqheaders_recording: true } })
  nockDone = back.nockDone
  nockContext = back.context
}

let cdr

beforeEach(() => {
  cdr = new CDR({
    url: 'https://cdr.code4health.org',
    authentication: {
      scheme: 'basic',
      username: 'username',
      password: 'pa$$word'
    }
  })
})

afterEach(() => {
  nockContext.assertScopesFinished()
  nockDone()
})

describe('querying CDR', () => {
  test('successfully', async () => {
    await nockBack('query_success.json')
    const res = cdr.query('SELECT TOP 1 e/ehr_id/value AS id FROM EHR e')
    await expect(res).resolves.toEqual({
      'meta': {
        'href': 'https://cdr.code4health.org/rest/v1/query/'
      },
      'aql': 'SELECT TOP 1 e/ehr_id/value AS id FROM EHR e',
      'executedAql': 'SELECT TOP 1 e/ehr_id/value AS id FROM EHR e',
      'resultSet': [
        {
          'id': '8c52f5fc-317a-48fa-9bd3-0bf29f0f7d33'
        }
      ]
    })
  })

  test('returns no results', async () => {
    await nockBack('query_none.json')
    const res = cdr.query('SELECT TOP 0 e FROM EHR e')
    await expect(res).resolves.toEqual({})
  })

  test('with malformed AQL', async () => {
    await nockBack('query_malformed.json')
    expect.assertions(2)
    try {
      await cdr.query('SELECT')
    } catch (e) {
      expect(e instanceof CDRError).toBe(true)
      expect(await e.body).toEqual({
        'status': 400,
        'code': 'QRY-4135',
        'userMessage': 'Could not parse the query.',
        'developerMessage': 'Cannot parse AQL.',
        'exceptionMessage': 'Invalid aql at 1, 6. Token: <EOF>; SELECT--> ',
        'moreInfo': 'https://confluence.ehrvendor.com/display/ehrrest/QRY-4135',
        'requestHref': 'https://cdr.code4health.org/rest/v1/query'
      })
    }
  })

  test('with invalid authentication', async () => {
    cdr = new CDR({
      url: 'https://cdr.code4health.org',
      authentication: {
        scheme: 'basic',
        username: 'wrong',
        password: 'wrong'
      }
    })

    await nockBack('query_invalid_auth.json')
    expect.assertions(2)
    try {
      await cdr.query('SELECT TOP 1 e/ehr_id/value AS id FROM EHR e')
    } catch (e) {
      expect(e instanceof CDRError).toBe(true)
      expect(await e.body).toEqual(`<html>
<head>
<meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>
<title>Error 401 Unauthorized</title>
</head>
<body><h2>HTTP ERROR 401</h2>
<p>Problem accessing /rest/v1/query. Reason:
<pre>    Unauthorized</pre></p><hr><a href="http://eclipse.org/jetty">Powered by Jetty:// 9.4.5.v20170502</a><hr/>

</body>
</html>
`)
    }
  })
})
