'use strict';
// Marked vocabulary and submitted tasks are evidence with distinct scopes.
// Unmarked text is unknown, rather than automatically understood.
function readingDocumentEvidence(text){
  const key=readingMaterialKey(text),records=[],seen=new Set();
  const add=e=>{if(!e||seen.has(e.id)||!e.material||readingMaterialKey(e.material)!==key)return;seen.add(e.id);records.push({question:String(e.prompt||e.scope||'').slice(0,1400),answer:String(e.answer||'').slice(0,1800),correct:typeof e.correct==='boolean'?e.correct:null,helpUsed:typeof e.hinted==='boolean'?e.hinted:null,scope:String(e.scope||e.prompt||'').slice(0,1200),source:String(e.source||''),at:e.at||null});};
  if(typeof adaptiveData==='function'){
    const a=adaptiveData();for(const column of Object.values(a.columns||{}))for(const e of column.evidence||[])add(e);
    for(const e of a.run?.answers||[])add(e);
  }
  for(const [id,session] of Object.entries(state.sessions||{})){
    const course=courses[id];if(!course||state.adaptive?.loops?.[id])continue;
    const submitted=(q,record,token)=>{if(q&&record?.answer)add({...record,id:token,material:q.material||q.prompt,prompt:q.prompt,scope:q.scope||q.prompt,at:record.at||session.created});};
    submitted(course.diagnosis,session.diagnosis,'course-diagnosis:'+id+':'+session.created);
    (session.answers||[]).forEach((answer,index)=>submitted(course.tests?.[session.attempt]?.[index],{...answer,hinted:session.hinted},'course-answer:'+id+':'+session.created+':'+session.attempt+':'+index));
  }
  return records.slice(-8);
}
function readingDocumentSummary(root){
  const text=String(root?.textContent||''),key=readingMaterialKey(text),source=readingSourceFor(root,text);
  const items=readingData().items.filter(item=>item.status!=='archived'&&item.source?.materialKey===key);
  const sentences=readingSegments(text).map(part=>text.slice(part.start,part.end).trim()).filter(value=>/[A-Za-z]/.test(value));
  const markedSentences=new Set(items.map(item=>readingNormalize(item.sentence)));
  const sentenceAttempts=items.flatMap(item=>(readingData().review?.[item.id]?.attempts||[]).map(attempt=>({itemId:item.id,term:item.term,mode:attempt.mode,scope:attempt.scope,answer:String(attempt.answer||'').slice(0,1500),pass:attempt.pass,helpUsed:!!attempt.hinted,source:attempt.source,at:attempt.at}))).sort((a,b)=>(a.at||0)-(b.at||0)).slice(-6);
  return {materialKey:key,material:text.slice(0,16000),materialTruncated:text.length>16000,source:readingSourceLabel({source}),totalSentences:sentences.length,englishWordOccurrences:(text.match(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g)||[]).length,markedExpressions:items.length,markedSentences:markedSentences.size,writtenSentenceUnderstandings:new Set(items.filter(item=>item.myUnderstanding?.trim()).map(item=>readingNormalize(item.sentence))).size,writtenWordUnderstandings:items.filter(item=>item.myMeaning?.trim()).length,omittedClues:Math.max(0,items.length-12),items:items.slice(-12).map(item=>({term:item.term,sentence:String(item.sentence).slice(0,1800),myMeaning:String(item.myMeaning||'').slice(0,1000),myUnderstanding:String(item.myUnderstanding||'').slice(0,2000),status:item.status||'unknown'})),submittedReadingTasks:readingDocumentEvidence(text),sentencePractice:sentenceAttempts,limits:'标记是不认识表达的自报线索，不是全文理解率；没有标记的句子尚未验证。自己的理解、AI解释、有限题目作答及整句回忆分别保留证据范围，不能互相替代或推定全文已读懂。正文最多提供16000字符，materialTruncated为true时不能声称已核对全文；详细线索最多展示最近12条，文字可能截断，不得假设遗漏部分已理解。'};
}
function readingDocumentContext(context={}){
  if(typeof readingReadingRoots!=='function')return null;
  const roots=readingReadingRoots().filter(root=>root.closest('#workspace'));
  const documents=[],keys=new Set();
  for(const root of roots){const summary=readingDocumentSummary(root);if(keys.has(summary.materialKey))continue;keys.add(summary.materialKey);documents.push(summary);if(documents.length>=3)break;}
  if(documents.length)return {documents,task:'结合当前文档的标记、学生自己的句中理解以及已提交阅读任务，先定位具体困难，再帮助补学；若需要判断整体理解，请提出与主旨、关系和依据有关的实际问题，不能从生词数量直接推算理解率。'};
  const run=typeof readingReviewCurrent==='function'?readingReviewCurrent():null,item=run?readingItem(run.itemId):null;
  if(item)return {savedSentence:{term:item.term,sentence:item.sentence,myMeaning:item.myMeaning||'',myUnderstanding:item.myUnderstanding||'',source:readingSourceLabel(item)},limits:'当前只展示保存的句子，没有全文，不推断全文理解程度。'};
  return null;
}
