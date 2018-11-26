import CDR from '../index'

test('return hello world', () => {
  let cdr = new CDR({})
  expect(cdr.hello()).toBe('Hello World!')
})
