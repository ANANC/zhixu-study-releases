'use strict';
// Browser presentation uses the same learning state and one composer as desktop.
// Authorization is device-local; the Youdao learning directory identifies data.
const webMobileQuery=window.matchMedia('(max-width:720px)');
let webRegistration=null,webInstallPrompt=null,webUpdateReady=false,webReloadRequested=false,webHadController=!!navigator.serviceWorker?.controller;
let webViewportFrame=0,webMaterialView=new Map();

// The browser adapter owns IndexedDB persistence and encrypted credentials.
// Do not retain the prototype's extra localStorage workspace copy alongside it.
original.save=function(){};
try{localStorage.removeItem('zhixu-study-v2');}catch{}
requireDesktop=function(){if(!desktop)throw Error('网页服务未加载，请刷新页面后重试');};
task=async function(fn){
  if(busy)return toast('已有请求正在处理，可以取消后重试');
  // Preserve ordinary edited settings, but never repopulate a password field
  // after authorization has been saved or cleared.
  const fields=state.page==='settings'?[...document.querySelectorAll('#workspace input:not([type=password]),#workspace select')].map(e=>({id:e.id,value:e.value,checked:e.checked})):[];
  const restore=()=>{if(state.page==='settings')for(const v of fields){const e=document.getElementById(v.id);if(e){e.value=v.value;if(e.type==='checkbox')e.checked=v.checked;}}};
  busy=true;render();restore();try{return await fn();}catch(e){showError(e);}finally{busy=false;render();restore();}
};

const webProfileList=allProfiles;
allProfiles=function(){
  const list=webProfileList().filter(p=>p.provider!=='codex');
  return list.length?list:[{id:'deepseek',name:'DeepSeek',provider:'api',baseUrl:'https://api.deepseek.com',model:'',models:[]}];
};
function webEditingProfile(){return allProfiles().find(p=>p.id===editProfileId)||allProfiles().find(p=>p.id===connection.activeAI)||allProfiles()[0];}
editingProfile=webEditingProfile;
aiLabel=function(){const p=allProfiles().find(p=>p.id===connection.activeAI);return p?p.name+' · '+(p.model||'请选择模型'):'AI 尚未授权';};

function webCloudLabel(){
  if(workspaceCloud.phase==='synced')return '有道已保存 · '+cloudTime(workspaceCloud.lastSyncedAt);
  if(workspaceCloud.phase==='conflict')return '学习版本需要选择';
  if(!navigator.onLine)return workspaceCloud.connected?'离线 · 更改待同步':'离线 · 本设备保存';
  return {unbound:'学习空间未连接',pending:'有道待保存',syncing:'正在保存到有道',error:'有道待重试'}[workspaceCloud.phase]||'学习空间未连接';
}
workspaceCloudLabel=function(){
  if(workspaceCloud.phase==='synced')return '有道已保存 · '+cloudTime(workspaceCloud.lastSyncedAt);
  if(workspaceCloud.phase==='conflict')return '有道与本设备版本待选择';
  if(!navigator.onLine)return workspaceCloud.connected?'当前离线 · 修改已保留在此设备，联网后同步':'当前离线 · 学习草稿保留在此设备';
  return {unbound:'有道学习空间未连接',pending:workspaceCloud.error?'云端待重试 · 此设备已保留':'修改已保留，等待保存到有道',syncing:'正在保存到有道',error:'有道连接失败 · 此设备已保留'}[workspaceCloud.phase]||'有道学习空间未连接';
};
const webOriginalDiskLabel=updateDiskLabel;
updateDiskLabel=function(){webOriginalDiskLabel();const n=document.getElementById('disk-state');if(n)n.textContent=diskState.replace(/此电脑/g,'此设备').replace(/本机/g,'此设备');};
const webOriginalRefreshCloud=refreshCloudLabel;
refreshCloudLabel=function(){webOriginalRefreshCloud();webRefreshStatus();};
function webRefreshStatus(){
  const chip=document.getElementById('web-cloud-summary');
  if(chip){chip.textContent=webCloudLabel();chip.className='web-cloud-summary '+workspaceCloud.phase;chip.setAttribute('aria-label','学习数据同步状态：'+workspaceCloudLabel());}
  const net=document.getElementById('web-network-state');
  if(net)net.innerHTML=`<span class="web-state-dot ${navigator.onLine?'':'offline'}"></span>${navigator.onLine?'网络可用':'当前离线'} · ${esc(webCloudLabel())}`;
}

