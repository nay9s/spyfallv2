const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseSpyIndex } = require('../index');

const players = [
  { sessionToken: 'player-a' },
  { sessionToken: 'player-b' },
  { sessionToken: 'player-c' },
];

test('the previous spy can be selected for a second consecutive round', () => {
  const nextSpyIndex = chooseSpyIndex(players, 'player-b', 1, 0.5);
  assert.equal(players[nextSpyIndex].sessionToken, 'player-b');
});

test('a third consecutive round is forced to choose a different spy', () => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const randomValue = attempt / 200;
    const nextSpyIndex = chooseSpyIndex(players, 'player-b', 2, randomValue);
    assert.notEqual(players[nextSpyIndex].sessionToken, 'player-b');
  }
});

test('a missing previous spy does not exclude any current player', () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const nextSpyIndex = chooseSpyIndex(players, 'player-who-left', 2);
    assert.ok(nextSpyIndex >= 0 && nextSpyIndex < players.length);
  }
});

test('selection falls back safely when there is only one player', () => {
  assert.equal(chooseSpyIndex([{ sessionToken: 'only-player' }], 'only-player', 2), 0);
});
