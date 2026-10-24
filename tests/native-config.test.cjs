const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configure, repairProperties } = require('../plugins/with-windows-cpp-runtime.cjs');
test('Windows C++ runtime config survives regeneration exactly once and preserves surrounding native configuration', () => {
  const source = 'buildscript { /* existing SDK settings */ }\n'; const once = configure(source);
  assert.equal(configure(once), once); assert.ok(once.includes(source.trim())); assert.match(once, /contains\('windows'\)/); assert.match(once, /-lc\+\+_shared -latomic -lm/); assert.equal((once.match(/windows-cpp-runtime begin/g) ?? []).length, 1);
  assert.throws(() => configure('// @smartmaint/windows-cpp-runtime begin'), /Incomplete/);
  const nativeRoot = source + 'allprojects { /* existing repositories */ }\napply plugin: "expo-root-project"\napply plugin: "com.facebook.react.rootproject"\n';
  const generated = configure(nativeRoot);
  assert.ok(generated.indexOf('windows-cpp-runtime begin') < generated.indexOf('apply plugin: "expo-root-project"'));
  assert.ok(generated.indexOf('buildscript {') < generated.indexOf('windows-cpp-runtime begin'));
  assert.ok(generated.includes('allprojects { /* existing repositories */ }'));
  assert.equal(configure(generated), generated);
});
test('inline-module repair preserves valid watched paths and existing JVM settings and rejects unknown corruption', () => {
  const jvm = { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx2048m' };
  const broken = { type: 'property', key: 'expo.inlineModules.watchedDirectories', value: '[]org.gradle.jvmargs=-Xmx4g' };
  const result = repairProperties([jvm, broken]); assert.deepEqual(result, [jvm, { ...broken, value: '[]' }]); assert.deepEqual(repairProperties(result), result);
  const valid = { ...broken, value: '["src/native"]' }; assert.deepEqual(repairProperties([valid]), [valid]); assert.throws(() => repairProperties([{ ...broken, value: 'invalid' }]), /JSON array/);
});
