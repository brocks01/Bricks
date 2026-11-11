import { isSingaporeMobile, normalisePhone } from './phone';

it.each([
  ['91234567', true],
  ['+65 9123 4567', true],
  ['6591234567', true],
  ['8123-4567', true],
  ['61234567', false],
  ['9123456', false],
  ['', false],
])('%s is a Singapore mobile: %s', (input, expected) => {
  expect(isSingaporeMobile(input)).toBe(expected);
});

it('stores numbers as +65 and leaves others as typed', () => {
  expect(normalisePhone('9123 4567')).toBe('+6591234567');
  expect(normalisePhone(' +91 98765 43210 ')).toBe('+91 98765 43210');
});
