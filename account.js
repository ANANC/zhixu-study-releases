'use strict';
// A Youdao learning space is the account identity; its name is a display label.
// No account, credential or personal defaults are embedded in publishable assets.
let learningAccount={configured:false,displayName:'',connected:false,locked:false,encryptedKeys:false,profilesCount:0};
let learningAccountLoading=true;

function accountAIName(value){
  if(!value)return '尚未选择';
  if(typeof value==='object')return [value.name||value.id,value.model].filter(Boolean).join(' · ')||'尚未选择';
  const profile=(connection.aiProfiles||[]).find(item=>item.id===value);
  return profile?[profile.name,profile.model].filter(Boolean).join(' · '):String(value);
}
function accountStatusText(){
  const account=learningAccount;
  if(learningAccountLoading)return '正在读取账号配置…';
  if(!account.connected)return '请先授权有道并连接原学习目录';
  if(!account.configured)return '学习空间已连接，尚未保存账号默认配置';
  if(account.encryptedKeys)return account.locked?'账号默认配置已保存 · AI 密钥待解锁':'账号默认配置已保存 · AI 密钥已解锁到此设备';
  return '账号默认配置已保存 · 尚未启用 AI 密钥加密同步';
}
function accountButton(label,action,kind=''){
  return btn(label,action,kind).replace('<button ',`<button ${busy||learningAccountLoading?'disabled ':''}`);
}
function accountCard(){
  const account=learningAccount,connected=!!account.connected,disabled=busy||learningAccountLoading?'disabled':'',needPassword=!account.encryptedKeys||account.locked;
  const profileCount=Math.max(0,Number(account.profilesCount)||0);
  const title=account.displayName?'学习账号 · '+account.displayName:'学习账号与默认配置';
  const passwordLabel=account.encryptedKeys?(account.locked?'配置密码（解锁账号 AI 密钥）':'配置密码（此设备已解锁，可留空）'):'配置密码（首次加密同步需设置 8–200 位）';
  const recovery=account.encryptedKeys&&account.locked?'解锁并恢复账号默认':'从账号恢复默认配置';
  return `<section class="card" id="learning-account" style="grid-column:1/-1"><h3>${esc(title)}</h3><p class="sub">通过有道授权连接同一学习空间，就能在电脑和网页使用同一账号。账号名用于识别这个空间。</p><div class="notice space"><strong id="learning-account-status">${esc(accountStatusText())}</strong>${account.configured?`<p class="sub space">${profileCount} 个在线 AI 服务 · 默认 ${esc(accountAIName(account.defaultOnlineAI))}</p>`:''}${account.error?`<p class="sync-error space">${esc(account.error)}</p>`:''}</div>${!connected?`<p class="sub space">新设备先导入电脑导出的设备授权，或填写有道授权并选择原学习目录。连接后再恢复账号默认配置；仅输入账号名不能访问学习数据。</p><div class="actions space">${typeof webAuthorizationModal==='function'?accountButton('导入电脑的设备授权','webAuthorizationModal()'):''}${accountButton('连接已有学习账号','connectLearningSpace()','primary')}</div>`:''}<div class="field"><label for="account-name">账号名</label><input id="account-name" class="input" maxlength="40" value="${esc(account.displayName||'')}" placeholder="账号名" autocomplete="off" ${disabled}></div><div class="field"><label for="account-password">${esc(passwordLabel)}</label><input id="account-password" type="password" class="input" minlength="8" maxlength="200" autocomplete="${account.encryptedKeys?'current-password':'new-password'}" placeholder="${needPassword?'输入配置密码':'留空使用此设备已解锁的配置'}" ${disabled}></div><label class="sub"><input id="account-include-keys" type="checkbox" checked ${disabled}> 将在线 AI 密钥加密保存到账号</label><p class="tiny space">AI 服务、所选模型和学习偏好一起保存到有道。AI 密钥使用配置密码加密；新设备授权同一学习空间后，输入配置密码恢复。Codex 登录仍由各台电脑管理。</p><p class="tiny space">先保存 AI 服务与学习偏好，再保存为账号默认。更换默认配置后，在其他设备点击“从账号恢复默认配置”。</p><div class="actions space">${accountButton('保存当前设置为账号默认','saveAccountDefaultsUI()','primary')}${account.configured?accountButton(recovery,'restoreAccountDefaultsUI()'):''}</div></section>`;
}

const beforeAccountSettings=settingsPage;
settingsPage=function(){
  let html=beforeAccountSettings();
  // The mobile page replaces the desktop settings function before this module loads.
  // Keep the shared account card ahead of both devices' connection settings.
  const first=html.indexOf('<section class="card">');
  html=first<0?html+accountCard():html.slice(0,first)+accountCard()+html.slice(first);
  return html.replace('AI 授权信息只保存在此设备的加密存储中；浏览器直接请求你选择的服务。','AI 授权保存在此设备的加密存储中；启用上方账号同步后，也会用配置密码加密保存到有道。浏览器直接请求你选择的服务。');
};

