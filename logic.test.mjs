import test from 'node:test';
import assert from 'node:assert/strict';
import { renamePreview } from './utils.mjs';
test('folder extensions, numbering and conflicts', () => {
  const rows = renamePreview([{name:'notes.v1',path:'C:/notes.v1',directory:true},{name:'photo.jpg',path:'C:/photo.jpg'}],{mode:'sequence',start:0,step:2,pad:2});
  assert.deepEqual(rows.map(r=>r.newName), ['00','02.jpg']);
  const files = [{name:'a.txt',path:'C:/docs/a.txt'},{name:'b.txt',path:'C:/docs/b.txt'}];
  assert.ok(renamePreview(files,{mode:'manual',lines:'same\nsame'}).every(r=>r.error));
  assert.equal(renamePreview(files,{mode:'replace',find:'a',replace:'b'})[0].error,'目标已存在');
  assert.ok(renamePreview(files,{mode:'manual',lines:'CON\nx'})[0].error);
});
