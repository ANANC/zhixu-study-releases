'use strict';
// Sentence memory lives with the saved reading context, independently of the
// formal course mastery and course-review records. All replies use the composer.
const readingReviewIntervals=[1,3,7,14];
function readingReviewToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function readingReviewDate(days,from=readingReviewToday()){const d=new Date(from+'T12:00:00');d.setDate(d.getDate()+days);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function readingReviewData(){const r=readingData();if(!r.review||typeof r.review!=='object'||Array.isArray(r.review))r.review={};return r;}
function readingReviewPersist(){readingSave().catch(showError);}
function readingReviewItems(){return readingReviewData().items.filter(item=>item&&item.status!=='archived'&&typeof item.id==='string'&&/^[\w-]{1,160}$/.test(item.id)&&typeof item.sentence==='string'&&item.sentence.trim()&&typeof item.term==='string'&&item.term.trim());}
function readingReviewFor(item,create=false){
 const r=readingReviewData();let entry=r.review[item.id];
 if(!entry){const at=new Date(Number(item.markedAt)||Date.now());const day=Number.isNaN(at.getTime())?readingReviewToday():[at.getFullYear(),String(at.getMonth()+1).padStart(2,'0'),String(at.getDate()).padStart(2,'0')].join('-');entry={step:0,due:readingReviewDate(1,day),lastReviewed:null,attempts:[]};if(create)r.review[item.id]=entry;}
 return entry;
}
function readingReviewCurrent(){const run=readingReviewData().reviewRun;return state.page==='review'&&run&&!run.parked&&readingItem(run.itemId)?run:null;}
function readingReviewNormalize(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');}
function readingReviewCloze(sentence,term){
 const escaped=term.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
 const expression=new RegExp('(^|[^A-Za-z0-9_])('+escaped+')(?=$|[^A-Za-z0-9_])','gi');
 const match=expression.exec(sentence);if(!match)return null;
 expression.lastIndex=0;
 return {material:sentence.replace(expression,(_,prefix)=>prefix+'________'),answer:match[2]};
}
function readingReviewTask(item,mode='meaning'){
 const explanation=item.explanation||{},sentence=item.sentence.trim();
 const originalReference=typeof explanation.originalTranslation==='string'?explanation.originalTranslation.trim():'';
 if(mode==='memory'){
  const words=sentence.split(/\s+/),beginning=words.length>1?words.slice(0,Math.min(3,words.length-1)).join(' '):'';
  return {mode,scope:'保存原句的完整文字回忆',material:beginning?'句子开头：'+beginning+' …':'凭记忆写出已保存的原句。',prompt:'凭记忆写出保存的完整英文原句。核对忽略大小写、首尾与连续空白，其余文字需一致。',reference:sentence,criteria:[],answer:sentence,grading:'exact-sentence',origin:'原句',rule:'仅核对这条原句的文字回忆，不据此认定词义、语法或迁移能力已掌握。'};
 }
 if(mode==='cloze'){
  const fresh=typeof explanation.example==='string'?explanation.example.trim():'';
  const blank=(fresh&&readingReviewCloze(fresh,item.term))||readingReviewCloze(sentence,item.term);
  if(!blank)throw Error('保存的句子里没有可准确遮住的这一表达，请使用整句理解或整句回忆');
  const material=fresh&&readingReviewCloze(fresh,item.term)?fresh:sentence;
  return {mode,scope:'语境中限定表达的填句',material:blank.material,prompt:'补回横线处的表达。可以只输入缺失表达，也可以提交补完整的句子。',reference:material,answer:blank.answer,criteria:[],grading:'exact-term',origin:material===sentence?'原句':'AI 新例句',rule:'只核对保存句子的这一表达；忽略大小写、首尾与连续空白。相同语境中的其他合理写法不自动判错，请改用整句理解让 AI 评审。此记录不证明整句理解或新的语法能力。'};
 }
 if(mode==='new-meaning'){
  if(typeof explanation.example!=='string'||!explanation.example.trim()||typeof explanation.translation!=='string'||!explanation.translation.trim()||typeof explanation.question!=='string'||!explanation.question.trim()||typeof explanation.expected!=='string'||!explanation.expected.trim())throw Error('请先在笔记中获取有效的句中解释与新例句，再练新语境');
  return {mode,scope:'AI 新例句的整句理解',material:explanation.example.trim(),prompt:'先用自己的话说明整句的含义，再回答：'+explanation.question.trim(),reference:'新例句完整释义：'+explanation.translation+'\n句中表达的参考理解：'+explanation.expected,criteria:['完整说明新例句的主要事实与关系，不改变原意','回答句中表达的含义或用法，并给出句内依据'],grading:'semantic',origin:'AI 新例句',rule:'依据保存的 AI 参考逐项评审；这条记忆复习不替代课程独立验收。'};
 }
 return {mode:'meaning',scope:'原句的完整理解',material:sentence,prompt:'用自己的话说明整句发生了什么、各部分怎样关联，再解释“'+item.term+'”在这句中的含义或作用。',reference:originalReference?'原句完整释义：'+originalReference+'\n句中表达含义：'+String(explanation.meaning||'')+'\n句中用法：'+String(explanation.usage||''):'',criteria:['完整说明原句的主要事实与关系，不改变原意','解释目标表达在原句中的含义或作用，有句内依据'],grading:originalReference?'semantic':'self',origin:'原句',rule:originalReference?'按保存的原句释义逐项评审，不使用新例句译文作为原句答案。':'尚无原句解释参考，只能保留你的理解与自检记录，不能自动判定通过。'};
}
function readingReviewSource(item){return [item.source?.themeTitle||item.source?.courseTitle,item.source?.subject].filter(Boolean).join(' · ')||'保存的阅读语境';}
function readingReviewHiddenSentence(item){
 const run=readingReviewData().reviewRun;if(!run||run.answer!==null||run.confirmed||run.hinted||!['memory','cloze'].includes(run.mode))return false;
 const original=readingItem(run.itemId);return !!original&&readingReviewNormalize(original.sentence)===readingReviewNormalize(item.sentence);
}
function readingReviewQueueHTML(limit=6){
 const r=readingReviewData(),today=readingReviewToday(),rows=readingReviewItems().sort((a,b)=>readingReviewFor(a).due.localeCompare(readingReviewFor(b).due)),due=rows.filter(item=>readingReviewFor(item).due<=today);
 const parked=r.reviewRun?.parked&&!r.reviewRun.confirmed?`<div class="notice space"><strong>有一轮句子练习已暂停</strong><div class="actions space">${btn('继续当前句子','resumeReadingReview()','primary small')}</div></div>`:'';
 if(!rows.length)return panel('语境句子复习',`<p class="sub">阅读时保存看不懂的表达与原句，这里会安排完整句子理解和回忆。用原句、新例句与填句练习巩固语境，不做孤立单词卡。</p>`);
 const visible=limit?rows.slice(0,limit):rows;
 return panel('语境句子复习',`<p>${due.length} 条已到期 · 共 ${rows.length} 条保存的句子</p><p class="sub">先理解完整句子，再回忆整句或练语境填句。间隔按 1、3、7、14 天推进；提示、未通过或自检会安排次日再练。提前练习会保留记录，不提前递增间隔。</p>${parked}<div class="actions space">${btn(due.length?'开始到期句子':'提前练一句','startNextReadingReview()','primary small')}${rows.length>limit&&limit?btn('查看全部句子','showAllReadingReviews()','small'):!limit?btn('收起列表','showAllReadingReviews(0)','small'):''}${r.pausedReviews?.length?btn('此前暂停的句子',"readingPausedReviews()",'small'):''}</div>${visible.map(item=>{const entry=readingReviewFor(item),last=entry.attempts?.at(-1),hidden=readingReviewHiddenSentence(item);return `<div class="item reading-review-list-item"><div class="grow"><p class="reading-sentence">${readingSentenceHTML(item)}</p><div class="sub">${hidden?'待完成的回忆句子':esc(item.term)} · ${esc(readingReviewSource(item))}</div><div class="tiny">${esc(entry.due)} · ${entry.due<=today?'到期可复习':'尚未到期'} · ${entry.attempts?.length||0} 次记录${last?' · '+(last.source==='用户自检'?'上次为用户自检':last.hinted?'上次使用提示':last.pass?'上次完成限定任务':'仍需补学'):''}</div></div><div class="actions">${btn('理解整句',`startReadingReview('${item.id}')`,'small')}${btn('回忆整句',`startReadingReview('${item.id}','memory')`,'small')}${entry.attempts?.length?btn('记录',`readingReviewHistory('${item.id}')`,'small'):''}</div></div>`;}).join('')}`);
}
function readingReviewRunHTML(run){
 const item=readingItem(run.itemId),task=run.task,result=run.result;if(!task)return readingReviewQueueHTML();
 const modes=`<div class="actions space">${btn('理解原句',"setReadingReviewMode('meaning')",'small')}${item.explanation?.example&&item.explanation?.translation&&item.explanation?.question&&item.explanation?.expected?btn('理解新例句',"setReadingReviewMode('new-meaning')",'small'):''}${btn('回忆整句',"setReadingReviewMode('memory')",'small')}${readingReviewCloze(item.sentence,item.term)||(item.explanation?.example&&readingReviewCloze(item.explanation.example,item.term))?btn('语境填句',"setReadingReviewMode('cloze')",'small'):''}</div>`;
 const top=head('句子理解与记忆',readingReviewSource(item));
 const material=`<section class="task reading-review-task">${badge(task.scope)}<div class="task-material">${esc(task.material)}</div><div class="question">${esc(task.prompt)}</div><p class="sub">${esc(task.rule)}</p></section>`;
 if(run.answer===null){
  const hint=run.hinted?`<div class="notice amber space"><strong>这轮已使用帮助，作为训练保留。</strong>${run.hintText?`<div class="sub space">${esc(run.hintText)}</div>`:''}</div>`:'';
  return `<div class="section">${top}${material}<p class="sub space">${run.chat?'当前底部输入用于讨论，讨论会计作帮助。点击“回到作答”后提交你的理解。':'在底部中央输入提交完整回答。答案与释义会在作答后展示。'}</p>${modes}${hint}<div class="actions space">${btn('查看句中提示','hintReadingReview()','small')}${btn(run.chat?'回到作答':'和 AI 讨论这句',`readingReviewConversation(${run.chat?0:1})`,'small')}${btn('暂停这轮','pauseReadingReview()','small')}</div></div>`;
 }
 const independent=result?.pass===true,feedback=result?.feedback||'回答已保留，等待评审或自检。';
 const label=result?.source==='用户自检'?'理解已保存 · 未判定通过':independent?'本次限定任务已完成':result?.judgmentPass&&run.answeredHinted?'回答符合参考 · 有帮助的训练':result?.status==='pending'?'评审待完成':'本次需要补学或再回忆';
 const evidence=panel('本次句子练习记录',`<div class="notice ${independent?'green':'amber'}"><strong>${esc(label)}</strong><div class="sub space">${esc(feedback)}</div></div><p class="sub space">${esc(result?.source||'等待评审')} · ${esc(task.scope)}</p>${result?.rubric?.length?`<div class="space">${result.rubric.map(row=>`<div class="item"><div class="grow"><strong>${row.pass?'✓':'待补'} ${esc(row.label)}</strong><div class="sub">${esc(row.reason)}</div></div></div>`).join('')}</div>`:''}<details class="space"><summary>查看本次回答与作答后参考</summary><div class="notice space"><strong>你的回答</strong><div class="sub space">${esc(run.answer)}</div></div><p class="sub space">${esc(task.reference||'暂无可靠参考。你的历史理解不作为通过标准。')}</p></details><p class="sub space">${run.confirmed?'已记入语境复习，下一次：'+esc(readingReviewFor(item).due)+'。':'确认后保存本次回答与证据来源；未通过、有提示或仅自检会次日再练。'}本轮不改变正式课程掌握度。</p><div class="actions space">${!run.confirmed?btn(result?.source==='用户自检'?'我已自查，保存记录':'确认并保存复习记录','confirmReadingReview()','primary'):btn('下一条句子','startNextReadingReview()','primary')}${!run.confirmed&&task.grading==='semantic'&&result?.status==='pending'?btn('重试 AI 评审','retryReadingReviewGrade()'):''}${!run.confirmed?btn('修订回答','reviseReadingReview()','small'):''}${btn('讨论这句','readingReviewConversation(1)','small')}${btn('返回复习队列','pauseReadingReview()','small')}</div>`);
 return `<div class="section">${top}${material}${evidence}</div>`;
}
const readingReviewBasePage=reviewPage;
reviewPage=function(){const run=readingReviewCurrent();return run?readingReviewRunHTML(run):readingReviewQueueHTML(readingReviewData().showAllReviews?0:6)+readingReviewBasePage();};
const readingReviewBaseNotes=notesPage;
notesPage=function(){const items=readingReviewItems();if(!items.length)return readingReviewBaseNotes();const due=items.filter(item=>readingReviewFor(item).due<=readingReviewToday()).length;return panel('把阅读放进句子记忆',`<p class="sub">${items.length} 条语境记录 · ${due} 条句子已到期。完整理解与回忆的证据单独保存，不升级课程掌握度。</p><div class="actions space">${btn('去句子复习',"goto('review')",'small')}${btn(due?'开始到期句子':'练一句完整句子','startNextReadingReview()','primary small')}</div>`)+readingReviewBaseNotes();};
const readingReviewBaseDraftKey=draftKey;
draftKey=function(){const run=readingReviewCurrent();return run?'reading-review:'+run.id:readingReviewBaseDraftKey();};
const readingReviewBaseThread=thread;
thread=function(){const run=readingReviewCurrent();if(run){run.messages||=[];return run.messages;}return readingReviewBaseThread();};
const readingReviewBasePlaceholder=placeholder;
placeholder=function(){const run=readingReviewCurrent();if(run)return run.chat||run.confirmed?'围绕当前句子和 AI 讨论…':run.answer!==null?'先检查并确认本次记录，或点击修订回答…':run.mode==='memory'?'凭记忆写出完整英文原句…':run.mode==='cloze'?'补回缺失表达，或提交补完整的句子…':'用自己的话解释整句与目标表达…';return readingReviewBasePlaceholder();};
const readingReviewBaseContext=contextFor;
contextFor=function(c,s){const run=readingReviewCurrent();if(!run)return readingReviewBaseContext(c,s);return {activity:'语境句子理解与记忆',origin:readingReviewSource(readingItem(run.itemId)),task:{scope:run.task.scope,material:run.task.material,prompt:run.task.prompt},helpUsed:!!run.hinted,submitted:run.answer!==null,limits:'只能讨论当前展示的句子和任务，不宣称正式课程已通过、学习数据已同步或能力已掌握；参考答案不在对话上下文中。'};};
const readingReviewBaseRender=render;
render=function(where){readingReviewBaseRender(where);const run=readingReviewCurrent();if(!run)return;const button=document.querySelector('.composefoot [data-action="sendAI()"]');if(button)button.textContent=run.chat||run.confirmed?'发送 ↑':'提交句子 ↑';const foot=document.querySelector('.composefoot .tiny');if(foot&&!busy)foot.textContent=run.chat||run.confirmed?'围绕当前句子交流 · 仍使用中央输入':run.answer!==null?'先确认本次记录，或点击修订':'当前输入用于语境句子练习 · 不改变课程掌握度';};
function showAllReadingReviews(value=true){if(busy)return;readingReviewData().showAllReviews=!!value;render('top');}
function startNextReadingReview(){if(busy)return toast('请等当前请求完成');const rows=readingReviewItems().sort((a,b)=>readingReviewFor(a).due.localeCompare(readingReviewFor(b).due));if(!rows.length)return toast('先从阅读材料保存一条语境句子');const last=readingReviewData().reviewRun?.itemId;startReadingReview(rows.find(item=>item.id!==last&&readingReviewFor(item).due<=readingReviewToday())?.id||rows.find(item=>item.id!==last)?.id||rows[0].id);}
function startReadingReview(id,mode='meaning',replace=false){
 if(busy)return toast('请等当前请求完成');const item=readingItem(id);if(!item)return toast('语境记录不存在');const r=readingReviewData(),old=r.reviewRun;
 if(old&&!old.confirmed&&!replace){if(old.itemId===id){rememberDraft();old.parked=false;pauseActive();state.page='review';readingReviewPersist();render('top');return;}openModal('当前句子还没完成',`<p>可以继续当前句子，或把当前回答和草稿保留为暂停记录后换一句。</p><div class="actions space">${btn('继续当前句子','resumeReadingReview()','primary')}${btn('保留并换一句',`replaceReadingReview('${id}','${mode}')`)}${btn('取消','closeModal()')}</div>`);return;}
 rememberDraft();pauseActive();closeModal();const task=readingReviewTask(item,mode);readingReviewFor(item,true);
 r.reviewRun={id:'reading-review-'+crypto.randomUUID(),itemId:id,mode:task.mode,task,startedAt:Date.now(),hinted:false,answer:null,answered:false,result:null,confirmed:false,parked:false,chat:false,messages:[]};
 state.page='review';readingReviewPersist();render('top');document.getElementById('aiInput')?.focus();
}
function replaceReadingReview(id,mode='meaning'){
 if(busy)return;rememberDraft();const r=readingReviewData(),old=r.reviewRun;if(old&&!old.confirmed){r.pausedReviews||=[];r.pausedReviews.unshift({...JSON.parse(JSON.stringify(old)),draft:state.drafts['reading-review:'+old.id]||'',pausedAt:Date.now()});}startReadingReview(id,mode,true);
}
function readingPausedReviews(){if(busy)return;const rows=readingReviewData().pausedReviews||[];openModal('此前暂停的句子',`<p class="sub">回答和草稿仍保留，可恢复后继续；未确认的回答不算通过记录。</p>${rows.filter(run=>readingItem(run.itemId)).map(run=>`<div class="item"><div class="grow"><strong>${esc(readingReviewSource(readingItem(run.itemId)))}</strong><div class="sub">${esc(run.task?.scope||'句子练习')} · ${new Date(run.pausedAt||run.startedAt).toLocaleString('zh-CN')}</div></div>${btn('恢复这轮',`resumePausedReadingReview('${run.id}')`,'small')}</div>`).join('')||'<p>没有可恢复的暂停记录。</p>'}${btn('关闭','closeModal()')}`);}
function resumePausedReadingReview(id){if(busy)return;const r=readingReviewData(),index=(r.pausedReviews||[]).findIndex(run=>run.id===id);if(index<0)return;rememberDraft();const chosen=r.pausedReviews.splice(index,1)[0],old=r.reviewRun;if(old&&!old.confirmed)r.pausedReviews.unshift({...JSON.parse(JSON.stringify(old)),draft:state.drafts['reading-review:'+old.id]||'',pausedAt:Date.now()});r.reviewRun=chosen;chosen.parked=false;state.drafts['reading-review:'+chosen.id]||=chosen.draft||'';pauseActive();state.page='review';closeModal();readingSave().catch(showError);render('top');}
function resumeReadingReview(){if(busy)return;const run=readingReviewData().reviewRun;if(!run)return toast('当前没有暂停的句子练习');rememberDraft();pauseActive();run.parked=false;state.page='review';closeModal();readingReviewPersist();render('top');}
function pauseReadingReview(){if(busy)return;rememberDraft();const run=readingReviewData().reviewRun;if(run)run.parked=true;closeModal();readingReviewPersist();render('top');}
function setReadingReviewMode(mode){if(busy)return;const run=readingReviewCurrent();if(!run||run.answer!==null||run.confirmed)return toast('先确认这次记录，再开始新题型');rememberDraft();const task=readingReviewTask(readingItem(run.itemId),mode);if(run.mode!==mode&&(mode==='memory'||mode==='cloze')&&['meaning','new-meaning'].includes(run.mode)){run.hinted=true;run.hintText='本轮已看过完整句子，再换回忆或填句作为训练；新开一轮再独立回忆。';}run.task=task;run.mode=task.mode;run.chat=false;readingReviewPersist();render('top');}
function hintReadingReview(){
 if(busy)return;const run=readingReviewCurrent();if(!run||run.answer!==null)return;const item=readingItem(run.itemId),e=item.explanation||{};
 run.hinted=true;run.hintText=run.mode==='memory'?'原句：'+item.sentence:[e.meaning,e.usage,run.mode==='new-meaning'?e.translation:e.originalTranslation].filter(Boolean).join('\n')||'暂无句中解释。可以在中央和 AI 讨论，或回笔记请求句中解释；这轮帮助会作为训练记录。';
 readingReviewPersist();render();
}
function readingReviewConversation(value=true){if(busy)return;const run=readingReviewCurrent();if(!run)return;run.chat=!!value;if(value&&run.answer===null)run.hinted=true;readingReviewPersist();render();document.getElementById('aiInput')?.focus();}
async function gradeReadingReview(run){
 const task=run.task;
 if(task.grading==='exact-sentence'||task.grading==='exact-term'){
  const normal=readingReviewNormalize(run.answer),match=normal===readingReviewNormalize(task.answer)||(task.grading==='exact-term'&&normal===readingReviewNormalize(task.reference));
  return {status:'graded',source:task.grading==='exact-term'?'保存句子的限定填词核对':'保存原句的完整文字核对',judgmentPass:match,pass:match&&!run.answeredHinted,feedback:match?'符合本次保存句子的文字核对规则。'+(run.answeredHinted?'这轮使用过帮助，仅作训练。':'该证据只覆盖本次限定任务。'):'未与保存句子的文字一致。完整表达可能有其他合理写法；本次只作限定回忆检查，可以切换整句理解再评审。',rubric:[]};
 }
 if(task.grading==='self'||!task.reference||!desktop||!aiConfigured())return {status:'self',source:'用户自检',judgmentPass:null,pass:null,selfChecked:false,feedback:task.grading==='self'?'没有有效原句参考；你的回答已保留，不自动判定对错。可以获取句中解释后新开一轮。':'AI 尚未配置，已保留你的理解。此时只能记录用户自检，不冒充 AI 评审。',rubric:[]};
 requestId=crypto.randomUUID();
 const result=await desktop.grade({id:requestId,question:task.material+'\n\n'+task.prompt,reference:task.reference,criteria:task.criteria,answer:run.answer,execution:null});
 if(typeof result?.correct!=='boolean'||typeof result.reason!=='string'||!Array.isArray(result.rubric)||result.rubric.length!==task.criteria.length||result.rubric.some(row=>typeof row.pass!=='boolean'||typeof row.reason!=='string'))throw Error('句子评审证据不完整，回答已保留，尚未取得通过');
 const judgmentPass=result.correct&&result.rubric.every(row=>row.pass);
 return {status:'graded',source:result.source||'AI 逐项评审',model:result.model||'',judgmentPass,pass:judgmentPass&&!run.answeredHinted,feedback:result.reason+(run.answeredHinted?'\n本轮使用过帮助，记录为训练。':''),rubric:result.rubric.map((row,index)=>({...row,label:task.criteria[index]}))};
}
async function submitReadingReview(value){
 const run=readingReviewCurrent();if(!run||run.answer!==null||run.confirmed)return toast('请先检查或修订当前回答');const key=draftKey();state.drafts[key]='';const input=document.getElementById('aiInput');if(input)input.value='';run.messages||=[];run.messages.push({role:'user',text:value,at:Date.now()});run.answer=value;run.answered=true;run.answeredAt=Date.now();run.answeredHinted=!!run.hinted;run.chat=false;busy=true;render();
 try{await readingSave();run.result=await gradeReadingReview(run);append(run.messages,run.result.feedback,run.result.source);}catch(error){run.result={status:'pending',source:'评审未完成',judgmentPass:null,pass:null,feedback:error.message||'本次评审未完成，回答已保留',rubric:[]};append(run.messages,run.result.feedback,'请求未完成');}finally{busy=false;await readingSave().catch(showError);render('bottom');}
}
const readingReviewBaseSend=sendAI;
sendAI=async function(){const run=readingReviewCurrent();if(!run)return readingReviewBaseSend();if(busy)return;const value=document.getElementById('aiInput')?.value.trim();if(!value)return;if(run.chat||run.confirmed)return converseReadingReview(value);if(run.answer!==null)return toast('这轮已提交，请先确认记录或点击修订回答');if(/^(?:提示|查看提示|解释一下|帮我理解|看看原句)$/.test(value)){rememberDraft();hintReadingReview();return;}if(/^(?:请解释|能解释|帮我|我不懂|不理解|请问)|[?？]\s*$/.test(value)){run.chat=true;return converseReadingReview(value);}return submitReadingReview(value);};
async function converseReadingReview(value){
 const run=readingReviewCurrent();if(!run||busy)return;const key=draftKey();state.drafts[key]='';const input=document.getElementById('aiInput');if(input)input.value='';if(run.answer===null)run.hinted=true;run.chat=true;run.messages||=[];run.messages.push({role:'user',text:value,at:Date.now()});busy=true;render();
 try{await readingSave();if(!desktop||!aiConfigured())append(run.messages,'AI 尚未配置。可以查看已保存的句中提示，或先配置在线 AI 再讨论；你的问题已保留。','离线提示');else await coach(run.messages,value,contextFor());}catch(error){state.drafts[key]=value;append(run.messages,error.message||'本次讨论未完成，问题已保留','请求未完成');}finally{busy=false;await readingSave().catch(showError);render('bottom');}
}
async function retryReadingReviewGrade(){
 const run=readingReviewCurrent();if(busy||!run||run.answer===null||run.confirmed)return;busy=true;render();try{run.result=await gradeReadingReview(run);append(run.messages,run.result.feedback,run.result.source);}catch(error){run.result={status:'pending',source:'评审未完成',judgmentPass:null,pass:null,feedback:error.message||'评审未完成',rubric:[]};showError(error);}finally{busy=false;await readingSave().catch(showError);render();}
}
function reviseReadingReview(){if(busy)return;const run=readingReviewCurrent();if(!run||run.confirmed)return;state.drafts['reading-review:'+run.id]=run.answer||'';run.hinted=true;run.answer=null;run.answered=false;run.result=null;run.chat=false;delete run.answeredAt;delete run.answeredHinted;readingReviewPersist();render();toast('原回答放回草稿。已查看过反馈，这次修订作为训练；新开一轮再独立回忆。');}
async function confirmReadingReview(){
 if(busy)return;const run=readingReviewCurrent();if(!run||run.answer===null||run.confirmed||!run.result)return;
 if(run.result.status==='pending')return toast('评审尚未完成，请重试评审；或先暂停，保留回答');
 const item=readingItem(run.itemId),entry=readingReviewFor(item,true),today=readingReviewToday(),result=run.result;
 const early=entry.due>today||(entry.lastReviewed&&new Date(entry.lastReviewed).toDateString()===new Date().toDateString());
 const nextStep=result.pass===true&&!early?Math.min((Number(entry.step)||0)+1,readingReviewIntervals.length-1):result.pass===true?Number(entry.step)||0:0;
 entry.step=nextStep;entry.due=result.pass===true?(early?entry.due:readingReviewDate(readingReviewIntervals[nextStep])):readingReviewDate(1);entry.lastReviewed=Date.now();entry.attempts||=[];
 entry.attempts.push({id:run.id,at:run.answeredAt||Date.now(),confirmedAt:Date.now(),mode:run.mode,scope:run.task.scope,material:run.task.material,prompt:run.task.prompt,answer:run.answer,source:result.source,model:result.model||'',hinted:!!run.answeredHinted,judgmentPass:result.judgmentPass,pass:result.pass,selfChecked:result.source==='用户自检',early,feedback:result.feedback,rubric:result.rubric||[],nextDue:entry.due,messages:JSON.parse(JSON.stringify(run.messages||[])),origin:JSON.parse(JSON.stringify(item.source||{}))});
 run.confirmed=true;run.confirmedAt=Date.now();run.chat=true;item.updatedAt=Date.now();await readingSave(item);render();toast(result.pass===true?'本次限定任务记录已保存，下一次 '+entry.due:result.source==='用户自检'?'用户自检记录已保存，明天再练；未判定通过':'训练记录已保存，明天再练');
}
function readingReviewHistory(id){const item=readingItem(id);if(!item)return;if(readingReviewHiddenSentence(item)){readingMarkHelp(item);readingSave().catch(showError);}const attempts=readingReviewFor(item).attempts||[];openModal('句子记忆记录',`<p class="sub">${esc(readingReviewSource(item))} · 仅记录语境复习，不改变课程掌握度。</p>${attempts.slice().reverse().slice(0,20).map(attempt=>`<section class="card"><strong>${new Date(attempt.at).toLocaleString('zh-CN')} · ${esc(attempt.scope)}</strong><p class="sub space">${esc(attempt.source)} · ${attempt.source==='用户自检'?'用户自检，未判定通过':attempt.hinted?'有帮助的训练':attempt.pass?'完成本次限定任务':'尚未完成'}${attempt.early?' · 提前练习':''}</p><details><summary>回答与反馈</summary><div class="sub space">${esc(attempt.material)}</div><pre class="pre space">${esc(attempt.answer)}</pre><div class="sub space">${esc(attempt.feedback)}</div></details></section>`).join('')||'<p>暂时没有确认的句子复习记录。</p>'}${btn('关闭','closeModal()')}`);}
['showAllReadingReviews','startReadingReview','replaceReadingReview','startNextReadingReview','resumeReadingReview','pauseReadingReview','setReadingReviewMode','hintReadingReview','readingReviewConversation','retryReadingReviewGrade','reviseReadingReview','confirmReadingReview','readingReviewHistory','readingPausedReviews','resumePausedReadingReview'].forEach(name=>actions.add(name));