function clearAccountPassword(){const field=document.getElementById('account-password');if(field)field.value='';}
const beforeAccountTask=task;
task=async function(fn){clearAccountPassword();return beforeAccountTask(fn);};
async function readAccountStatus(){
  if(!desktop?.accountStatus)return;
  learningAccount=await desktop.accountStatus();learningAccountLoading=false;
  const status=document.getElementById('learning-account-status');if(status)status.textContent=accountStatusText();
}
const beforeAccountRefresh=refreshConnections;
refreshConnections=async function(){await beforeAccountRefresh();await readAccountStatus();};
async function applyAccountResult(result){
  if(result?.config)connection=result.config;
  if(result?.cloud)workspaceCloud=result.cloud;
  if(result?.workspace){hydrate(result.workspace);original.save();await persist();}
  await refreshConnections();
  if(result?.account)learningAccount=result.account;
  if(typeof refreshCloudLabel==='function')refreshCloudLabel();
  if(workspaceCloud.phase==='conflict')cloudConflictModal();
}
async function accountTask(fn,replacing=false){
  if(busy)return toast('请等待当前任务完成');
  clearAccountPassword();busy=true;cloudChanging=replacing;window.studyDataReplacing=replacing;render();
  try{return await fn();}catch(error){showError(error);}finally{busy=false;cloudChanging=false;window.studyDataReplacing=false;render();clearAccountPassword();}
}
function accountPasswordInput(){return document.getElementById('account-password')?.value||'';}
function validAccountPassword(password){return !password||(password.length>=8&&password.length<=200);}
async function saveAccountDefaultsUI(){
  if(busy)return toast('请等待当前任务完成');
  requireDesktop();
  if(!desktop.saveAccountDefaults)return toast('账号配置功能未加载，请更新应用');
  const displayName=document.getElementById('account-name')?.value.trim()||'',password=accountPasswordInput(),includeKeys=document.getElementById('account-include-keys')?.checked!==false;
  if(!displayName||displayName.length>40)return toast('请输入 1–40 个字符的账号名');
  if(!learningAccount.connected)return toast('请先连接原有道学习空间');
  if(!validAccountPassword(password))return toast('配置密码需要 8–200 个字符');
  if(includeKeys&&(!learningAccount.encryptedKeys||learningAccount.locked)&&!password)return toast('请输入配置密码，用于加密保存或解锁 AI 密钥');
  await accountTask(async()=>{
    rememberDraft();pauseActive();await persist();
    await applyAccountResult(await desktop.saveAccountDefaults({displayName,...(password?{password}:{}),includeKeys}));
    if(workspaceCloud.phase==='synced'&&!learningAccount.error)toast(learningAccount.encryptedKeys?'账号默认配置与加密 AI 密钥已保存到有道':'账号默认配置已保存到有道');else toast(workspaceCloud.phase==='conflict'?'账号配置已保留，请先选择云端学习版本':'账号配置已保留，请检查同步状态');
  },true);
}
async function restoreAccountDefaultsUI(){
  if(busy)return toast('请等待当前任务完成');
  requireDesktop();
  if(!desktop.restoreAccountDefaults)return toast('账号配置功能未加载，请更新应用');
  if(!learningAccount.connected)return toast('请先授权有道并连接原学习目录');
  const password=accountPasswordInput();
  if(!validAccountPassword(password))return toast('配置密码需要 8–200 个字符');
  if(learningAccount.encryptedKeys&&learningAccount.locked&&!password)return toast('请输入配置密码，解锁账号保存的 AI 密钥');
  await accountTask(async()=>{
    rememberDraft();pauseActive();await persist();
    await applyAccountResult(await desktop.restoreAccountDefaults({...(password?{password}:{}),unlock:true}));
    if(workspaceCloud.phase==='conflict')toast('请先选择要恢复的学习版本');else if(learningAccount.error)toast(learningAccount.error);else if(learningAccount.encryptedKeys&&learningAccount.locked)toast('账号默认配置已恢复，AI 密钥等待解锁');else toast(learningAccount.encryptedKeys?'账号默认配置已恢复，AI 密钥已解锁到此设备':'账号默认配置已恢复');
  },true);
}
['saveAccountDefaultsUI','restoreAccountDefaultsUI'].forEach(name=>actions.add(name));
if(desktop?.accountStatus)readAccountStatus().then(()=>{if(booted&&state.page==='settings'&&!busy&&!document.activeElement?.matches('input,textarea,select'))render();}).catch(error=>{learningAccountLoading=false;learningAccount.error=error.message||'账号配置读取失败';if(booted&&state.page==='settings'&&!busy&&!document.activeElement?.matches('input,textarea,select'))render();});
else learningAccountLoading=false;
