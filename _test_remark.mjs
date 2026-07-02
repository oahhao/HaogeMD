import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

const md1 = '![alt](<Z附件/Pasted image 20260702131312.png>)';
const r1 = unified().use(remarkParse).use(remarkStringify).processSync(md1);
console.log('1. Angle brackets:', JSON.stringify(String(r1)));

const md2 = '![alt](Z附件/Pasted%20image%2020260702131312.png)';
const r2 = unified().use(remarkParse).use(remarkStringify).processSync(md2);
console.log('2. Percent-encoded:', JSON.stringify(String(r2)));

const md3 = '![alt](<path with spaces.png>)';
const tree3 = unified().use(remarkParse).parse(md3);
console.log('3. Image URL (brackets):', JSON.stringify(tree3.children[0].children[0].url));

const md4 = '![alt](path%20with%20spaces.png)';
const tree4 = unified().use(remarkParse).parse(md4);
console.log('4. Image URL (%20):', JSON.stringify(tree4.children[0].children[0].url));
