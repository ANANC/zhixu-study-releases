'use strict';
// Chat visibility is workspace data. Raw submissions and their learning evidence stay intact.
let chatInteraction=null,chatClearPending=null,chatArchivePending=null;
function chatData(){
 if(!state.chat||typeof state.chat!=='object'||Array.isArray(state.chat))state.chat={version:1,contexts:{},feedback:{}};
 if(!state.chat.contexts||typeof state.chat.contexts!=='object'||Array.isArray(state.chat.contexts))state.chat.contexts={};
 if(!state.chat.feedback||typeof state.chat.feedback!=='object'||Array.isArray(state.chat.feedback))state.chat.feedback={};
 state.chat.version=1;return state.chat;
}
function chatLists(){
 const rows=[],seen=new Set(),add=(list,key,label)=>{if(Array.isArray(list)&&!seen.has(list)){seen.add(list);rows.push({list,key,label});}};
 for(const [id,s] of Object.entries(state.sessions||{}))add(s?.messages,'course:'+id+':'+String(s?.created||'legacy'),'本课程对话');
 const a=state.adaptive;add(a?.run?.messages,'diagnosis:'+a?.run?.id,'本轮诊断对话');
 for(const column of Object.values(a?.columns||{}))for(const run of column?.diagnostics||[])add(run?.messages,'diagnosis:'+run?.id,'本轮诊断对话');
 const r=state.reading;add(r?.reviewRun?.messages,'reading:'+r?.reviewRun?.id,'本句练习对话');
 for(const run of r?.pausedReviews||[])add(run?.messages,'reading:'+run?.id,'本句练习对话');
 for(const [id,list] of Object.entries(state.threads||{}))add(list,'workspace:'+id,'工作区对话');
 return rows;
}
function chatScope(list=thread()){return chatLists().find(row=>row.list===list)||{list,key:null,label:'当前对话'};}
function chatCursor(scope){const value=scope.key?state.chat?.contexts?.[scope.key]?.cursor:0;return Number.isInteger(value)&&value>0?Math.min(value,scope.list.length):0;}
function chatVisibleMessages(list,context=false){
 if(!Array.isArray(list))return [];
 const scope=chatScope(list);
 return list.slice(chatCursor(scope)).filter(m=>m&&typeof m.text==='string'&&!m.hiddenInChat&&!m.interactionId&&(!context||!m.error));
}
function chatContextMessages(list){return chatVisibleMessages(list,true);}
function chatTranscript(list,archive=false){
 return list.length?`<div class="transcript${archive?' chat-archive':''}" aria-label="${archive?'已清理对话记录':'本上下文对话记录'}">${list.map(m=>`<div class="message ${m.role==='user'?'user':'ai'}"><span class="label">${m.role==='user'?'你':esc(m.source||'学习反馈')}</span>${esc(m.text)}${!archive&&m.error&&m.retry?`<div class="actions space">${btn('重试这次请求',`retryMessage('${m.at}')`,'small')}</div>`:''}</div>`).join('')}</div>`:'';
}
messages=function(){return chatTranscript(chatVisibleMessages(thread()));};
function chatArchived(scope){return scope.list.slice(0,chatCursor(scope)).filter(m=>m&&typeof m.text==='string'&&!m.hiddenInChat&&!m.interactionId);}
function chatToolbar(){
 const foot=document.querySelector('.composefoot');if(!foot)return;
 const scope=chatScope(),visible=chatVisibleMessages(scope.list),archived=chatArchived(scope),pending=busy||!!chatInteraction;
 const tools=document.createElement('div');tools.className='chat-tools';tools.setAttribute('aria-label','当前对话管理');
 tools.innerHTML=`<button type="button" class="chat-tool" data-action="clearChatModal()" title="清理${esc(scope.label)}，保留学习证据" ${pending||!visible.length||!scope.key?'disabled':''}>清理对话</button>${archived.length?`<button type="button" class="chat-tool" data-action="chatArchiveModal()" ${pending?'disabled':''}>已清理 ${archived.length} 条</button>`:''}`;
 const send=foot.querySelector('[data-action="sendAI()"]');foot.insertBefore(tools,send||null);
 if(chatInteraction&&send)send.disabled=true;
}
function clearChatModal(){
 if(busy||chatInteraction)return toast('请等当前请求完成，再清理对话');
 const scope=chatScope(),count=chatVisibleMessages(scope.list).length;if(!scope.key||!count)return toast('当前没有需要清理的聊天');
 chatClearPending={id:crypto.randomUUID(),key:scope.key,list:scope.list,length:scope.list.length,cursor:chatCursor(scope)};
 openModal('清理当前对话',`<p>范围：${esc(scope.label)}，共 ${count} 条当前可见聊天。</p><p class="sub space">已有聊天会从主界面收起，之后的 AI 对话不再带入这些聊天。已提交答案、评分、作业和课程结果保留；其他对话不受影响。</p><p class="sub space">可以查看已清理记录、撤销最近一次清理或恢复全部。清理状态会随学习数据同步，另一端完成同步后生效。</p><div class="actions space">${btn('确认清理当前对话',`confirmClearChat('${chatClearPending.id}')`,'primary')}${btn('取消','closeModal()')}</div>`);
}
async function chatPersist(){save();if(typeof persist==='function')await persist();}
async function confirmClearChat(id){
 if(busy||chatInteraction)return toast('请等当前请求完成');
 const scope=chatScope(),pending=chatClearPending;
 if(!pending||pending.id!==id||scope.key!==pending.key||scope.list!==pending.list||scope.list.length!==pending.length||chatCursor(scope)!==pending.cursor){chatClearPending=null;closeModal();return toast('当前对话已有变化，请重新清理');}
 const data=chatData();data.contexts[scope.key]={cursor:scope.list.length,previousCursor:pending.cursor,clearedAt:Date.now()};chatClearPending=null;
 closeModal();render();
 try{await chatPersist();toast('当前对话已清理，学习证据保留；可查看记录或恢复');}catch(error){showError(error);}
}
function chatArchiveModal(){
 if(busy||chatInteraction)return toast('请等当前请求完成');
 const scope=chatScope(),rows=chatArchived(scope),entry=scope.key?state.chat?.contexts?.[scope.key]:null;if(!rows.length)return toast('当前没有已清理的聊天');
 chatArchivePending={id:crypto.randomUUID(),key:scope.key,list:scope.list,cursor:chatCursor(scope)};
 openModal('已清理的对话',`<p class="sub">${esc(scope.label)} · 记录只读，未用于当前 AI 对话。恢复后会重新显示，并重新参与之后的 AI 对话。答案和学习证据始终保留。</p><div class="actions space">${Number.isInteger(entry?.previousCursor)?btn('撤销最近清理',`restoreChat('${chatArchivePending.id}',1)`,'small'):''}${btn('恢复全部对话',`restoreChat('${chatArchivePending.id}',0)`,'small')}${btn('关闭','closeModal()','small')}</div>${chatTranscript(rows,true)}`);
}
async function restoreChat(id,undo){
 if(busy||chatInteraction)return toast('请等当前请求完成');
 const scope=chatScope(),pending=chatArchivePending;
 if(!pending||pending.id!==id||scope.key!==pending.key||scope.list!==pending.list||chatCursor(scope)!==pending.cursor){chatArchivePending=null;closeModal();return toast('当前对话已变化，请重新打开记录');}
 const entry=chatData().contexts[scope.key];if(!entry)return;
 entry.cursor=undo&&Number.isInteger(entry.previousCursor)?Math.max(0,Math.min(entry.previousCursor,scope.list.length)):0;delete entry.previousCursor;entry.restoredAt=Date.now();
 chatArchivePending=null;
 closeModal();render();try{await chatPersist();toast('对话已恢复，后续 AI 会参考恢复的聊天');}catch(error){showError(error);}
}
function chatTaskKey(){
 const a=state.adaptive,r=state.reading?.reviewRun,s=state.sessions?.[state.selected];
 if(state.page==='courses'&&a?.view==='diagnosis'&&a.run)return 'diagnosis:'+a.run.id+':'+a.run.index;
 if(state.page==='review'&&r&&!r.parked)return 'reading:'+r.id+':'+r.mode;
 if(state.page==='lesson'&&s)return 'lesson:'+state.selected+':'+s.created+':'+s.stage+':'+s.attempt+':'+s.index+':'+(a?.loops?.[state.selected]?.activityIndex||0);
 if(state.page==='assignment'&&s)return 'assignment:'+state.selected+':'+s.created+':'+s.homework.variant;
 if(state.page==='review-run')return 'review:'+state.reviewRun?.course;
 return state.page+':'+(state.selected||'');
}
function chatTagInteractions(token){
 if(!token||token.state!==state)return;
 const rows=chatLists();
 for(const row of rows){
  if(!token.starts.has(row.list))token.starts.set(row.list,token.scopeStarts.get(row.key)||0);
  const start=token.starts.get(row.list);
  for(let i=start;i<row.list.length;i++){
   const message=row.list[i];if(!message||typeof message!=='object')continue;
   message.hiddenInChat=true;message.interactionId=token.id;message.interactionAction=token.action;
  }
 }
}
function chatRememberFeedback(token){
 if(!token||token.state!==state)return;
 const scope=chatScope(),from=token.starts.get(scope.list),list=from===undefined?[]:scope.list.slice(from).filter(m=>m?.role!=='user'&&m?.interactionId===token.id&&typeof m.text==='string');
 const notices=list.map(m=>({text:m.text,source:m.source||'任务反馈',error:!!m.error}));
 for(const error of token.errors||[])if(!notices.some(m=>m.error&&m.text===error.text))notices.push(error);
 if(!scope.key||!notices.length)return;
 const answer=from===undefined?null:scope.list.slice(from).find(m=>m?.role==='user'&&m?.interactionId===token.id);
 chatData().feedback[scope.key]={id:token.id,task:chatTaskKey(),action:token.action,at:Date.now(),question:token.question||'',answer:answer?.text||'',messages:notices};
}
function chatTaskFeedback(){
 const scope=chatScope(),entry=scope.key?state.chat?.feedback?.[scope.key]:null;
 if(!entry||entry.task!==chatTaskKey())return;
 const hasError=entry.messages.some(m=>m.error);
 // These pages already display the same persisted result beside their task.
 if(!hasError&&((state.page==='courses'&&state.adaptive?.run?.feedback)||(state.page==='review'&&state.reading?.reviewRun?.result)||(state.page==='review-run'&&state.reviewRun?.answer!==null)))return;
 const workspace=document.getElementById('workspace');if(!workspace)return;
 const card=document.createElement('section');card.className='task-action-feedback'+(hasError?' has-error':'');card.setAttribute('role','status');card.setAttribute('aria-label','当前任务反馈');
 card.innerHTML=`<strong>${hasError?'本次操作尚未完成':'本次任务反馈'}</strong>${entry.answer?`<div class="sub">你的作答：${esc(entry.answer)}</div>`:''}${entry.messages.map(m=>`<div class="task-action-message${m.error?' error':''}"><span class="tiny">${esc(m.source)}</span><div>${esc(m.text)}</div></div>`).join('')}${entry.question?`<details><summary>查看刚才的题目</summary><div class="sub space">${esc(entry.question)}</div></details>`:''}${hasError?'<p class="sub">请按上方原因重试当前任务；已保存的学习证据不会被清理。</p>':''}`;
 const taskNode=workspace.querySelector('.task'),headNode=workspace.querySelector('.pagehead');
 if(taskNode)taskNode.insertAdjacentElement('beforebegin',card);else if(headNode)headNode.insertAdjacentElement('afterend',card);else workspace.prepend(card);
}
const chatBaseRender=render;
render=function(where){
 const token=chatInteraction,old=document.getElementById('workspace')?.scrollTop||0;
 if(token){chatTagInteractions(token);chatRememberFeedback(token);}
 const same=token&&token.state===state&&token.page===state.page&&token.scope===chatScope().key;
 chatBaseRender(token?(same?undefined:'top'):where);
 chatToolbar();chatTaskFeedback();
 const view=document.getElementById('workspace');if(view){if(token)view.scrollTop=same?old:0;else if(where==='bottom')view.scrollTop=view.scrollHeight;else if(where!=='top')view.scrollTop=old;}
};
function runTaskInteraction(action,work){
 if(chatInteraction)return work();
 const rows=chatLists();
 const token={id:crypto.randomUUID(),action,state,page:state.page,scope:chatScope().key,starts:new Map(rows.map(row=>[row.list,row.list.length])),scopeStarts:new Map(rows.map(row=>[row.key,row.list.length])),question:typeof activeChoiceQuestion==='function'?activeChoiceQuestion()?.question?.prompt||'':'',inCall:true,errors:[]};
 const oldFeedback=token.scope?state.chat?.feedback?.[token.scope]:null;
 if(oldFeedback)delete state.chat.feedback[token.scope];
 chatInteraction=token;
 const finish=()=>{if(chatInteraction!==token)return;chatTagInteractions(token);chatRememberFeedback(token);chatInteraction=null;if(token.state===state){save();render();}};
 const failed=error=>{token.errors.push({text:error?.message||String(error),source:'操作未完成',error:true});throw error;};
 try{const result=work();token.inCall=false;if(result&&typeof result.then==='function')return Promise.resolve(result).catch(failed).finally(finish);finish();return result;}catch(error){token.inCall=false;token.errors.push({text:error?.message||String(error),source:'操作未完成',error:true});finish();throw error;}
}
const chatBaseAppend=append;
append=function(...args){const result=chatBaseAppend.apply(this,args);if(chatInteraction)chatTagInteractions(chatInteraction);return result;};
const chatBaseAdd=add;
add=function(...args){const result=chatBaseAdd.apply(this,args);if(chatInteraction)chatTagInteractions(chatInteraction);return result;};
const chatBaseShowError=showError;
showError=function(error){if(chatInteraction)chatInteraction.errors.push({text:error?.message||String(error),source:'操作未完成',error:true});return chatBaseShowError(error);};
const chatTaskActions=new Set(['chooseAnswer','adaptiveUnknown','adaptiveDiagnosisHelp','adaptiveNextQuestion','setStage','startAcceptance','retryAcceptance','adaptiveActivity','adaptiveCompleteActivity','newHomework','confirmSummary','confirmReview','confirmProject','confirmReadingReview','setReadingReviewMode','reviseReadingReview','startNextReadingReview','retryReadingReviewGrade','hintReadingReview','pauseSession','startCourse','startReview','openAssignment','adaptiveContinueLoop','endCourse','startReadingReview','replaceReadingReview','resumeReadingReview','resumePausedReadingReview','pauseReadingReview','adaptiveStartDiagnosis','adaptiveRestartDiagnosis','adaptiveResumeDiagnosis','adaptiveMoreDiagnosis','applyPlan','confirmDefer','startReadingMaterialPractice','replaceReadingMaterialPractice','returnFromReadingMaterialPractice']);
const chatBaseDispatch=dispatch;
dispatch=function(code,node,event){
 const name=code.match(/^(\w+)\(/)?.[1];
 if(!name||!chatTaskActions.has(name)||typeof window[name]!=='function')return chatBaseDispatch(code,node,event);
 if(chatInteraction)return toast('当前操作正在处理，请稍候');
 const fn=window[name];window[name]=function(...args){return runTaskInteraction(name,()=>fn.apply(this,args));};
 try{return chatBaseDispatch(code,node,event);}finally{window[name]=fn;}
};
// Keep keyboard submission from starting a second request during a button's final disk save.
const chatBaseSend=sendAI;
sendAI=function(...args){if(chatInteraction&&!chatInteraction.inCall)return toast('当前操作正在处理，请稍候');return chatBaseSend.apply(this,args);};
['clearChatModal','confirmClearChat','chatArchiveModal','restoreChat'].forEach(name=>actions.add(name));
render();
