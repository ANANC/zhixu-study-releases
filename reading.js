'use strict';
// Reading difficulties are user-reported clues. They never change course mastery.
let readingSelection=null,readingSelectionTimer=0,readingPainting=false,readingPressedSelection=null,readingSelectionLockUntil=0;
let readingTapMode=null,readingSentencePicker=null;
const readingMaterials=new Map();

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
  const pattern=new RegExp('(^|[^\\p{Script=Latin}\\p{Number}_])('+readingTermPattern(term)+')(?=$|[^\\p{Script=Latin}\\p{Number}_])','giu'),matches=[];
  let match;while((match=pattern.exec(text))&&matches.length<100){const start=match.index+match[1].length;matches.push({start,end:start+match[2].length});if(pattern.lastIndex===match.index)pattern.lastIndex++;}
  return matches;
}
function readingSentenceHTML(item){
  if(typeof readingReviewHiddenSentence==='function'&&readingReviewHiddenSentence(item))return '<span class="reading-hidden-sentence">这轮原句已隐藏，继续回忆或主动查看提示后再看。</span>';
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
  return [...result].filter(node=>node.isConnected&&!node.closest('.transcript,.reading-list,.reading-item-detail,.reading-review-task,.reading-review-panel,.reading-picker,.reading-material-toolbar')&&!node.querySelector('input,textarea'));
}
function readingSourceFor(node,text){
  const course=courses[state.selected],meta=readingActiveMeta(),activity=meta?.activities?.[meta.activityIndex||0];
  const run=typeof adaptiveData==='function'?adaptiveData().run:null;
  const inDiagnosis=state.page==='courses'&&typeof adaptiveData==='function'&&adaptiveData().view==='diagnosis'&&run;
  const source={courseId:course?.id||null,courseTitle:course?.title||'',themeTitle:meta?.theme?.title||course?.title||'',subject:course?.subject||'',page:state.page,stage:ses()?.stage||'',materialKey:readingMaterialKey(text)};
  if(activity){source.activityId=activity.id;source.activityTitle=activity.title;}
  if(inDiagnosis){source.courseId=null;source.courseTitle=run.taskTitle||'目标阅读任务';source.themeTitle=run.theme?.title||run.taskTitle||'';source.subject=typeof adaptiveSubjects==='object'?adaptiveSubjects[run.subject]?.title||run.subject:run.subject;source.diagnosisId=run.id;source.stage='diagnosis';}
  if(node.closest('#modalroot')){let previous=node.previousElementSibling;if(previous?.classList.contains('reading-material-toolbar'))previous=previous.previousElementSibling;source.preview=true;source.activityTitle=previous?.matches('h3')?previous.textContent:'';source.themeTitle=document.querySelector('.modal h3')?.textContent||source.themeTitle||document.querySelector('.modal h2')?.textContent||'阅读材料预览';}
  return source;
}
function readingValidTerm(term){return !!term&&term.length<=120&&/^\p{Script=Latin}+(?:['’-]\p{Script=Latin}+)*(?:\s+\p{Script=Latin}+(?:['’-]\p{Script=Latin}+)*){0,7}$/u.test(term);}
function readingWords(text){return [...String(text).matchAll(/\p{Script=Latin}+(?:['’-]\p{Script=Latin}+)*/gu)].map(match=>({text:match[0],start:match.index,end:match.index+match[0].length}));}
function readingMaterialItems(key){return readingData().items.filter(item=>item.status!=='archived'&&item.source?.materialKey===key);}
function readingMaterial(token){const entry=readingMaterials.get(token);return entry&&entry.root.isConnected&&readingMaterialKey(entry.root.textContent)===entry.key?entry:null;}
function readingMaterialGroups(entry){
  const text=entry.root.textContent,segments=readingSegments(text),groups=new Map();
  for(const item of readingMaterialItems(entry.key)){
    const key=readingNormalize(item.sentence);let group=groups.get(key);
    if(!group){const position=text.indexOf(item.sentence),sentenceIndex=segments.findIndex(segment=>position>=segment.start&&position<segment.end);group={position:position<0?Number.MAX_SAFE_INTEGER:position,index:sentenceIndex<0?null:sentenceIndex+1,items:[]};groups.set(key,group);}
    // Keep separate records for every expression, including several words in
    // the same original sentence and the same word in different sentences.
    group.items.push(item);
  }
  return [...groups.values()].sort((a,b)=>a.position-b.position);
}
function readingMarkedChipsHTML(entry,groups){
  const count=groups.reduce((total,group)=>total+group.items.length,0);
  if(!count)return '<p class="reading-mark-empty">本篇的陌生表达会全部显示在这里，点击各词可补充理解和练句子。</p>';
  return `<details class="reading-marked-list" data-reading-marks="${entry.token}" ${entry.marksOpen!==false?'open':''}><summary><span>全部 ${count} 处标记 · ${groups.length} 句原文</span><span class="reading-marks-toggle" aria-hidden="true">展开 / 收起</span></summary><div class="reading-mark-groups" role="group" aria-label="本篇全部陌生表达">${groups.map(group=>`<div class="reading-mark-group"><span class="reading-mark-group-label">${group.index?'第 '+group.index+' 句':'原文句子'} · ${group.items.length} 处</span><div class="reading-mark-chips">${group.items.map(item=>{const label=(group.index?'第 '+group.index+' 句，':'')+'“'+item.term+'”，查看原句、补充理解或练整句';return `<button type="button" class="reading-mark-chip ${item.id===entry.lastItem?'recent':''}" data-action="readingItemModal('${item.id}')" aria-label="${esc(label)}" title="${esc(label)}">${esc(item.term)}${item.myMeaning||item.myUnderstanding?'<span class="reading-chip-written" aria-label="已补充理解">✓</span>':''}</button>`;}).join('')}</div></div>`).join('')}</div><p class="reading-marks-help">点击任意表达查看原句与理解，标记较多时可上下滚动查看全部。</p></details>`;
}
function readingToolbarHTML(entry){
  const active=readingTapMode?.token===entry.token,groups=readingMaterialGroups(entry),count=groups.reduce((total,group)=>total+group.items.length,0);
  return `<div class="reading-material-actions"><button type="button" class="btn small ${active?'primary':''}" data-action="readingToggleTapMode('${entry.token}')" aria-pressed="${active}">${active?'退出点词':'选词标记'}</button>${btn('本篇 '+count+' 处',`readingMaterialOverview('${entry.token}')`,'small')}${btn('补记一句',`readingAddSentence('${entry.token}')`,'small')}${btn('正文翻译',`readingOpenSupport('${entry.token}','translation')`,'small')}${btn('长句拆解',`readingOpenSupport('${entry.token}','sentence')`,'small')}${btn('本篇句子练习',`startReadingMaterialPractice('${entry.token}')`,'small')}</div><p class="reading-material-hint">${active?'点一下不认识的英文词就能保存。短语可长按选中，或用“补记一句”选择。':'长按或拖选英文词、短语，点击“不认识”；也可以开启点词模式。'}</p>${readingMarkedChipsHTML(entry,groups)}`;
}
function readingUpdateToolbar(entry){
  if(!entry.toolbar?.isConnected)return;const html=readingToolbarHTML(entry);if(entry.toolbarHTML===html)return;
  const list=entry.toolbar.querySelector('.reading-mark-groups'),scrollTop=list?.scrollTop||0;entry.toolbar.innerHTML=html;entry.toolbarHTML=html;
  const next=entry.toolbar.querySelector('.reading-mark-groups');if(next)next.scrollTop=scrollTop;
}
function readingRefreshToolbars(){for(const [token,entry]of readingMaterials){if(!entry.root.isConnected){entry.toolbar?.remove();readingMaterials.delete(token);continue;}readingUpdateToolbar(entry);}}
function readingInstallToolbar(root){
  if(readingWords(root.textContent).length<2)return;
  // A task's passage owns its toolbar. Its separate question still supports
  // native text selection without adding a second set of reading controls.
  const passage=root.classList.contains('question')?root.closest('.task')?.querySelector('.task-material'):null;
  if(passage&&passage!==root&&readingWords(passage.textContent).length>=2)return;
  let entry=readingMaterials.get(root.dataset.readingRoot);
  if(!entry||entry.root!==root){const token='read-'+crypto.randomUUID();entry={token,root,key:readingMaterialKey(root.textContent)};root.dataset.readingRoot=token;readingMaterials.set(token,entry);}
  if(!entry.toolbar?.isConnected){const toolbar=document.createElement('div');toolbar.className='reading-material-toolbar';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','阅读选词与原句学习');entry.toolbar=toolbar;entry.toolbarHTML=null;const host=root.parentElement?.classList.contains('web-material-fold')?root.parentElement:root;host.before(toolbar);}
  readingUpdateToolbar(entry);
}
function readingLeaveTapMode(paint=true){
  const old=readingTapMode;readingTapMode=null;
  if(old?.root.isConnected&&readingMaterialKey(old.root.textContent)===old.key){old.root.innerHTML=old.html;old.root.classList.remove('reading-tap-mode');}
  if(paint)readingPaintAll();
}
function readingToggleTapMode(token){
  if(busy||window.studyDataReplacing)return toast('请等当前请求完成后选词');
  const entry=readingMaterial(token);if(!entry)return toast('阅读材料已变化，请使用当前文章的入口');
  if(readingTapMode?.token===token){readingLeaveTapMode();return;}
  readingLeaveTapMode(false);readingHideTool();readingSelection=null;readingPressedSelection=null;window.getSelection()?.removeAllRanges();
  const text=entry.root.textContent,words=readingWords(text),fragment=document.createDocumentFragment();let end=0;
  readingTapMode={token,root:entry.root,key:entry.key,html:entry.root.innerHTML};
  for(const word of words){fragment.append(document.createTextNode(text.slice(end,word.start)));const node=document.createElement('span');node.className='reading-tap-word';node.textContent=word.text;node.dataset.action=`readingTapWord('${token}',${word.start},${word.end})`;node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label','标记“'+word.text+'”不认识');fragment.append(node);end=word.end;}
  fragment.append(document.createTextNode(text.slice(end)));entry.root.replaceChildren(fragment);entry.root.classList.add('reading-tap-mode');
  const fold=entry.root.closest('.web-material-fold');if(fold)fold.open=true;readingPaintAll();
}
async function readingTapWord(token,start,end){
  if(readingTapMode?.token!==token)return;
  const selection=window.getSelection();if(selection&&!selection.isCollapsed)return readingScheduleSelection();
  const entry=readingMaterial(token);if(!entry)return toast('阅读材料已变化，请重新选择');
  const text=entry.root.textContent;if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length)return;const term=text.slice(start,end);if(!readingValidTerm(term))return;
  const sentence=readingSentenceAt(text,start,end);await readingMarkCandidate({term,sentence:sentence.sentence,context:sentence.context,source:readingSourceFor(entry.root,text),root:entry.root});
}
function readingMaterialOverview(token){
  const entry=readingMaterial(token);if(!entry)return toast('请回到当前阅读材料后查看');
  const items=readingMaterialItems(entry.key),summary=typeof readingDocumentSummary==='function'?readingDocumentSummary(entry.root):null;
  const overview=summary?`<div class="reading-document-counts"><span>${summary.totalSentences||0} 句原文</span><span>${summary.markedSentences||0} 句有陌生表达</span><span>${summary.writtenWordUnderstandings||0} 处词义理解</span><span>${summary.writtenSentenceUnderstandings||0} 句已有自己的理解</span><span>${summary.submittedReadingTasks?.length||0} 条阅读作答记录</span></div>`:'';
  if(typeof readingRememberMaterial==='function')readingRememberMaterial(entry);
  openModal('这篇材料的阅读标记',`<div class="reading-item-detail" data-reading-overview="${entry.token}"><p class="sub">已标记 ${items.length} 个陌生表达。这里展示你的困难线索；不能据此计算全文理解率。</p>${overview}<div class="actions space">${btn('本篇句子练习',`startReadingMaterialPractice('${token}')`,'primary')}${btn('正文翻译',`readingOpenSupport('${token}','translation')`)}${btn('长句拆解',`readingOpenSupport('${token}','sentence')`)}</div>${items.length?items.map(item=>`<article class="reading-list-item"><p class="reading-sentence">${readingSentenceHTML(item)}</p><p class="tiny space">${esc(item.term)} · ${item.myMeaning||item.myUnderstanding?'已补充自己的理解':'理解待补充'}</p><div class="actions space">${btn('补充我的理解',`readingItemModal('${item.id}')`,'small')}${typeof startReadingReview==='function'?btn('练整句',`readingPracticeItem('${item.id}')`,'small'):''}</div></article>`).join(''):'<p class="space">还没有标记。回到原文，点击“选词标记”后点一个不认识的词，或长按选中短语。</p>'}</div>`);
}
function readingPickerActive(){return !!readingSentencePicker&&document.querySelector('[data-reading-picker="'+readingSentencePicker.id+'"]');}
function readingAddSentence(token){
  if(busy||window.studyDataReplacing)return toast('请等当前请求完成后补记');
  const entry=readingMaterial(token);if(!entry)return toast('阅读材料已变化，请使用当前文章的入口');
  const text=entry.root.textContent,sentences=readingSegments(text).map(segment=>{const raw=text.slice(segment.start,segment.end),sentence=raw.trim(),start=segment.start+raw.indexOf(sentence);return {sentence,start,end:start+sentence.length,words:readingWords(sentence)};}).filter(sentence=>sentence.sentence&&sentence.sentence.length<=1800&&sentence.words.length);
  if(!sentences.length)return toast('当前材料没有可以保存的英文原句');
  readingSentencePicker={id:'picker-'+crypto.randomUUID(),root:entry.root,text,key:entry.key,source:readingSourceFor(entry.root,text),sentences,index:0,first:null,last:null,drafts:{}};
  openModal('从这篇材料补记一句',`<div class="reading-picker" data-reading-picker="${readingSentencePicker.id}"><p class="sub">选择原文里的一句话，再点选其中的词。点第一个词和最后一个词可选连续短语。</p><div class="field"><label for="reading-sentence-choice">原文句子</label><select id="reading-sentence-choice" class="input">${sentences.map((sentence,index)=>`<option value="${index}">${index+1}. ${esc(sentence.sentence.slice(0,160))}${sentence.sentence.length>160?'…':''}</option>`).join('')}</select></div><div class="reading-picker-sentence"></div><p class="reading-picked-expression" aria-live="polite"></p><div class="actions space">${btn('重新选择表达','readingResetPickedWords()','small')}</div><div class="field"><label for="reading-meaning">我对这个词 / 短语的理解</label><textarea id="reading-meaning" class="input" maxlength="2000" placeholder="结合这句原文，我觉得它表示…"></textarea></div><div class="field"><label for="reading-understanding">我对整个句子的理解</label><textarea id="reading-understanding" class="input" maxlength="4000" placeholder="这句话主要在说什么？其中的转折、原因或指代是怎样的？"></textarea></div><div class="actions space">${btn('保存原句与理解','readingSavePickedSentence()','primary')}${btn('保存并练整句','readingSavePickedSentence(1)')}</div><p class="tiny space">句子与来源来自当前原文，理解可以离线填写；标记不会直接改变课程掌握度。</p></div>`);readingUpdatePicker();
}
function readingPickedTerm(){
  const picker=readingSentencePicker;if(!picker||picker.first===null)return '';
  const sentence=picker.sentences[picker.index],first=sentence.words[Math.min(picker.first,picker.last)],last=sentence.words[Math.max(picker.first,picker.last)];
  return first&&last?readingNormalize(sentence.sentence.slice(first.start,last.end)):'';
}
function readingUpdatePicker(){
  if(!readingPickerActive())return;const picker=readingSentencePicker,sentence=picker.sentences[picker.index],target=document.querySelector('.reading-picker-sentence');let end=0,html='';
  sentence.words.forEach((word,index)=>{const selected=picker.first!==null&&index>=Math.min(picker.first,picker.last)&&index<=Math.max(picker.first,picker.last);html+=esc(sentence.sentence.slice(end,word.start))+`<button type="button" class="reading-pick-word ${selected?'selected':''}" aria-pressed="${selected}" data-action="readingPickWord(${index})">${esc(word.text)}</button>`;end=word.end;});
  target.innerHTML=html+esc(sentence.sentence.slice(end));const term=readingPickedTerm(),label=document.querySelector('.reading-picked-expression');label.textContent=term?'所选表达：'+term:'点一个词，或依次点短语的首词和末词。';
}
function readingPickWord(index){if(!readingPickerActive())return;const picker=readingSentencePicker,sentence=picker.sentences[picker.index];if(!Number.isInteger(index)||!sentence.words[index])return;if(picker.first===null||picker.first!==picker.last){picker.first=index;picker.last=index;}else picker.last=index;readingUpdatePicker();}
function readingResetPickedWords(){if(!readingPickerActive())return;readingSentencePicker.first=null;readingSentencePicker.last=null;readingUpdatePicker();}
async function readingSavePickedSentence(practice=false){
  if(busy||window.studyDataReplacing)return toast('请等当前请求完成');if(!readingPickerActive())return;
  const picker=readingSentencePicker,term=readingPickedTerm();if(!readingValidTerm(term))return toast('请选择连续的 1–8 个英文词，短语中不要包含标点');
  if(!picker.root.isConnected&&!picker.source.preview||picker.root.isConnected&&readingMaterialKey(picker.root.textContent)!==picker.key)return toast('原文已切换，请回到当前材料重新补记');
  const sentence=picker.sentences[picker.index],context=readingSentenceAt(picker.text,sentence.start,sentence.end).context,myMeaning=document.getElementById('reading-meaning').value.trim().slice(0,2000),myUnderstanding=document.getElementById('reading-understanding').value.trim().slice(0,4000);
  const item=await readingMarkCandidate({term,sentence:sentence.sentence,context,source:picker.source,root:picker.root},{myMeaning,myUnderstanding,fromPicker:true});if(!item)return;
  readingSentencePicker=null;if(practice)return readingPracticeItem(item.id);readingItemModal(item.id);
}
function readingSelectedCandidate(){
  const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
  const range=selection.getRangeAt(0),startNode=range.startContainer.nodeType===Node.ELEMENT_NODE?range.startContainer:range.startContainer.parentElement;
  const root=readingReadingRoots().find(node=>node===startNode||node.contains(startNode));if(!root||!root.contains(range.endContainer))return null;
  const raw=selection.toString(),trimmed=raw.trim().replace(/^["“”‘(\[]+|["“”’).,;:!?\]]+$/g,'').trim(),term=readingNormalize(trimmed);
  if(!readingValidTerm(term))return null;
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
  const lock=()=>{try{readingPressedSelection=readingSelection||readingSelectedCandidate();}catch{readingPressedSelection=readingSelection;}readingSelectionLockUntil=Date.now()+1200;};
  tool.addEventListener('pointerdown',event=>{lock();if(event.pointerType==='mouse')event.preventDefault();});
  tool.addEventListener('mousedown',event=>{lock();event.preventDefault();});
  tool.addEventListener('touchstart',event=>{lock();event.preventDefault();},{passive:false});
  tool.addEventListener('touchend',event=>{event.preventDefault();markReadingSelection().catch(showError);},{passive:false});
  document.body.appendChild(tool);return tool;
}
function readingHideTool(){const tool=document.getElementById('reading-selection-tool');if(tool)tool.hidden=true;}
function readingRefreshSelection(){
  if(readingPainting||Date.now()<readingSelectionLockUntil)return;let candidate;try{candidate=readingSelectedCandidate();}catch{candidate=null;}
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
  const selected=readingPressedSelection||readingSelection;readingPressedSelection=null;readingSelection=null;readingSelectionLockUntil=0;readingHideTool();
  if(!selected||!selected.root.isConnected)return toast('请先在阅读材料中选中英文单词或短语');
  window.getSelection()?.removeAllRanges();await readingMarkCandidate(selected);
}
async function readingMarkCandidate(selected,extra={}){
  if(busy||window.studyDataReplacing){toast('请等待当前请求完成后标记');return null;}
  if(!readingValidTerm(selected.term)||!selected.sentence||selected.sentence.length>1800||!readingTermMatches(selected.sentence,selected.term).length){toast('请选择原句里的英文词或连续短语');return null;}
  if(!extra.fromPicker&&(!selected.root.isConnected||readingMaterialKey(selected.root.textContent)!==selected.source.materialKey)){toast('阅读材料已变化，请重新选择');return null;}
  const data=readingData();let item=data.items.find(x=>readingNormalize(x.term).toLowerCase()===selected.term.toLowerCase()&&readingNormalize(x.sentence)===readingNormalize(selected.sentence)&&x.source?.materialKey===selected.source.materialKey);
  if(!item&&data.items.length>=2000){toast('已保存 2000 个阅读句子，请先整理已有记录后再新增');return null;}
  if(!item){item={id:'reading-'+crypto.randomUUID(),term:selected.term,sentence:selected.sentence,context:selected.context,source:selected.source,markedAt:Date.now(),updatedAt:Date.now(),myMeaning:'',myUnderstanding:'',explanation:null,status:'unknown'};data.items.push(item);}else{item.status='unknown';item.updatedAt=Date.now();}
  if(Object.hasOwn(extra,'myMeaning'))item.myMeaning=extra.myMeaning;if(Object.hasOwn(extra,'myUnderstanding'))item.myUnderstanding=extra.myUnderstanding;if(item.myMeaning||item.myUnderstanding)item.status='learning';
  for(const entry of readingMaterials.values())if(entry.key===item.source.materialKey||entry.toolbar&&entry.root.closest('.task')&&entry.root.closest('.task')===selected.root.closest('.task'))entry.lastItem=item.id;
  try{await readingSave(item);readingPaintAll();toast('已保存原句，可在材料上方添加理解或练整句');return item;}catch(error){readingRefreshToolbars();showError(error);return null;}
}

function readingTextNodes(root){
  const nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,offset=0;
  while((node=walker.nextNode())){nodes.push({node,start:offset,end:offset+node.data.length});offset+=node.data.length;}
  return nodes;
}
function readingPaint(root){
  if(readingTapMode?.root===root){const text=root.textContent,items=readingMaterialItems(readingMaterialKey(text));root.querySelectorAll('.reading-tap-word').forEach(node=>{const match=node.dataset.action?.match(/,(\d+),(\d+)\)$/),start=match?Number(match[1]):-1,sentence=start>=0?readingSentenceAt(text,start,start+node.textContent.length).sentence:'';node.classList.toggle('marked',items.some(item=>readingNormalize(item.term).toLowerCase()===node.textContent.toLowerCase()&&readingNormalize(item.sentence)===readingNormalize(sentence)));});return;}
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
  if(readingPainting)return;readingPainting=true;try{for(const root of readingReadingRoots()){
    root.classList.add('reading-material');root.dataset.readingMaterial='true';readingInstallToolbar(root);readingPaint(root);
    // Returning to the original passage during an unfinished sentence recall
    // exposes its answer, even when no explanation was requested.
    const run=readingData().reviewRun,item=run&&readingItem(run.itemId);
    if(item&&root.getClientRects().length&&typeof readingReviewHiddenSentence==='function'&&readingReviewHiddenSentence(item)&&item.source?.materialKey===readingMaterialKey(root.textContent)){readingMarkHelp(item);readingSave().catch(showError);}
  }readingRefreshToolbars();}finally{readingPainting=false;}
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
  const sentenceReview=readingData().reviewRun,reviewItem=sentenceReview&&readingItem(sentenceReview.itemId),sentenceMatches=sentenceReview&&sentenceReview.answer===null&&!sentenceReview.confirmed&&(sentenceReview.itemId===item.id||source.materialKey&&reviewItem?.source?.materialKey===source.materialKey||readingNormalize(reviewItem?.sentence||'')===readingNormalize(item.sentence)||readingQuestionMatches(item,{material:sentenceReview.task?.material}));
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
  return `<section class="reading-explanation">${x.understandingFeedback?`<h3>对你理解的反馈</h3><p>${esc(x.understandingFeedback)}</p><h3 class="space">这个句子中的意思与用法</h3>`:'<h3>这个句子中的意思与用法</h3>'}${x.originalTranslation?`<p class="reading-translation">${esc(x.originalTranslation)}</p>`:''}<p>${esc(x.meaning)}</p><p class="sub">${esc(x.usage)}</p><h3 class="space">换一个句子看它怎么用</h3><p class="reading-sentence">${esc(x.example)}</p><p class="reading-translation">${esc(x.translation)}</p><p class="tiny space">AI 句中解释 · ${esc(x.model||'已保存解释')} · 需要结合上下文核对。练习时不会提前显示参考答案。</p></section>`;
}
function readingItemModal(id){
  const item=readingItem(id);if(!item)return toast('这条阅读记录已不存在');
  const helped=(item.explanation||item.myMeaning||item.myUnderstanding||readingHelpScope(item).sentenceReview)&&readingMarkHelp(item);
  if(helped)readingSave().catch(showError);
  const pending=readingPendingHelp(item);
  openModal('原句与我的理解',`<div class="reading-item-detail" data-reading-detail="${item.id}"><div class="reading-source">${esc(readingSourceLabel(item))}</div><p class="reading-sentence">${readingSentenceHTML(item)}</p><p class="sub">你标记的陌生表达：${esc(item.term)}</p>${helped?'<div class="notice amber space">查看了练习中的原句或已有理解，本轮记录为有帮助的训练。</div>':pending?'<div class="notice amber space">当前有独立任务正在进行。获取句中解释会记录帮助，本轮只计训练。</div>':''}<div class="field"><label for="reading-meaning">我对这个词 / 短语的理解</label><textarea id="reading-meaning" class="input" maxlength="2000" placeholder="结合这句原文，我觉得它表示…">${esc(item.myMeaning||'')}</textarea></div><div class="field"><label for="reading-understanding">我对整个句子的理解</label><textarea id="reading-understanding" class="input" maxlength="4000" placeholder="这句话主要在说什么？其中的转折、原因或指代是怎样的？">${esc(item.myUnderstanding||'')}</textarea></div><div class="actions space">${btn('保存我的理解',`saveReadingUnderstanding('${id}')`,'primary')}${btn(item.explanation?'重新获取 AI 反馈':'请 AI 看看我的理解',`explainReadingItem('${id}')`)}${typeof startReadingReview==='function'?btn('保存并练整句',`readingPracticeItem('${id}')`):''}</div>${readingExplanationHTML(item)}<details class="space"><summary>查看原句附近的阅读上下文</summary><p class="reading-context">${esc(item.context||item.sentence)}</p></details><p class="tiny space">自己的理解可以离线保存。AI 结合原文核对你的解释，再给新例句；标记、解释和句子练习不会直接改变课程掌握度。记录随学习空间保存到有道。</p></div>`);
}
function readingCaptureUnderstanding(item){
  const detail=document.querySelector('[data-reading-detail="'+item.id+'"]');if(!detail)return;
  const meaning=detail.querySelector('#reading-meaning'),understanding=detail.querySelector('#reading-understanding');
  if(meaning)item.myMeaning=meaning.value.trim().slice(0,2000);if(understanding)item.myUnderstanding=understanding.value.trim().slice(0,4000);if(item.myMeaning||item.myUnderstanding)item.status='learning';
}
async function saveReadingUnderstanding(id){
  if(busy||window.studyDataReplacing)return toast('请等当前请求完成');
  const item=readingItem(id);if(!item)return;readingCaptureUnderstanding(item);item.updatedAt=Date.now();
  try{await readingSave(item);toast('你的原句理解已保存');}catch(e){showError(e);}
}
async function readingPracticeItem(id){
  if(busy||window.studyDataReplacing)return toast('请等当前请求完成');const item=readingItem(id);if(!item)return;
  if(typeof startReadingReview!=='function')return toast('句子复习尚未加载，请刷新后重试');
  readingCaptureUnderstanding(item);try{await readingSave(item);startReadingReview(id);}catch(error){showError(error);}
}
async function explainReadingItem(id){
  const item=readingItem(id);if(!item)return;if(busy)return toast('请等当前请求完成后获取解释');
  if(!desktop?.explainReadingTerm)return toast('句中解释服务尚未加载，请更新应用后重试');
  if(!aiConfigured())return toast('请先在设置中选择并授权 AI；陌生句子已经保存');
  readingCaptureUnderstanding(item);
  readingMarkHelp(item);try{await readingSave(item);}catch(e){showError(e);return;}
  await task(async()=>{
    requestId='reading-explain-'+crypto.randomUUID();const s=item.source||{};
    const result=await desktop.explainReadingTerm({id:requestId,term:item.term,sentence:item.sentence,context:item.context||item.sentence,myMeaning:item.myMeaning||'',myUnderstanding:item.myUnderstanding||'',source:{courseTitle:s.courseTitle||'',themeTitle:s.themeTitle||'',subject:s.subject||'',activityTitle:s.activityTitle||'',materialKey:s.materialKey||''}});
    if(!readingItem(id))return;
    item.explanation={originalTranslation:result.originalTranslation||'',meaning:result.meaning,usage:result.usage,understandingFeedback:result.understandingFeedback||'',example:result.example,translation:result.translation,question:result.question,expected:result.expected,model:result.model,at:Date.now()};item.status='learning';item.updatedAt=Date.now();
    await readingSave(item);readingItemModal(id);
  });
}
function readingListHTML(limit=8){
  const items=readingData().items.filter(item=>item.status!=='archived').slice().sort((a,b)=>(b.updatedAt||b.markedAt||0)-(a.updatedAt||a.markedAt||0));
  if(!items.length)return '<p class="sub space">阅读时选中英文单词或短语，点击“不认识”。保存的是所在句子；之后补充句中理解，再用句子练习。</p>';
  return `<div class="reading-list">${items.slice(0,limit).map(item=>`<article class="reading-list-item"><p class="reading-sentence">${readingSentenceHTML(item)}</p><div class="reading-list-foot"><span class="tiny">${esc(readingSourceLabel(item))} · ${item.myMeaning||item.myUnderstanding?'已写理解':item.explanation?'已有句中解释':'理解待补充'}</span><div class="actions">${btn('查看原句与理解',`readingItemModal('${item.id}')`,'small')}${typeof startReadingReview==='function'?btn('练整句',`readingPracticeItem('${item.id}')`,'small'):''}</div></div></article>`).join('')}</div>${items.length>limit?`<p class="tiny space">还有 ${items.length-limit} 个句子，可以展开全部查看。</p>${btn('查看全部阅读句子','readingAllModal()','small space')}`:''}`;
}
function readingAllModal(){openModal('我的阅读句子',`<p class="sub">按实际原句回看陌生表达和用法，不把它们拆成孤立单词。</p>${readingListHTML(500)}`);}
const readingBaseNotes=notesPage;
notesPage=function(){return readingBaseNotes()+`<section class="card reading-panel space"><div class="row"><h3>阅读句子与我的理解</h3>${badge(readingData().items.filter(x=>x.status!=='archived').length+' 个实际句子','gray')}</div>${readingListHTML(8)}</section>`;};
const readingBaseReview=reviewPage;
reviewPage=function(){return readingBaseReview()+`<section class="card reading-panel space"><h3>从阅读原句补充理解</h3><p class="sub space">先弄清原句中的意思和用法，再用完整句子回忆。以下标记来自你的实际阅读，不当作考试掌握结论。</p>${readingListHTML(3)}</section>`;};
const readingBaseContext=contextFor;
contextFor=function(course,session){
  const result=readingBaseContext(course,session),items=readingData().items.filter(item=>item.status!=='archived'&&(!course||item.source?.courseId===course.id)).slice(-12);
  return {...result,readingClues:{scope:'用户报告的句中词汇困难，不能据此推断全文理解、模块掌握或考试水平；只用于围绕实际句子补充理解。',items:items.map(item=>({term:item.term,sentence:item.sentence,myMeaning:item.myMeaning||'',myUnderstanding:item.myUnderstanding||'',status:item.status||'unknown',source:readingSourceLabel(item)}))}};
};
const readingBaseRender=render;
render=function(where){readingHideTool();readingSelection=null;readingPressedSelection=null;readingSelectionLockUntil=0;readingLeaveTapMode(false);readingBaseRender(where);readingData();readingPaintAll();};
['markReadingSelection','readingItemModal','saveReadingUnderstanding','explainReadingItem','readingAllModal','readingToggleTapMode','readingTapWord','readingMaterialOverview','readingAddSentence','readingPickWord','readingResetPickedWords','readingSavePickedSentence','readingPracticeItem'].forEach(name=>actions.add(name));
document.addEventListener('toggle',event=>{const token=event.target.dataset?.readingMarks;if(!token||!event.target.isConnected)return;const entry=readingMaterial(token);if(entry?.toolbar.contains(event.target))entry.marksOpen=event.target.open;},true);
document.addEventListener('change',event=>{
  if(event.target.id!=='reading-sentence-choice'||!readingPickerActive())return;const index=Number(event.target.value),picker=readingSentencePicker;if(!Number.isInteger(index)||!picker.sentences[index])return;
  const meaning=document.getElementById('reading-meaning'),understanding=document.getElementById('reading-understanding');picker.drafts[picker.index]={myMeaning:meaning.value,myUnderstanding:understanding.value};picker.index=index;
  meaning.value=picker.drafts[index]?.myMeaning||'';understanding.value=picker.drafts[index]?.myUnderstanding||'';readingResetPickedWords();
});
document.addEventListener('selectionchange',readingScheduleSelection);
document.addEventListener('mouseup',readingScheduleSelection);
document.addEventListener('touchend',readingScheduleSelection,{passive:true});
document.addEventListener('scroll',event=>{if(!event.target.closest?.('.reading-selection-tool'))readingHideTool();},true);
window.addEventListener('resize',readingHideTool);
document.addEventListener('click',event=>{if(!event.target.closest?.('.reading-unfamiliar'))return;const selection=window.getSelection();if(selection&&!selection.isCollapsed){event.preventDefault();event.stopImmediatePropagation();readingScheduleSelection();}},true);
document.addEventListener('keydown',event=>{const tap=event.target.closest?.('.reading-tap-word');if(tap&&(event.key==='Enter'||event.key===' ')){event.preventDefault();tap.click();return;}const mark=event.target.closest?.('.reading-unfamiliar');if(mark&&(event.key==='Enter'||event.key===' ')){event.preventDefault();readingItemModal(mark.dataset.readingItem);}});
readingData();readingPaintAll();