function webAISettings(){
  const p=webEditingProfile(),models=p.models||[],missing=p.model&&!models.some(m=>m.id===p.model);
  return panel('AI 服务',`<p class="sub">选择在线 AI 服务。每项服务单独授权，模型从该服务获取后选择。</p><div class="field"><label for="profile-id">管理服务</label><select id="profile-id" class="input" data-change="editAIProfile(this.value)">${allProfiles().map(x=>`<option value="${esc(x.id)}" ${x.id===p.id?'selected':''}>${esc(x.name)}${x.id===connection.activeAI?'（正在使用）':''}</option>`).join('')}</select></div><div class="field"><label for="profile-name">服务名称</label><input id="profile-name" class="input" maxlength="40" value="${esc(p.name)}" autocomplete="off"></div><div class="field"><label for="profile-url">服务接口地址</label><input id="profile-url" type="url" inputmode="url" class="input" value="${esc(p.baseUrl||'')}" placeholder="https://api.deepseek.com" autocomplete="off" autocapitalize="none" spellcheck="false"><p class="tiny">使用服务提供的 HTTPS 基础地址。网页需要该服务允许浏览器访问。</p></div><div class="field"><label for="profile-key">API Key（${p.hasKey?'此设备已保存，留空保留':'此设备尚未授权'}）</label><input id="profile-key" type="password" class="input" autocomplete="off" autocapitalize="none" spellcheck="false"></div><label class="sub"><input id="profile-json" type="checkbox" ${p.jsonMode!==false?'checked':''}> 服务支持 JSON 模式</label><div class="field"><label for="profile-model">模型</label><select id="profile-model" class="input" ${!models.length&&!missing?'disabled':''}>${!models.length&&!missing?'<option value="">先获取模型列表</option>':''}${missing?`<option value="${esc(p.model)}" selected>${esc(p.model)}（刷新列表核对）</option>`:''}${models.map(m=>`<option value="${esc(m.id)}" ${p.model===m.id?'selected':''}>${esc(m.label||m.id)}${m.label&&m.label!==m.id?' · '+esc(m.id):''}</option>`).join('')}</select><p class="tiny">${p.modelsAt?'列表更新于 '+new Date(p.modelsAt).toLocaleString('zh-CN'):'获取此账号真实可用的模型后选择，不需要输入模型名称。'}</p></div><div class="actions space">${btn('保存并获取模型',"saveAIProfileForm('models')",'primary')}${btn('保存设置',"saveAIProfileForm('save')")}${p.id!==connection.activeAI?btn('使用这个服务',`selectAIProfile('${p.id}')`):badge('正在使用','green')}${btn('添加 AI 服务','newAIProfileModal()','small')}${p.hasKey?btn('清除该服务密钥',`clearProfileKey('${p.id}')`,'small'):''}</div><p class="web-auth-note">AI 授权信息只保存在此设备的加密存储中；浏览器直接请求你选择的服务。调用使用该服务账号的额度。</p>`);
}
function webDataSettings(){
  const y=connection.youdao||{},c=workspaceCloud;
  return panel('有道账号与学习空间',`<p class="sub">用同一有道账号授权，选择电脑上的「${esc(y.folderName||'Z-知序')}」学习目录，即可继续已有课程与对话。</p><div class="notice space"><strong id="cloud-status-detail">${esc(workspaceCloudLabel())}</strong><div class="sub space">${c.connected?'已连接：'+esc(c.folderName||y.folderName||'有道学习目录'):'目标目录：'+esc(y.folderName||'尚未选择')}</div>${c.spaceId?`<div class="tiny space">学习空间 ${esc(c.spaceId)}</div>`:''}</div><div class="field"><label for="youdao-key">有道 API Key（${connection.hasYoudaoKey?'此设备已保存，留空保留':'此设备尚未授权'}）</label><input id="youdao-key" type="password" class="input" autocomplete="off" autocapitalize="none" spellcheck="false"></div><div class="field"><label for="youdao-folder">学习目录${y.folderName?' · '+esc(y.folderName):''}</label><input id="youdao-folder" class="input" value="${esc(y.folderId||'')}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="浏览有道目录后选择"><p class="tiny">目录 ID 可通过“浏览并选择目录”自动填写。</p></div><div class="actions space">${btn('保存此设备授权','saveConnections()')}${btn('浏览并选择目录','webBrowseCloud()')}${btn(c.connected?'重新核对学习空间':'连接并恢复学习空间','connectLearningSpace()','primary')}</div>${c.connected?`<div class="actions space">${btn('立即保存到有道','saveLearningCloud()')}${btn('获取有道最新数据','pullLearningCloud()')}${c.phase==='conflict'?btn('检查不同设备的版本','cloudConflictModal()','danger'):''}</div>`:''}${c.error?`<p class="sync-error space">${esc(c.error)}</p>`:''}<p class="sub space">计划、对话、诊断、错题、小闭环、作业和笔记保存在有道。此设备保留离线副本；云端状态以实际上传并回读核对为准。</p><label class="sub space"><input id="auto-sync" type="checkbox" ${y.autoSync?'checked':''}> 确认笔记后额外生成 Markdown 笔记</label><div class="actions space">${btn('获取有道 API Key',"external('https://mopen.163.com/#/dashboard')",'small')}${connection.hasYoudaoKey?btn('清除此设备有道授权',"clearCredential('youdao')",'small'):''}</div><p class="web-auth-note">有道目录是跨设备的学习数据身份。切换账号或目录后需要重新连接；两份数据不同会先展示版本，让你选择。</p>`);
}
settingsPage=function(){
  const standalone=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;
  return `<div class="section">${head('设置与此设备授权','手机和电脑连接同一有道学习空间。网页版可在电脑关机后继续使用。')}<div class="web-state" id="web-network-state"><span class="web-state-dot ${navigator.onLine?'':'offline'}"></span>${navigator.onLine?'网络可用':'当前离线'} · ${esc(webCloudLabel())}</div>${panel('在手机继续已有学习',`<ol class="web-authorize-steps"><li>从电脑导出设备授权文件，再在此导入；也可以分别填写有道与 AI 的授权。</li><li>选择同一有道账号下的学习目录，点击“连接并恢复学习空间”。</li><li>看见“有道已保存”后，手机与电脑就能通过这个空间接续学习。</li></ol><div class="actions">${btn('导入电脑的设备授权','webAuthorizationModal()','primary')}${btn('如何添加到 iPhone 主屏幕','webInstallHelp()')}</div><p class="web-auth-note">授权文件使用导出时设置的密码解密。AI 与有道密钥不在网页源码或 GitHub 中，此设备的授权经浏览器密钥加密保存。使用公共设备时，请在离开前清除此设备的数据。</p>`)}${webDataSettings()}${webAISettings()}<div class="grid2">${panel('学习偏好',`<div class="field"><label for="style">讲解方式</label><select id="style" class="input">${['先举例，再讲原理','先问再讲'].map(v=>`<option ${state.settings.style===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label for="review-limit">每日复习预算（分钟）</label><input id="review-limit" type="number" inputmode="numeric" min="5" max="60" class="input" value="${state.settings.reviewLimit}"></div>${btn('保存偏好','saveSettings()','primary space')}`)}${panel('网页安装与更新',`<p class="sub">${standalone?'已在独立网页窗口中使用。':'可以通过 Safari 分享菜单添加到主屏幕，下次像 App 一样打开。'}</p><div class="actions space">${btn(standalone?'查看使用说明':'添加到主屏幕','webInstallHelp()')}${webUpdateReady?btn('保存并更新网页','applyWebUpdate()','primary'):btn('检查网页更新','checkWebUpdate()')}</div><p class="web-version">网页版 ${esc(appVersion)} · ${webUpdateReady?'新版本已准备，更新前会保存草稿。':'更新就绪时会提示，学习任务期间不强制重载。'}</p>`)}${panel('学习数据备份',`<p class="sub">主要学习数据保存在有道，也可导出完整备份。学习备份不包含任何 API Key。</p><div class="actions space">${btn('导出此设备学习备份','exportData()')}${btn('从文件恢复','importLocal()')}${btn('查看恢复前本设备备份','webLocalBackups()')}${cOnlineConnected()?btn('保留额外云端快照','uploadSnapshot()')+btn('查看云端历史快照','restoreCloud()'):''}</div>`)}${panel('此设备数据',`<p class="sub">清理此设备的学习副本与授权信息，有道学习空间中的数据会保留。之后需要再次授权并恢复。</p>${btn('清除此设备授权与离线副本','webClearDeviceModal()','danger space')}`)}</div></div>`;
};
async function webLocalBackups(){await task(async()=>{const rows=await desktop.localBackupList();openModal('恢复前本设备备份',rows.map(x=>`<div class="item"><div class="grow"><strong>${esc(new Date(x.at).toLocaleString('zh-CN'))}</strong><div class="tiny">${x.counts.sessions}个会话 · ${x.counts.notes}篇笔记 · ${x.counts.reading}项语境词汇</div></div>${btn('预览恢复',`previewWebLocalBackup('${x.id}')`,'small')}</div>`).join('')||'<p>尚无恢复前备份。恢复有道或文件数据时会保留最近5份。</p>');});}
async function previewWebLocalBackup(id){await task(async()=>restorePreview(await desktop.localBackupPreview(id)));}
function cOnlineConnected(){return !!workspaceCloud.connected;}

saveConnections=async function(){
  try{
    requireDesktop();
    const config={youdao:{...connection.youdao,folderId:document.getElementById('youdao-folder')?.value.trim()||connection.youdao?.folderId||'',autoSync:document.getElementById('auto-sync')?.checked??connection.youdao?.autoSync??false}};
    const key=document.getElementById('youdao-key')?.value;
    if(key)config.youdaoKey=key;
    connection=await desktop.saveConfig(config);
    const field=document.getElementById('youdao-key');if(field)field.value='';
    workspaceCloud=await desktop.cloudStatus();render();toast('此设备的有道授权已保存');return true;
  }catch(e){showError(e);return false;}
};
importLocal=async function(){if(busy)return toast('请等当前请求完成');const file=await desktop.chooseBackupFile();if(!file)return;await cloudTask(async()=>{rememberDraft();pauseActive();await persist();restorePreview(await desktop.importPreview(file));},true);};
async function webBrowseCloud(){if(!await saveConnections())return;await browseCloud();}
newAIProfileModal=function(){openModal('添加在线 AI 服务',`<p class="sub">支持提供模型列表的 OpenAI 兼容 HTTPS 服务。保存服务地址与授权后，获取真实可用的模型列表。</p><div class="field"><label for="new-profile-name">服务名称</label><input id="new-profile-name" class="input" placeholder="例如：另一项在线 AI" maxlength="40" autocomplete="off"></div>${btn('添加配置','createAIProfile()','primary space')}`);};
function webAuthorizationModal(){openModal('导入电脑的设备授权',`<p>选择电脑导出的 <strong>.zhixu-connect.json</strong> 文件，输入导出时设置的密码。</p><p class="sub space">可以通过 AirDrop、文件或你自己的网盘转到 iPhone。授权只会保存到此设备；学习数据仍从有道学习空间恢复。</p><div class="field"><label for="device-password">授权文件密码</label><input id="device-password" type="password" class="input" autocomplete="off"></div><div class="actions space">${btn('选择文件并导入','importDeviceAuthorization()','primary')}${btn('取消','closeModal()')}</div>`);}
async function importDeviceAuthorization(){
  const password=document.getElementById('device-password')?.value||'';
  if(password.length<8)return toast('请输入电脑导出时设置的授权密码（至少 8 位）');
  // Open the iOS Files picker within the original tap, before IndexedDB awaits.
  if(!desktop?.chooseAuthorizationFile)return toast('设备授权导入功能未加载，请刷新后重试');
  const selection=desktop.chooseAuthorizationFile();
  const file=await selection;if(!file)return;
  await cloudTask(async()=>{
    rememberDraft();pauseActive();await persist();
    const result=await desktop.importDeviceAuthorization(password,file);if(!result)return;
    connection=result.config;closeModal();await updateCloudResult(result);render('top');
    toast(workspaceCloud.phase==='conflict'?'授权已导入，请检查学习数据版本':workspaceCloud.phase==='synced'?'此设备授权已导入，学习空间已连接':'授权已保存到此设备，有道连接待重试');
  },true);
  const field=document.getElementById('device-password');if(field)field.value='';
}
function webInstallHelp(){
  if(webInstallPrompt){webRequestInstall();return;}
  openModal('添加到 iPhone 主屏幕',`<p>在 iPhone 的 <strong>Safari</strong> 中打开知序学习。</p><ol class="web-install-steps"><li>点击 Safari 的“分享”按钮。</li><li>选择“添加到主屏幕”。</li><li>如果有“作为网页 App 打开”选项，保持开启，再点击“添加”。</li></ol><p class="sub">之后从主屏幕的知序图标打开。电脑关机也可以学习；AI 和有道同步需要网络，已缓存的课程与草稿可离线使用。</p><div class="actions space">${btn('知道了','closeModal()','primary')}${btn('查看 Apple 官方说明',"external('https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios')")}</div>`);
}
async function webRequestInstall(){try{await webInstallPrompt.prompt();await webInstallPrompt.userChoice;webInstallPrompt=null;}catch(e){showError(e);}}
function webClearDeviceModal(){
  if(!desktop?.clearDevice)return toast('此设备清理功能未加载，请刷新后重试');
  const pending=!workspaceCloud.connected||workspaceCloud.phase!=='synced';
  openModal('清除此设备数据',`<p>将移除此浏览器保存的学习副本与 AI、有道授权。<strong>有道云端的学习数据会保留。</strong></p>${pending?'<div class="notice amber space">当前云端尚未确认保存。请先保存到有道或导出学习备份，否则此设备尚未上传的修改会丢失。</div>':''}<div class="actions space">${pending?btn('先导出学习备份','exportData()'):''}${btn('确认清除此设备','webClearDevice()','danger')}${btn('取消','closeModal()')}</div>`);
}
async function webClearDevice(){if(busy)return toast('请等当前学习请求完成');await task(async()=>{pauseActive();clearTimeout(saveTimer);await writeChain.catch(()=>{});await desktop.clearDevice();try{localStorage.removeItem('zhixu-study-v2');}catch{}location.reload();});}

cloudConflictModal=function(){
  const c=workspaceCloud.conflict;if(!c)return toast('目前没有待选择的版本');
  openModal('检查学习数据版本',`<p>${esc(c.reason)}</p><div class="grid2 space"><div class="notice"><strong>此设备</strong><p>${cloudCount(c.local?.counts)}</p><p class="sub">${cloudTime(c.local?.at)}</p></div><div class="notice"><strong>有道学习空间</strong><p>${cloudCount(c.remote?.counts)}</p><p class="sub">${cloudTime(c.remote?.at)}</p></div></div>${c.preview?.changedNotes?.length?`<p class="space">笔记内容变化：${esc(c.preview.changedNotes.join('、'))}</p>`:''}<p class="sub space">计划、对话、课程与作业作为完整版本一起恢复。选择前保留当前版本备份；采用此设备版本时，有道原版本也会备份。</p><div class="actions space">${c.remoteHash?btn('采用有道版本到此设备',"resolveLearningCloud('remote')",'primary'):''}${btn('采用此设备版本到有道',"resolveLearningCloud('local')")}${btn('稍后处理','closeModal()')}</div>`);
};

const webOriginalToday=todayPage;
todayPage=function(){
  const body=webOriginalToday();if(connection.hasYoudaoKey||ses(state.active))return body;
  return `<div class="notice web-onboarding"><div class="grow"><strong>把电脑上的学习接到手机</strong><p class="sub">授权并连接同一有道目录，继续已有进度、作业与对话。</p></div><div class="actions">${btn('导入电脑授权','webAuthorizationModal()','small')}${btn('手动配置',"goto('settings')",'small')}</div></div>`+body;
};
const webOriginalSummary=summaryPage;
summaryPage=function(){return webOriginalSummary().replace(/这台电脑/g,'此设备').replace(/确认后保存到此设备，笔记状态为“尚未云同步”。可以导出 Markdown 检查。/g,'确认后保存到此设备并排入有道同步。云端保存结果可在页面上方查看，也可以导出 Markdown。');};

function webFoldMaterial(){
  if(!webMobileQuery.matches)return;
  const material=document.querySelector('.task>.task-material');
  if(!material||material.textContent.length<650||material.parentElement.classList.contains('web-material-fold'))return;
  const key=String(state.selected||state.page)+'|'+material.textContent.slice(0,100),wrap=document.createElement('details'),summary=document.createElement('summary');
  wrap.className='web-material-fold';wrap.open=webMaterialView.get(key)!==false;summary.textContent='阅读材料 · 点击展开或收起';
  material.replaceWith(wrap);wrap.append(summary,material);wrap.addEventListener('toggle',()=>webMaterialView.set(key,wrap.open));
  if(webMaterialView.size>30)webMaterialView.delete(webMaterialView.keys().next().value);
}
const webOriginalRender=render;
render=function(where){
  webOriginalRender(where);
  const controls=document.querySelector('.topcontrols');
  if(controls){const chip=document.createElement('button');chip.type='button';chip.id='web-cloud-summary';chip.dataset.action="goto('settings')";chip.className='web-cloud-summary';controls.appendChild(chip);controls.querySelector('.quick-ai')?.setAttribute('aria-label','当前 AI 服务');}
  const footer=document.querySelector('.sidefoot');
  if(footer){const version=footer.querySelector('.tiny');if(version)version.textContent='知序网页版 '+appVersion;const status=footer.querySelector('.service-state');if(status)status.textContent=aiLabel();}
  updateDiskLabel();webRefreshStatus();
  const input=document.getElementById('aiInput');if(input){input.setAttribute('enterkeyhint','enter');input.setAttribute('autocapitalize','sentences');input.setAttribute('spellcheck','true');if(webMobileQuery.matches)input.placeholder=input.placeholder.replace(/；Enter 提交，Shift\+Enter 换行/g,'');}
  const hint=document.querySelector('.composefoot .tiny');
  if(webMobileQuery.matches&&hint&&!busy){
    if(state.page==='assignment'){const attach=hint.querySelector('.attachments');hint.textContent='';if(attach)hint.append(attach);hint.append(document.createTextNode(state.attachmentName?' · '+state.attachmentName:' · 点击提交作业'));}
    else if(state.page==='lesson')hint.textContent=ses()?.stage==='acceptance'?'当前任务 · 独立验收':'当前课程 · 对话与提交';
    else if(state.page==='courses'&&typeof adaptiveData==='function'&&adaptiveData().view==='diagnosis')hint.textContent='目标任务诊断 · 点击选项或提交依据';
    else hint.textContent='回车换行 · 点击发送';
  }
  document.querySelectorAll('[data-action="experimentModal()"],[data-action="installYoudao()"],[data-action="openDataFolder()"],[data-action="checkAppUpdate()"],[data-action="downloadAppUpdate()"],[data-action="installAppUpdate()"],[data-action="loginCodex()"],[data-action="useCodexAccount()"]').forEach(n=>{const parent=n.parentElement;n.remove();if(parent)for(const sub of parent.querySelectorAll('.tiny'))if(sub.textContent.includes('隔离运行'))sub.remove();});
  document.querySelectorAll("[data-action=\"clearCredential('youdao')\"]").forEach(n=>{n.textContent='退出此设备授权';n.dataset.action='webClearDeviceModal()';});
  if(state.page==='assignment'){const s=document.querySelector('#workspace>.actions');if(s&&!s.querySelector('.web-project-hint')){const p=document.createElement('span');p.className='tiny web-project-hint';p.textContent='代码项目可提交完整实现与实际运行日志；网页不会冒充本机运行。';s.appendChild(p);}}
  webFoldMaterial();webScheduleViewport();
};

function webScheduleViewport(){cancelAnimationFrame(webViewportFrame);webViewportFrame=requestAnimationFrame(()=>{
  const viewport=window.visualViewport,root=document.documentElement;
  if(viewport&&viewport.scale>1.05)return;
  const height=viewport?.height||window.innerHeight,offset=viewport?.offsetTop||0;
  root.style.setProperty('--web-viewport-height',Math.round(height)+'px');root.style.setProperty('--web-layout-height',Math.round(window.innerHeight)+'px');root.style.setProperty('--web-viewport-offset',Math.round(offset)+'px');
  const editing=document.activeElement?.matches('input:not([type=checkbox]),textarea,select'),keyboard=!!editing&&height<window.innerHeight-100;
  root.style.setProperty('--web-safe-bottom',keyboard?'0px':'env(safe-area-inset-bottom,0px)');root.classList.toggle('web-keyboard-open',keyboard);
});}
window.visualViewport?.addEventListener('resize',webScheduleViewport);
window.visualViewport?.addEventListener('scroll',webScheduleViewport);
window.addEventListener('resize',webScheduleViewport);
document.addEventListener('focusin',webScheduleViewport);
document.addEventListener('focusout',webScheduleViewport);
webMobileQuery.addEventListener?.('change',()=>render());

// iPhone return inserts a new line. A hardware keyboard can submit with Ctrl/⌘+Return.
document.addEventListener('keydown',event=>{
  if(event.target.id!=='aiInput'||event.key!=='Enter'||!webMobileQuery.matches)return;
  event.stopImmediatePropagation();
  if(event.isComposing)return;
  if(event.ctrlKey||event.metaKey){event.preventDefault();sendAI();}
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&booted&&!window.studyDataReplacing){rememberDraft();pauseActive();persist().catch(showError);}});
window.addEventListener('pagehide',()=>{if(booted&&!window.studyDataReplacing){rememberDraft();pauseActive();persist().catch(()=>{});}});
window.addEventListener('online',()=>{webRefreshStatus();if(booted)toast('网络已恢复，可继续 AI 对话与有道同步');});
window.addEventListener('offline',()=>{webRefreshStatus();toast('当前离线，学习草稿保留在此设备');});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();webInstallPrompt=event;});

function webOfferUpdate(){
  webUpdateReady=true;let banner=document.getElementById('web-update-banner');
  if(!banner){banner=document.createElement('aside');banner.id='web-update-banner';banner.className='web-update-banner';banner.setAttribute('role','status');banner.innerHTML='<div class="grow"><strong>知序网页有新版本</strong><div class="tiny">保存草稿后更新，学习数据会保留。</div></div><button type="button" class="btn primary" data-action="applyWebUpdate()">保存并更新</button><button type="button" class="btn" data-action="dismissWebUpdate()">稍后</button>';document.body.appendChild(banner);}banner.hidden=false;
}
function dismissWebUpdate(){const banner=document.getElementById('web-update-banner');if(banner)banner.hidden=true;}
async function checkWebUpdate(){try{if(!webRegistration)return toast('网页缓存服务尚未就绪；请使用 HTTPS 地址打开');await webRegistration.update();if(webRegistration.waiting)webOfferUpdate();else toast('已请求检查网页更新，新版本准备好后会提示');}catch(e){showError(Error('暂时无法检查网页更新，请联网后重试'));}}
async function applyWebUpdate(){
  if(busy||window.studyDataReplacing)return toast('请等当前学习请求完成，再保存并更新');
  try{rememberDraft();pauseActive();await persist();webReloadRequested=true;if(webRegistration?.waiting)webRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});else if(webUpdateReady)location.reload();else{webReloadRequested=false;await checkWebUpdate();}}
  catch(e){webReloadRequested=false;showError(e);}
}
if('serviceWorker' in navigator&&window.isSecureContext){
  navigator.serviceWorker.register('sw.js',{scope:'./'}).then(registration=>{
    webRegistration=registration;if(registration.waiting)webOfferUpdate();
    registration.addEventListener('updatefound',()=>{const installing=registration.installing;if(!installing)return;installing.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller)webOfferUpdate();});});
  }).catch(()=>{ /* Learning remains usable without installation or caching. */ });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{const prior=webHadController;webHadController=!!navigator.serviceWorker.controller;if(webReloadRequested&&!busy&&!window.studyDataReplacing)location.reload();else if(prior&&webHadController&&booted)webOfferUpdate();});
}
['webLocalBackups','previewWebLocalBackup','webBrowseCloud','webAuthorizationModal','importDeviceAuthorization','webInstallHelp','webClearDeviceModal','webClearDevice','checkWebUpdate','applyWebUpdate','dismissWebUpdate'].forEach(name=>actions.add(name));
if(desktop)desktop.onEvent(event=>{if(event.type==='workspace-cloud')webRefreshStatus();});
render();

if(desktop?.ready)desktop.ready.catch(error=>{const overlay=document.createElement('main');overlay.className='web-launch web-storage-blocked';overlay.setAttribute('role','alert');overlay.innerHTML='<h1>暂时无法打开学习空间</h1><p>'+esc(error.message||'请关闭其他知序页面后重试')+'</p><button type="button" class="btn primary">重新打开</button>';overlay.querySelector('button').onclick=()=>location.reload();document.body.appendChild(overlay);});
