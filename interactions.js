'use strict';
// Click answers use the same persisted grading chain as the central composer.
function activeChoiceQuestion(){
 if(state.page==='courses'&&typeof adaptiveData==='function'){
  const a=adaptiveData(),r=a.run;
  if(a.view==='diagnosis'&&r&&!r.done&&!r.feedback)return {question:r.questions[r.index],key:'diagnosis:'+r.id+':'+r.index};
 }
 if(state.page==='lesson'){
  const c=courses[state.selected],s=ses();
  if(c&&s){const q=currentQ(c,s);if(q)return {question:q,key:'course:'+c.id+':'+s.created+':'+s.stage+':'+s.attempt+':'+s.index};}
 }
 if(state.page==='review-run'&&state.reviewRun?.answer===null){const r=state.reviewRun;return {question:courses[r.course]?.review,key:'review:'+r.course+':'+r.at};}
 return null;
}
function answerToken(active){let value=2166136261;for(const c of active.key+'|'+active.question.prompt)value=Math.imul(value^c.charCodeAt(0),16777619);return (value>>>0).toString(36);}
const plainQuestion=question;
question=function(q,label){
 if(!Array.isArray(q.options)||!q.options.length)return plainQuestion(q.material&&!q.prompt.includes(q.material)?{...q,prompt:q.material+'\n\n'+q.prompt}:q,label);
 const active=activeChoiceQuestion(),isCurrent=active?.question?.prompt===q.prompt;
 const token=isCurrent?answerToken(active):'',disabled=!isCurrent||busy;
 const displayPrompt=q.material&&q.prompt.startsWith(q.material)?q.prompt.slice(q.material.length).trim():q.prompt;
 return `<section class="task">${badge(label)}${q.material?`<div class="task-material">${esc(q.material)}</div>`:''}<div class="question">${esc(displayPrompt)}</div><div class="choice-list">${q.options.map((option,i)=>{const letter=String.fromCharCode(65+i),text=String(option).replace(/^[A-F][.、:：)．]\s*/i,'');return `<button type="button" class="option choice-option" ${disabled?'disabled':''} data-action="chooseAnswer('${token}','${letter}')"><span class="choice-letter">${letter}</span><span>${esc(text)}</span><span class="choice-submit" aria-hidden="true">选择 →</span></button>`;}).join('')}</div><p class="sub">${isCurrent?'点击选项直接作答；需要解释或提问时，在底部和 AI 沟通。':'题目预览；进入当前任务后可点击作答。'}</p></section>`;
};
async function chooseAnswer(token,letter){
 if(busy)return;
 const active=activeChoiceQuestion();
 if(!active||token!==answerToken(active)||!Array.isArray(active.question.options))return toast('当前题目已变化，请选择当前题的选项');
 const index=letter.charCodeAt(0)-65;
 if(!/^[A-F]$/.test(letter)||index<0||index>=active.question.options.length)return;
 // An unfinished conversation draft is kept separately, rather than overwritten by a click.
 const input=document.getElementById('aiInput'),key=draftKey(),draft=input?.value||state.drafts[key]||'';
 if(draft.trim()){state.choiceDrafts||={};state.choiceDrafts[key]=draft;}
 if(!input)return;
 input.value=letter;
 try{await sendAI();}finally{
  if(state.choiceDrafts?.[key]){state.drafts[key]=state.choiceDrafts[key];delete state.choiceDrafts[key];save();const current=document.getElementById('aiInput');if(current&&draftKey()===key)current.value=state.drafts[key];}
 }
}
actions.add('chooseAnswer');
const choiceGoto=goto;
goto=function(page){if(page==='courses')state.selected=null;return choiceGoto(page);};
if(!desktop)render();
