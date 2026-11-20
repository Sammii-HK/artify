import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from './lint-icons.mjs';
test('catches typed arrows, encoded arrows, escaped icons and dynamic icon strings',()=>{
 for(const s of ['<a>The reading shelf ↗</a>','<a>&#x2197;</a>','<a>&rarr;</a>','const icon="\\u2197";','<button>{busy ? "✓" : "+"}</button>'])assert.ok(scanSource(s).length,s);
});
test('catches ASCII icon controls and icon libraries',()=>{
 for(const s of ['<button aria-label="Close">x</button>','<span aria-hidden="true">{"+"}</span>','import {FiArrowUp} from "react-icons/fi";'])assert.ok(scanSource(s).length,s);
});
test('accepts Lucide, prose punctuation, code comments and mathematical notation',()=>{
 for(const s of ['import {ArrowUpRight} from "lucide-react"; const A=()=> <a>Read <ArrowUpRight aria-hidden="true" /></a>;','// flow → output\nconst A=()=> <p>2 + 2 = 4. It’s a thought.</p>;','const A=()=> <code>a → b</code>;'])assert.equal(scanSource(s).length,0,s);
});
test('checks CSS content and standalone HTML',()=>{
 assert.ok(scanSource('.next::after {content:"\\2192"}', 'style.css').length);
 assert.ok(scanSource('<a>Read &nearr;</a>', 'index.html').length);
 assert.equal(scanSource('/* → */ p { color: red }','style.css').length,0);
});

test("data symbols are review candidates, not automatically UI violations",()=>{ const findings=scanSource('const scientificNotation="→";');assert.equal(findings[0].rule,"symbol-review"); });

test("React keys and CSS template fragments are not ASCII icons",()=>{assert.equal(scanSource('const A=()=> <button key={`${id}-${value}`} style={{left:`-${offset}%`}}>Go</button>').filter(f=>f.rule!=="symbol-review").length,0);});

test("hand-drawn UI icons fail while data visualisations remain allowed",()=>{assert.ok(scanSource('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>').some(f=>f.rule==="lucide-only"));assert.equal(scanSource('<svg viewBox="0 0 400 300"><path d="M0 0"/></svg>').length,0);});

test("an explicitly identified product brand mark is not a UI icon",()=>{assert.equal(scanSource('<svg data-brand-mark="prism" viewBox="0 0 14 14"><path d="M0 0"/></svg>').length,0);});
