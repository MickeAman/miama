const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const initial = JSON.parse(html.match(/id="initial-roster" type="application\/json">(.*?)<\/script>/s)[1]);
const source = html.match(/<script>\n('use strict';.*?)<\/script>/s)[1];
const context = { structuredClone, document: { getElementById: () => ({ textContent: JSON.stringify(initial) }) } };
vm.createContext(context);
vm.runInContext(source.slice(0, source.indexOf('try{const raw=localStorage')), context);
const evaluate = code => vm.runInContext(code, context);
test('old proposals get neutral names without changing assignments', () => {
 evaluate(`var proposal=fresh();proposal.teams.green.name='Grön';proposal.teams.green.level='Lätt';proposal.teams.blue.name='Blå';proposal.teams.blue.level='Medel';proposal.teams.yellow.name='Gul';proposal.teams.yellow.level='Medel';proposal.people[0].team='yellow';var migrated=validate(proposal);`);
 assert.equal(evaluate('migrated.teams.green.name'), 'Lag 1');
 assert.equal(evaluate('migrated.teams.blue.name'), 'Lag 2');
 assert.equal(evaluate('migrated.teams.yellow.name'), 'Lag 3');
 assert.equal(evaluate('migrated.people[0].team'), 'yellow');
 assert.equal(evaluate("'level' in migrated.teams.blue"), false);
 assert.equal(evaluate('validate(migrated).teams.blue.name'), 'Lag 2');
 assert.equal(evaluate('migrated.people.length'), initial.length);
});
test('custom team names survive and new proposals validate', () => {
 assert.equal(evaluate("proposal.teams.blue.name='Cup lördag';validate(proposal).teams.blue.name"), 'Cup lördag');
 assert.equal(evaluate('validate(fresh()).teams.green.name'), 'Lag 1');
});
test('editor and summaries have no level controls or labels', () => {
 assert.ok(!html.includes('id="team-level"'));
 assert.ok(!source.includes('team.level'));
 assert.ok(!source.includes('t.level'));
 new vm.Script(source);
});
test('all outfield positions are available and survive validation', () => {
 assert.deepEqual(JSON.parse(evaluate('JSON.stringify(Object.values(POSITIONS))')).filter(v => ['Back','Mittfältare','Yttermittfältare','Anfallare'].includes(v)), ['Back','Mittfältare','Yttermittfältare','Anfallare']);
 assert.equal(evaluate("var p2=fresh();p2.people[0].position='winger';validate(p2).people[0].position"), 'winger');
});
test('removed players stay removed, old saves still get missing active players', () => {
 assert.equal(evaluate("var p4=fresh();p4.people=p4.people.filter(p=>p.name!=='Zubeyr');validate(p4).people.some(p=>p.name==='Zubeyr')"), false);
 assert.equal(evaluate("var p3=fresh();p3.version=3;p3.people=p3.people.filter(p=>p.name!=='Zubeyr');validate(p3).people.some(p=>p.name==='Zubeyr')"), true);
 assert.equal(evaluate('validate(fresh()).version'), 4);
});
