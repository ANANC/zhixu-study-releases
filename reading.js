'use strict';
// Reading difficulties are user-reported clues. They never change course mastery.
let readingSelection=null,readingSelectionTimer=0,readingPainting=false;

function readingData(){
  if(!state.reading||typeof state.reading!=='object'||Array.isArray(state.reading))state.reading={version:1,items:[]};
  state.reading.version=1;if(!Array.isArray(state.reading.items))state.reading.items=[];
  return state.reading;
}
function readingItem(id){return readingData().items.find(item=>item.id===id);}
function readingSave(item){if(item)item.updatedAt=Date.now();save();return desktop&&booted?persist():Promise.resolve();}
function readingNormalize(value){return String(value||'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();}
function readingMaterialKey(text){let hash=2166136261;for(const char of String(text)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return 'material-'+(hash>>>0).toString(16);}
function readingSourceLabel(item){const s=item.source||{};return [s.themeTitle||s.courseTitle,s.activityTitle].filter(Boolean).join(' · ')||'实际阅读材料';}
function readingTermPattern(term){return readingNormalize(term).split(/\s+/).map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/'/g,"['’‘]")).join('\\s+');}
function readingTermMatches(text,term){
  const pattern=new RegExp('(^|[^A-Za-z])('+readingTermPattern(term)+')(?=$|[^A-Za-z])','gi'),matches=[];
  let match;while((match=pattern.exec(text))&&matches.length<100){const start=match.index+match[1].length;matches.push({start,end:start+match[2].length});if(pattern.lastIndex===match.index)pattern.lastIndex++;}
  return matches;
}
function readingSentenceHTML(item){
  const sentence=String(item.sentence||''),match=readingTermMatches(sentence,item.term||'')[0];
  return match?esc(sentence.slice(0,match.start))+'<mark class="reading-term">'+esc(sentence.slice(match.start,match.end))+'</mark>'+esc(sentence.slice(match.end)):esc(sentence);
}

function readingSegments(text){
  try{if(Intl.Segmenter)return [...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(s=>({start:s.index,end:s.index+s.segment.length}));}catch{}
  const out=[];let start=0;const endings=/[.!?。！？]+(?:["”’']*)\s+|[\r\n]+/g;let match;
  while((match=endings.exec(text))){const end=match.index+match[0].length;out.push({start,end});start=end;}
  if(start<text.length)out.push({start,end:text.length});return out;
}
function readingSentenceAt(text,start,end=start+1){
  const segments=readingSegments(text),first=segments.findIndex(s=>start>=s.start&&start<s.end);
  if(first<0)return {sentence:text.trim(),context:text.trim().slice(0,1800),start:0,end:text.length};
  let last=first;while(last<segments.length-1&&end>segments[last].end)last++;
  const from=segments[first].start,to=segments[last].end;
  const contextStart=segments[Math.max(0,first-1)].start,contextEnd=segments[Math.min(segments.length-1,last+1)].end;
  return {sentence:text.slice(from,to).trim(),context:text.slice(contextStart,contextEnd).trim().slice(0,1800),start:from,end:to};
}
function readingActiveMeta(){return typeof adaptiveData==='function'?adaptiveData().loops[state.selected]:null;}
function readingReadingRoots(){
  const result=new Set();
  document.querySelectorAll('#workspace .task-material,[data-reading-material="true"]').forEach(node=>result.add(node));
  const course=courses[state.selected],meta=readingActiveMeta(),session=ses();
  if(course?.subject==='英语'||meta?.subject==='en'){
    document.querySelectorAll('#workspace .task .question').forEach(node=>{if((node.textContent.match(/[A-Za-z]+/g)||[]).length>=3)result.add(node);});
    if(state.page==='lesson'&&session?.stage==='learn'){
      const activity=meta?.activities?.[meta.activityIndex||0];
      document.querySelectorAll('#workspace .card .pre,#workspace .card p[style*="white-space"],#workspace .card .notice').forEach(node=>{
        const text=node.textContent.trim();
        if(activity?text===String(activity.content||'').trim():text===String(course.teaching||'').trim()||text===String(course.example||'').trim())result.add(node);
      });
    }
  }
  // Preview material is already visible to the learner, never hidden tests.
  document.querySelectorAll('#modalroot .pre').forEach(node=>{
    const text=node.textContent;if((text.match(/\b[A-Za-z][A-Za-z'-]*\b/g)||[]).length>=12&&!/^\s*(?:function\s|const\s|let\s|class\s|#include)/.test(text))result.add(node);
  });
  return [...result].filter(node=>node.isConnected&&!node.closest('.transcript,.reading-list,.reading-item-detail,.reading-review-task,.reading-review-panel')&&!node.querySelector('input,textarea'));
}
function readingSourceFor(node,text){
  const course=courses[state.selected],meta=readingActiveMeta(),activity=meta?.activities?.[meta.activityIndex||0];
  const run=typeof adaptiveData==='function'?adaptiveData().run:null;
  const inDiagnosis=state.page==='courses'&&typeof adaptiveData==='function'&&adaptiveData().view==='diagnosis'&&run;
  const source={courseId:course?.id||null,courseTitle:course?.title||'',themeTitle:meta?.theme?.title||course?.title||'',subject:course?.subject||'',page:state.page,stage:ses()?.stage||'',materialKey:readingMaterialKey(text)};
  if(activity){source.activityId=activity.id;source.activityTitle=activity.title;}
  if(inDiagnosis){source.courseId=null;source.courseTitle=run.taskTitle||'目标阅读任务';source.themeTitle=run.theme?.title||run.taskTitle||'';source.subject=typeof adaptiveSubjects==='object'?adaptiveSubjects[run.subject]?.title||run.subject:run.subject;source.diagnosisId=run.id;source.stage='diagnosis';}
  if(node.closest('#modalroot')){source.preview=true;source.activityTitle=node.previousElementSibling?.matches('h3')?node.previousElementSibling.textContent:'';source.themeTitle=document.querySelector('.modal h3')?.textContent||source.themeTitle||document.querySelector('.modal h2')?.textContent||'阅读材料预览';}
  return source;
}
function readingSelectedCandidate(){
  const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
  const range=selection.getRangeAt(0),startNode=range.startContainer.nodeType===Node.ELEMENT_NODE?range.startContainer:range.startContainer.parentElement;
  const root=readingReadingRoots().find(node=>node===startNode||node.contains(startNode));if(!root||!root.contains(range.endContainer))return null;
  const raw=selection.toString(),trimmed=raw.trim().replace(/^["“”‘(\[]+|["“”’).,;:!?\]]+$/g,'').trim(),term=readingNormalize(trimmed);
  if(!term||term.length>120||!/^\p{ASCII}+$/u.test(term.replace(/[’‘]/g,"'"))||!/^[A-Za-z]+(?:['’-][A-Za-z]+)*(?:\s+[A-Za-z]+(?:['’-][A-Za-z]+)*){0,7}$/.test(term))return null;
  const prefix=document.createRange();prefix.selectNodeContents(root);prefix.setEnd(range.startContainer,range.startOffset);
  const text=root.textContent,start=prefix.toString().length+Math.max(0,raw.indexOf(trimmed)),end=start+trimmed.length,entry=readingSentenceAt(text,start,end);
  if(!entry.sentence||entry.sentence.length>1800||!readingTermMatches(entry.sentence,term).length)return null;
  const rects=range.getClientRects(),rect=rects.length?rects[rects.length-1]:range.getBoundingClientRect();if(!rect.width&&!rect.height)return null;
  return {term,sentence:entry.sentence,context:entry.context,source:readingSourceFor(root,text),root,rect};
}
function readingTool(){
  let tool=document.getElementById('reading-selection-tool');if(tool)return tool;
  tool=document.createElement('div');tool.id='reading-selection-tool';tool.className='reading-selection-tool';tool.hidden=true;tool.setAttribute('role','toolbar');tool.setAttribute('aria-label','阅读生词标记');
  tool.innerHTML='<button type="button" data-action="markReadingSelection()">不认识 <span aria-hidden="true">＋</span></button>';
  tool.addEventListener('mousedown',event=>event.preventDefault());document.body.appendChild(tool);return tool;
}
function readingHideTool(){const tool=document.getElementById('reading-selection-tool');if(tool)tool.hidden=true;}
function readingRefreshSelection(){
  if(readingPainting)return;let candidate;try{candidate=readingSelectedCandidate();}catch{candidate=null;}
  if(!candidate){readingSelection=null;readingHideTool();readingPaintAll();return;}
  readingSelection=candidate;const tool=readingTool(),view=window.visualViewport,left=view?.offsetLeft||0,top=view?.offsetTop||0,width=view?.width||window.innerWidth,height=view?.height||window.innerHeight;
  tool.querySelector('button').setAttribute('aria-label','标记“'+candidate.term+'”在这个句子中不认识');tool.hidden=false;
  const w=tool.offsetWidth||126,h=tool.offsetHeight||43,x=Math.max(left+8,Math.min(left+width-w-8,candidate.rect.left+candidate.rect.width/2-w/2));
  const below=candidate.rect.bottom+8,y=below+h<top+height-8?below:Math.max(top+8,candidate.rect.top-h-8);
  tool.style.left=Math.round(x)+'px';tool.style.top=Math.round(y)+'px';
}
function readingScheduleSelection(){clearTimeout(readingSelectionTimer);readingSelectionTimer=setTimeout(readingRefreshSelection,110);}
async function markReadingSelection(){
  if(busy||window.studyDataReplacing)return toast('请等待当前请求完成后标记');
  const selected=readingSelection;if(!selected||!selected.root.isConnected)return toast('请先在阅读材料中选中英文单词或短语');
  const data=readingData();let item=data.items.find(x=>readingNormalize(x.term).toLowerCase()===selected.term.toLowerCase()&&readingNormalize(x.sentence)===readingNormalize(selected.sentence)&&x.source?.materialKey===selected.source.materialKey);
  if(!item&&data.items.length>=2000)return toast('已保存 2000 个阅读句子，请先整理已有记录后再新增');
  if(!item){item={id:'reading-'+crypto.randomUUID(),term:selected.term,sentence:selected.sentence,context:selected.context,source:selected.source,markedAt:Date.now(),updatedAt:Date.now(),myUnderstanding:'',explanation:null,status:'unknown'};data.items.push(item);}else{item.status='unknown';item.updatedAt=Date.now();}
  readingHideTool();try{await readingSave(item);toast('已保存这个原句中的陌生表达，可继续阅读；在笔记里补充理解');}catch(e){showError(e);}
  // Wait until native selection is released before adding highlight markup.
  readingPaintAll();
}

function readingTextNodes(root){
  const nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,offset=0;
  while((node=walker.nextNode())){nodes.push({node,start:offset,end:offset+node.data.length});offset+=node.data.length;}
  return nodes;
}
function readingPaint(root){
  const selection=window.getSelection();if(selection&&!selection.isCollapsed&&selection.rangeCount&&root.contains(selection.getRangeAt(0).startContainer))return;
  const text=root.textContent,key=readingMaterialKey(text),items=readingData().items.filter(item=>item.status!=='archived'&&item.source?.materialKey===key);
  if(!items.length)return;
  const existing=new Set([...root.querySelectorAll('.reading-unfamiliar')].map(mark=>mark.dataset.readingItem));
  const matches=[];for(const item of items){if(existing.has(item.id))continue;for(const match of readingTermMatches(text,item.term)){if(readingNormalize(readingSentenceAt(text,match.start,match.end).sentence)!==readingNormalize(item.sentence))continue;matches.push({...match,item});}}
  matches.sort((a,b)=>a.start-b.start||b.end-a.end);const unique=[];let end=-1;for(const match of matches){if(match.start<end)continue;unique.push(match);end=match.end;}
  const nodes=readingTextNodes(root);for(const match of unique.slice(0,150).reverse()){
    const first=nodes.find(x=>match.start>=x.start&&match.start<x.end),last=nodes.find(x=>match.end>x.start&&match.end<=x.end);if(!first||!last||!first.node.isConnected||!last.node.isConnected)continue;
    if(first.node.parentElement.closest('.reading-unfamiliar')||last.node.parentElement.closest('.reading-unfamiliar'))continue;
    try{const range=document.createRange();range.setStart(first.node,match.start-first.start);range.setEnd(last.node,match.end-last.start);const mark=document.createElement('mark');mark.className='reading-unfamiliar';mark.dataset.readingItem=match.item.id;mark.dataset.action=`readingItemModal('${match.item.id}')`;mark.setAttribute('role','button');mark.setAttribute('tabindex','0');mark.setAttribute('aria-label','查看“'+match.item.term+'”的原句与理解；练习中查看计为帮助');mark.appendChild(range.extractContents());range.insertNode(mark);}catch{}
  }
}
function readingPaintAll(){
  if(readingPainting)return;readingPainting=true;try{for(const root of readingReadingRoots()){root.classList.add('reading-material');root.dataset.readingMaterial='true';readingPaint(root);}}finally{readingPainting=false;}
}

function readingQuestionMatches(item,q){
  const key=item?.source?.materialKey;if(!key||!q)return false;
  const candidates=[q.material,q.prompt];
  if(q.material&&q.prompt&&!q.prompt.includes(q.material))candidates.push(q.material+'\n\n'+q.prompt);
  return candidates.filter(Boolean).some(text=>readingMaterialKey(text)===key);
}
function readingHelpScope(item){
  if(!item)return {};
  const source=item.source||{},courseId=state.active||state.selected,course=courses[courseId],session=ses(courseId);
  const courseMatches=!!courseId&&(source.courseId===courseId||readingQuestionMatches(item,course&&session?currentQ(course,session):null));
  const homeworkMatches=courseMatches&&session?.homework&&!session.homework.pass&&(state.page==='assignment'||source.page==='assignment');
  const ordinaryReview=state.reviewRun,ordinaryMatches=ordinaryReview?.answer===null&&(source.courseId===ordinaryReview.course||readingQuestionMatches(item,courses[ordinaryReview.course]?.review));
  const diagnosis=typeof adaptiveData==='function'?adaptiveData().run:null;
  const diagnosisMatches=diagnosis&&!diagnosis.done&&!diagnosis.feedback&&(source.diagnosisId===diagnosis.id||readingQuestionMatches(item,diagnosis.questions?.[diagnosis.index]));
  const sentenceReview=readingData().reviewRun,sentenceMatches=sentenceReview?.itemId===item.id&&sentenceReview.answer===null&&!sentenceReview.confirmed;
  return {session:courseMatches?session:null,homework:homeworkMatches?session.homework:null,ordinaryReview:ordinaryMatches?ordinaryReview:null,diagnosis:diagnosisMatches?diagnosis:null,sentenceReview:sentenceMatches?sentenceReview:null};
}
function readingPendingHelp(item){
  const scope=readingHelpScope(item);
  return !!(scope.session?.stage==='acceptance'||scope.homework||scope.ordinaryReview||scope.diagnosis||scope.sentenceReview);
}
function readingMarkHelp(item){
  let changed=false;const scope=readingHelpScope(item),session=scope.session;
  if(session?.stage==='acceptance'){session.hinted=true;session.confirmed=false;changed=true;}
  if(session?.stage==='practice'){session.practiceHint=true;changed=true;}
  if(scope.homework){scope.homework.hinted=true;session.confirmed=false;changed=true;}
  for(const run of [scope.ordinaryReview,scope.diagnosis,scope.sentenceReview])if(run){run.hinted=true;changed=true;}
  if(changed)save();return changed;
}
function readingExplanationHTML(item){
  const x=item.explanation;if(!x)return '<p class="sub space">先写下你对原句的理解，也可以按需获取 AI 的句中解释。</p>';
  return `<section class="reading-explanation"><h3>这个句子中的意思与用法</h3>${x.originalTranslation?`<p class="reading-translation">${esc(x.originalTranslation)}</p>`:''}<p>${esc(x.meaning)}</p><p class="sub">${esc(x.usage)}</p><h3 class="space">换一个句子看它怎么用</h3><p class="reading-sentence">${esc(x.example)}</p><p class="reading-translation">${esc(x.translation)}</p><p class="tiny space">AI 句中解释 · ${esc(x.model||'已保存解释')} · 需要结合上下文核对。练习时不会提前显示参考答案。</p></section>`;
}
function readingItemModal(id){
  const item=readingItem(id);if(!item)return toast('这条阅读记录已不存在');
  const helped=(item.explanation||item.myUnderstanding||readingData().reviewRun?.itemId===id)&&readingMarkHelp(item);
  if(helped)readingSave().catch(showError);
  const pending=readingPendingHelp(item);
  openModal('原句与我的理解',`<div class="reading-item-detail"><div class="reading-source">${esc(readingSourceLabel(item))}</div><p class="reading-sentence">${readingSentenceHTML(item)}</p><p class="sub">你标记的陌生表达：${esc(item.term)}</p>${helped?'<div class="notice amber space">查看了练习中的原句或已有理解，本轮记录为有帮助的训练。</div>':pending?'<div class="notice amber space">当前有独立任务正在进行。获取句中解释会记录帮助，本轮只计训练。</div>':''}<div class="field"><label for="reading-understanding">我的句中理解</label><textarea id="reading-understanding" class="input" placeholder="写出整个句子的意思，说明这个词或短语在这里起什么作用。">${esc(item.myUnderstanding||'')}</textarea></div><div class="actions space">${btn('保存我的理解',`saveReadingUnderstanding('${id}')`,'primary')}${btn(item.explanation?'重新获取句中解释':'获取 AI 句中解释',`explainReadingItem('${id}')`)}${typeof startReadingReview==='function'?btn('练这个句子',`startReadingReview('${id}')`):''}</div>${readingExplanationHTML(item)}<details class="space"><summary>查看原句附近的阅读上下文</summary><p class="reading-context">${esc(item.context||item.sentence)}</p></details><p class="tiny space">“不认识”是你的学习线索；保存理解、查看解释或练习不会直接改变课程掌握度。记录随学习空间保存到有道。</p></div>`);
}
async function saveReadingUnderstanding(id){
  const item=readingItem(id),field=document.getElementById('reading-understanding');if(!item||!field)return;
  item.myUnderstanding=field.value.trim().slice(0,4000);item.updatedAt=Date.now();if(item.myUnderstanding)item.status='learning';
  try{await readingSave(item);toast('你的原句理解已保存');}catch(e){showError(e);}
}
async function explainReadingItem(id){
  const item=readingItem(id);if(!item)return;if(busy)return toast('请等当前请求完成后获取解释');
  if(!desktop?.explainReadingTerm)return toast('句中解释服务尚未加载，请更新应用后重试');
  if(!aiConfigured())return toast('请先在设置中选择并授权 AI；陌生句子已经保存');
  const field=document.getElementById('reading-understanding');if(field)item.myUnderstanding=field.value.trim().slice(0,4000);
  readingMarkHelp(item);try{await readingSave(item);}catch(e){showError(e);return;}
  await task(async()=>{
    requestId='reading-explain-'+crypto.randomUUID();const s=item.source||{};
    const result=await desktop.explainReadingTerm({id:requestId,term:item.term,sentence:item.sentence,context:item.context||item.sentence,source:{courseTitle:s.courseTitle||'',themeTitle:s.themeTitle||'',subject:s.subject||'',activityTitle:s.activityTitle||'',materialKey:s.materialKey||''}});
    if(!readingItem(id))return;
    item.explanation={originalTranslation:result.originalTranslation||'',meaning:result.meaning,usage:result.usage,example:result.example,translation:result.translation,question:result.question,expected:result.expected,model:result.model,at:Date.now()};item.status='learning';item.updatedAt=Date.now();
    await readingSave(item);readingItemModal(id);
  });
}
function readingListHTML(limit=8){
  const items=readingData().items.filter(item=>item.status!=='archived').slice().sort((a,b)=>(b.updatedAt||b.markedAt||0)-(a.updatedAt||a.markedAt||0));
  if(!items.length)return '<p class="sub space">阅读时选中英文单词或短语，点击“不认识”。保存的是所在句子；之后补充句中理解，再用句子练习。</p>';
  return `<div class="reading-list">${items.slice(0,limit).map(item=>`<article class="reading-list-item"><p class="reading-sentence">${readingSentenceHTML(item)}</p><div class="reading-list-foot"><span class="tiny">${esc(readingSourceLabel(item))} · ${item.myUnderstanding?'已写理解':item.explanation?'已有句中解释':'理解待补充'}</span>${btn('查看原句与理解',`readingItemModal('${item.id}')`,'small')}</div></article>`).join('')}</div>${items.length>limit?`<p class="tiny space">还有 ${items.length-limit} 个句子，可以展开全部查看。</p>${btn('查看全部阅读句子','readingAllModal()','small space')}`:''}`;
}
function readingAllModal(){openModal('我的阅读句子',`<p class="sub">按实际原句回看陌生表达和用法，不把它们拆成孤立单词。</p>${readingListHTML(500)}`);}
const readingBaseNotes=notesPage;
notesPage=function(){return readingBaseNotes()+`<section class="card reading-panel space"><div class="row"><h3>阅读句子与我的理解</h3>${badge(readingData().items.filter(x=>x.status!=='archived').length+' 个实际句子','gray')}</div>${readingListHTML(8)}</section>`;};
const readingBaseReview=reviewPage;
reviewPage=function(){return readingBaseReview()+`<section class="card reading-panel space"><h3>从阅读原句补充理解</h3><p class="sub space">先弄清原句中的意思和用法，再用完整句子回忆。以下标记来自你的实际阅读，不当作考试掌握结论。</p>${readingListHTML(3)}</section>`;};
const readingBaseContext=contextFor;
contextFor=function(course,session){
  const result=readingBaseContext(course,session),items=readingData().items.filter(item=>item.status!=='archived'&&(!course||item.source?.courseId===course.id)).slice(-12);
  return {...result,readingClues:{scope:'用户报告的句中词汇困难，不能据此推断全文理解、模块掌握或考试水平；只用于围绕实际句子补充理解。',items:items.map(item=>({term:item.term,sentence:item.sentence,myUnderstanding:item.myUnderstanding||'',status:item.status||'unknown',source:readingSourceLabel(item)}))}};
};
const readingBaseRender=render;
render=function(where){readingHideTool();readingSelection=null;readingBaseRender(where);readingData();readingPaintAll();};
['markReadingSelection','readingItemModal','saveReadingUnderstanding','explainReadingItem','readingAllModal'].forEach(name=>actions.add(name));
document.addEventListener('selectionchange',readingScheduleSelection);
document.addEventListener('mouseup',readingScheduleSelection);
document.addEventListener('touchend',readingScheduleSelection,{passive:true});
document.addEventListener('scroll',event=>{if(!event.target.closest?.('.reading-selection-tool'))readingHideTool();},true);
window.addEventListener('resize',readingHideTool);
document.addEventListener('click',event=>{if(!event.target.closest?.('.reading-unfamiliar'))return;const selection=window.getSelection();if(selection&&!selection.isCollapsed){event.preventDefault();event.stopImmediatePropagation();readingScheduleSelection();}},true);
document.addEventListener('keydown',event=>{const mark=event.target.closest?.('.reading-unfamiliar');if(mark&&(event.key==='Enter'||event.key===' ')){event.preventDefault();readingItemModal(mark.dataset.readingItem);}});
readingData();readingPaintAll();
