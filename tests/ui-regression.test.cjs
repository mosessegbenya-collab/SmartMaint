const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

test('JSX layout guards cannot produce empty strings or zero; literal layout text is prohibited', () => {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const problems = [];
  const layouts = new Set(['View','Card','Row','Screen','Section','Pressable','ScrollView','SafeAreaView','KeyboardAvoidingView']);
  for (const sf of program.getSourceFiles()) {
    if (!/(^|\/)src\//.test(sf.fileName.replaceAll('\\','/')) || !sf.fileName.endsWith('.tsx')) continue;
    function issue(n, message) { problems.push(`${sf.fileName}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}: ${message}`); }
    function walk(n) {
      if(ts.isJsxText(n) && n.getText().trim() && layouts.has(n.parent.openingElement?.tagName.getText())) issue(n, 'Literal text inside a layout container');
      if(ts.isJsxExpression(n) && n.expression && !ts.isJsxAttribute(n.parent)) {
        function check(e) {
          if(ts.isParenthesizedExpression(e)) return check(e.expression);
          if(!ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) return;
          check(e.left);
          const t=checker.getTypeAtLocation(e.left);
          if((t.isUnion()?t.types:[t]).some(t=>t.flags & (ts.TypeFlags.String | ts.TypeFlags.Number) || t.isStringLiteral() && t.value === '' || t.isNumberLiteral() && t.value === 0)) issue(e.left, 'Guard can render an empty string or zero: '+e.left.getText());
        }
        check(n.expression);
      }
      ts.forEachChild(n,walk);
    }
    walk(sf);
  }
  assert.deepEqual(problems, []);
  // Reproduce the exact cause: JS && preserves an empty string, and React retains it as a child.
  const React = require('react');
  assert.deepEqual(React.Children.toArray('' && React.createElement('span')), ['']);
  assert.deepEqual(React.Children.toArray(!!'' && React.createElement('span')), []);
});

test('dark semantic text colors meet normal-text contrast on dark card and input surfaces', () => {
  const source = ts.transpileModule(fs.readFileSync(path.resolve('src/design/tokens.ts'),'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS } }).outputText;
  const moduleStub={exports:{}};new Function('module','exports',source)(moduleStub,moduleStub.exports);
  const { readableSemanticColor, tokens, palette }=moduleStub.exports;
  const luminance=(hex)=>{const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;};
  for(const color of [tokens.blue,tokens.danger,tokens.success,tokens.warning])for(const background of [palette.dark.card,palette.dark.input]) {
    const a=luminance(readableSemanticColor(color,true)),b=luminance(background);
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${color} on ${background}`);
  }
});

test('status text meets normal-text contrast on every explicit light and dark semantic surface', () => {
  const source = ts.transpileModule(fs.readFileSync('src/design/tokens.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const stub = { exports: {} }; new Function('module', 'exports', source)(stub, stub.exports);
  const luminance = (hex) => hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  for (const dark of [false, true]) for (const tone of ['info', 'success', 'warning', 'danger', 'neutral']) {
    const { foreground, surface } = stub.exports.semanticStyle(tone, dark);
    const a = luminance(foreground), b = luminance(surface);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${tone}, dark=${dark}: ${foreground} on ${surface}`);
  }
});
