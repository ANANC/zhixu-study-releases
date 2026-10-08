'use strict';
// Visible source snapshots outlive a preview dialog only while its own reader is open.
const readingSupportSnapshots=new Map();
let readingSupportSession=null;
function readingRememberMaterial(entry){
 if(!entry?.root?.isConnected)return null;
 const text=entry.root.textContent;if(readingMaterialKey(text)!==entry.key)return null;
 const context={token:entry.token,text,key:entry.key,source:readingSourceFor(entry.root,text)};
 readingSupportSnapshots.set(entry.token,context);
 while(readingSupportSnapshots.size>8)readingSupportSnapshots.delete(readingSupportSnapshots.keys().next().value);
 return context;
}
function readingMaterialContext(token){
 const entry=readingMaterial(token);if(entry)return readingRememberMaterial(entry);
 const cached=readingSupportSnapshots.get(token);
 if(cached&&document.querySelector('[data-reading-overview="'+token+'"]'))return cached;
 const session=readingSupportSession;
 if(session?.context.token===token&&document.querySelector('[data-reading-support-modal="'+session.id+'"]'))return session.context;
 return null;
}
function readingSupportSentences(context){
 return readingSegments(context.text).map(segment=>context.text.slice(segment.start,segment.end).trim()).filter(sentence=>readingWords(sentence).length>=2&&sentence.length<=3000);
}
function readingSupportCached(session){
 const document=state.reading?.documents?.[session.context.key];
 if(!document||document.material!==session.context.text)return null;
 if(session.mode==='translation')return document.translation||null;
 const sentence=session.sentences[session.index],cached=document.analyses?.[readingMaterialKey(sentence)];
 return cached?.sentence===sentence?cached:null;
}
function readingSupportHelp(session,persistHelp=true){
 const item={id:'reading-support',source:session.context.source,sentence:session.mode==='sentence'?session.sentences[session.index]:session.context.text};
 if(readingMarkHelp(item)&&persistHelp)readingSave().catch(showError);
}
function readingOpenSupport(token,mode='translation'){
 if(busy||window.studyDataReplacing)return toast('请等当前请求完成');
 if(!['translation','sentence'].includes(mode))return;
 const context=readingMaterialContext(token);if(!context)return toast('请从当前正文重新打开阅读辅助');
 const sentences=readingSupportSentences(context),items=readingMaterialItems(context.key);
 let index=0,best=-1;
 sentences.forEach((sentence,i)=>{const score=sentence.length+(items.some(item=>readingNormalize(item.sentence)===readingNormalize(sentence))?3000:0);if(score>best){best=score;index=i;}});
 readingSupportSession={id:'support-'+crypto.randomUUID(),context,mode,sentences,index,error:'',loading:false};
 if(readingSupportCached(readingSupportSession))readingSupportHelp(readingSupportSession);
 readingSupportModal();
}
function readingSupportSwitch(mode){
 if(busy||!readingSupportSession||!['translation','sentence'].includes(mode))return;
 readingSupportSession.mode=mode;readingSupportSession.error='';
 if(readingSupportCached(readingSupportSession))readingSupportHelp(readingSupportSession);
 readingSupportModal();
}
function readingSupportChooseSentence(value){
 if(busy||!readingSupportSession)return;const index=Number(value);
 if(!Number.isInteger(index)||!readingSupportSession.sentences[index])return;
 readingSupportSession.index=index;readingSupportSession.error='';
 if(readingSupportCached(readingSupportSession))readingSupportHelp(readingSupportSession);
 readingSupportModal();
}
function readingSupportRows(title,rows,fields){
 if(!rows?.length)return '';
 return `<section class="reading-structure"><h3>${esc(title)}</h3>${rows.map(row=>`<article><p class="reading-source-fragment">${esc(row.original)}</p>${fields.map(field=>row[field]?`<p>${esc(row[field])}</p>`:'').join('')}</article>`).join('')}</section>`;
}
function readingSupportResultHTML(result){
 if(!result)return '';
 if(result.mode==='translation')return `<div class="reading-bilingual">${result.paragraphs.map((row,index)=>`<article><h3>第 ${index+1} 段</h3><p class="reading-source-fragment">${esc(row.original)}</p><p class="reading-full-translation">${esc(row.translation)}</p></article>`).join('')}</div>`;
 return `<section class="reading-structure"><h3>整句意思</h3><p class="reading-full-translation">${esc(result.translation)}</p></section>${readingSupportRows('先抓主干',result.backbone,['explanation'])}${readingSupportRows('再看分句与修饰',result.clauses,['role','explanation'])}${readingSupportRows('连接关系怎样改变意思',result.connections,['relation','explanation'])}${readingSupportRows('句中的关键表达',result.expressions,['meaning','usage'])}`;
}
function readingSupportModal(){
 const session=readingSupportSession;if(!session)return;
 const translation=session.mode==='translation',result=readingSupportCached(session),sentence=session.sentences[session.index],items=readingMaterialItems(session.context.key),limited=session.context.text.length>24000;
 const selected=!translation&&sentence?`<div class="field"><label for="reading-support-sentence">选择正文中的句子</label><select id="reading-support-sentence" class="input" data-change="readingSupportChooseSentence(this.value)">${session.sentences.map((text,index)=>`<option value="${index}" ${index===session.index?'selected':''}>${index+1}. ${esc(text.slice(0,150))}${text.length>150?'…':''}</option>`).join('')}</select></div><p class="reading-source-fragment reading-selected-sentence">${esc(sentence)}</p>`:'';
 const canRequest=!limited&&(translation||!!sentence),pending=busy||session.loading;
 openModal(translation?'正文翻译':'长句拆解',`<div class="reading-item-detail reading-support" data-reading-support-modal="${session.id}"><p class="sub">${esc(readingSourceLabel({source:session.context.source}))} · 本篇 ${items.length} 处标记</p><div class="actions space">${btn('正文翻译',"readingSupportSwitch('translation')",translation?'primary small':'small')}${btn('长句拆解',"readingSupportSwitch('sentence')",translation?'small':'primary small')}${items.length?btn('用本篇标记练句子',`startReadingMaterialPractice('${session.context.token}')`,'small'):''}</div>${selected}<p class="sub space">${translation?'逐段对照正文翻译，保留条件、否定、指代和范围。':'先看主干，再看从句、修饰与连接关系，最后回到整句意思。'}查看翻译或拆解会记作当前任务的学习帮助。</p>${limited?'<p class="notice amber space">这篇材料超过 24000 字符，当前无法整篇处理。请使用较短材料或逐词查看原句解释；不会截断正文后冒充全文翻译。</p>':''}${!translation&&!sentence?'<p class="notice space">没有找到可拆解的英文原句。</p>':''}<div class="actions space"><button type="button" class="btn primary" data-action="readingRequestSupport()" ${pending||!canRequest?'disabled':''}>${pending?'正在生成…':result?'重新生成'+(translation?'正文翻译':'这句拆解'):'生成'+(translation?'正文翻译':'这句拆解')}</button>${pending?btn('取消生成','cancelRequest()','small'):''}</div>${session.error?`<div class="notice amber space" role="alert">${esc(session.error)}${result?'<br>上次保存的结果仍保留。':''}</div>`:''}${readingSupportResultHTML(result)}${result?`<p class="tiny space">${esc(result.source)} · ${esc(result.model||'所选 AI')} · ${new Date(result.createdAt).toLocaleString('zh-CN')}。已保存的结果可离线查看，并随学习空间同步；AI 解释需要结合原文核对。</p>`:'<p class="sub space">点击生成时使用当前选择的 AI 服务。生成后可离线查看，重复打开不再调用 AI。</p>'}</div>`);
}
async function readingRequestSupport(){
 const session=readingSupportSession;if(!session||busy||window.studyDataReplacing)return;
 if(!document.querySelector('[data-reading-support-modal="'+session.id+'"]'))return;
 if(!desktop?.explainReadingDocument)return toast('阅读辅助服务尚未加载，请更新应用');
 if(!aiConfigured())return toast('请先在设置中选择并授权 AI');
 const context=session.context,mode=session.mode,sentence=session.sentences[session.index],workspace=state;
 const target=mode==='sentence'?sentence:context.text;
 if(!target||context.text.length>24000)return toast('请使用长度允许的当前正文或原句');
 // Match the actual spelling from the original, including capitalization.
 const terms=[...new Set(readingMaterialItems(context.key).filter(item=>mode==='translation'||readingNormalize(item.sentence)===readingNormalize(sentence)).map(item=>{const match=readingTermMatches(target,item.term)[0];return match?target.slice(match.start,match.end):null;}).filter(Boolean))].slice(0,24);
 session.error='';session.loading=true;rememberDraft();let previousDocuments,replacedDocuments=false;
 await task(async()=>{
  readingSupportModal();
  try{
   requestId='reading-document-'+crypto.randomUUID();
   const result=await desktop.explainReadingDocument({id:requestId,mode,material:context.text,sentence:mode==='sentence'?sentence:undefined,terms});
   if(state!==workspace)throw Error('学习空间已变化，本次结果没有写入其他空间');
   const documents=JSON.parse(JSON.stringify(readingData().documents||{}));
   if(!documents[context.key]&&Object.keys(documents).length>=40)throw Error('已保存 40 篇阅读辅助，请先整理学习数据后新增');
   let document=documents[context.key];
   if(!document||document.material!==context.text)document=documents[context.key]={material:context.text,source:context.source,analyses:{}};
   const saved={...result,createdAt:Date.now()};
   if(mode==='translation')document.translation=saved;
   else{document.analyses||={};const key=readingMaterialKey(sentence);if(!document.analyses[key]&&Object.keys(document.analyses).length>=40)throw Error('本篇已保存 40 句拆解，请先整理后新增');document.analyses[key]=saved;}
   if(JSON.stringify(documents).length>2500000)throw Error('阅读辅助内容已达到保存上限，原有结果保留');
   previousDocuments=readingData().documents;readingData().documents=documents;replacedDocuments=true;readingSupportHelp(session,false);await readingSave();
  }catch(error){
   if(replacedDocuments&&state===workspace){if(previousDocuments===undefined)delete readingData().documents;else readingData().documents=previousDocuments;save();}
   session.error=error.message||'生成未完成，请重试';
  }
  finally{session.loading=false;if(readingSupportSession===session&&document.querySelector('[data-reading-support-modal="'+session.id+'"]'))readingSupportModal();}
 });
 if(readingSupportSession===session&&document.querySelector('[data-reading-support-modal="'+session.id+'"]'))readingSupportModal();
}
['readingOpenSupport','readingSupportSwitch','readingSupportChooseSentence','readingRequestSupport'].forEach(name=>actions.add(name));
// The main change dispatcher deliberately accepts only a small set of controls.
document.addEventListener('change',event=>{
 const session=readingSupportSession,target=event.target;
 if(target?.id==='reading-support-sentence'&&session&&target.closest('[data-reading-support-modal="'+session.id+'"]'))readingSupportChooseSentence(target.value);
});
