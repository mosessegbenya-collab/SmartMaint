const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]); }
for(const file of [...files('src/features'),...files('src/components/smart')]) {
  const text=fs.readFileSync(file,'utf8');
  const tree=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const used=new Set();
  function visit(node){if(ts.isImportDeclaration(node))return;if(ts.isIdentifier(node))used.add(node.text);ts.forEachChild(node,visit);}
  visit(tree);
  const edits=[];
  for(const node of tree.statements){
    if(!ts.isImportDeclaration(node)||!node.importClause)continue;
    const clause=node.importClause, bindings=clause.namedBindings;
    const names=[];
    if(clause.name&&used.has(clause.name.text))names.push(clause.name.text);
    if(bindings&&ts.isNamespaceImport(bindings)&&used.has(bindings.name.text))names.push(`* as ${bindings.name.text}`);
    if(bindings&&ts.isNamedImports(bindings)){
      const retained=bindings.elements.filter(e=>used.has(e.name.text));
      if(retained.length)names.push(`{ ${retained.map(e=>e.getText(tree)).join(', ')} }`);
    }
    const replacement=names.length?`import ${clause.isTypeOnly?'type ':''}${names.join(', ')} from ${node.moduleSpecifier.getText(tree)};`:'';
    edits.push({start:node.getStart(tree),end:node.end,replacement});
  }
  let result=text;for(const e of edits.reverse())result=result.slice(0,e.start)+e.replacement+result.slice(e.end);
  fs.writeFileSync(file,result);
}
