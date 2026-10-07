/* OpenAI-compatible online providers. No desktop session tokens enter the web. */
(function () {
  'use strict';
  function baseURL(value) {
    let url; try { url = new URL(value); } catch { throw Error('请填写完整的 AI 接口基础地址'); }
    if (url.protocol !== 'https:') throw Error('网页版 AI 接口需要 HTTPS');
    if (url.username || url.password || url.search || url.hash) throw Error('接口地址不能包含账号、密钥或查询参数');
    return url.href.replace(/\/$/, '');
  }
  function parseJSON(text) {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(cleaned); } catch { throw Error('模型未返回有效 JSON，本次结果没有写入评分或课程'); }
  }
  async function responseJSON(response) {
    const reader=response.body?.getReader();
    if (!reader) { try { return await response.json(); } catch { throw Error('AI 服务返回的数据无法解析，请稍后重试'); } }
    const chunks=[]; let length=0;
    try {
      for (;;) {
        const part=await reader.read(); if (part.done) break;
        length+=part.value.byteLength;
        if (length>4000000) { await reader.cancel(); throw Error('AI 服务返回的内容过大；本次结果没有写入学习数据'); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const content=new Uint8Array(length); let offset=0;
    for (const part of chunks) { content.set(part,offset); offset+=part.byteLength; }
    try { return JSON.parse(new TextDecoder().decode(content)); } catch { throw Error('AI 服务返回的数据无法解析，请稍后重试'); }
  }
  function secretName(id) { if (!/^[\w-]{1,80}$/.test(id)) throw Error('AI 配置 ID 无效'); return 'aiKey:' + id; }
  async function keyFor(store, profile) {
    const name = secretName(profile.id);
    return store.data.secrets[name] ? store.secret(name) : profile.id === 'api-legacy' ? store.secret('aiKey') : '';
  }
  function activate(store, id) {
    const profile = store.data.config.aiProfiles.find(value => value.id === id);
    if (!profile) throw Error('AI 配置不存在');
    if (profile.provider !== 'api') throw Error('网页版使用在线 AI 服务；本机 Codex 账号请在桌面版使用');
    store.data.config.activeAI = id;
    store.data.config.ai = {...profile, codexModel: ''};
    return profile;
  }
  function normalize(store) {
    const config = store.data.config;
    if (!Array.isArray(config.aiProfiles)) config.aiProfiles = [];
    config.aiProfiles = config.aiProfiles.filter(profile => profile?.provider === 'api');
    if (!config.aiProfiles.some(profile => profile.id === 'deepseek')) config.aiProfiles.push({id: 'deepseek', name: 'DeepSeek', provider: 'api', baseUrl: 'https://api.deepseek.com', model: '', jsonMode: true, thinking: 'disabled', models: []});
    activate(store, config.aiProfiles.some(profile => profile.id === config.activeAI) ? config.activeAI : 'deepseek');
  }
  function validate(input) {
    if (!input || !/^[\w-]{1,80}$/.test(input.id) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 40 || input.provider !== 'api') throw Error('AI 配置格式无效');
    if (typeof input.model !== 'string' || input.model.length > 200) throw Error('模型配置无效');
    if (input.baseUrl) baseURL(input.baseUrl);
    return {id: input.id, name: input.name.trim(), provider: 'api', baseUrl: String(input.baseUrl || '').trim(), model: input.model.trim(), codexModel: '', jsonMode: input.jsonMode !== false, ...(input.id === 'deepseek' ? {thinking: 'disabled'} : {})};
  }
  async function save(store, input) {
    await store.init();
    const current = store.data.config.aiProfiles.find(profile => profile.id === input?.id);
    if (!current) throw Error('AI 配置不存在');
    const next = validate(input), changedURL = current.baseUrl !== next.baseUrl;
    if (changedURL && await keyFor(store,current) && !input.apiKey) throw Error('接口地址改变时请重新填写对应密钥，或新建配置');
    if (!changedURL && next.model && current.models?.length && !current.models.some(model => model.id === next.model)) throw Error('请从当前服务的模型列表中选择');
    if (input.apiKey) await store.setSecret(secretName(input.id),String(input.apiKey));
    Object.assign(current,next);
    if (changedURL) { current.models=[]; current.modelsAt=null; current.model=''; }
    if (current.id === store.data.config.activeAI) activate(store,current.id);
    await store.commit();
    return current;
  }
  function create(store, name) {
    const value = String(name || '新 AI 服务').trim().slice(0,40);
    if (!value) throw Error('请填写服务名称');
    const profile = {id: 'api-'+crypto.randomUUID(), name:value, provider:'api', baseUrl:'', model:'', jsonMode:true, models:[]};
    store.data.config.aiProfiles.push(profile);
    return profile;
  }
  async function models(store, profile) {
    await store.init();
    if (profile?.provider !== 'api') throw Error('请在桌面版获取 Codex 模型；网页版使用在线服务');
    if (!profile.baseUrl) throw Error('请先保存接口地址和密钥，再获取模型');
    const key = await keyFor(store,profile), controller = new AbortController(), timer = setTimeout(()=>controller.abort(),30000);
    let catalog;
    try {
      const response = await fetch(baseURL(profile.baseUrl)+'/models',{redirect:'error',signal:controller.signal,headers:key?{Authorization:'Bearer '+key}:{}});
      if (!response.ok) throw Error('模型列表读取失败（HTTP '+response.status+'），请检查密钥与服务权限');
      const result = await responseJSON(response);
      if (!Array.isArray(result.data)) throw Error('服务没有返回可用的模型列表');
      catalog = [...new Map(result.data.filter(value=>typeof value.id==='string'&&value.id.length<=200).map(value=>[value.id,{id:value.id,label:value.id}])).values()].slice(0,200);
      if (!catalog.length) throw Error('账号没有可用模型');
    } catch (error) {
      if (error.name === 'AbortError') throw Error('模型列表请求超时，请稍后重试');
      if (error instanceof TypeError) throw Error('无法连接此 AI 服务；请检查网络和接口地址，服务需要允许浏览器跨域访问');
      throw error;
    } finally { clearTimeout(timer); }
    profile.models = catalog; profile.modelsAt = Date.now();
    if (!profile.model || !catalog.some(model=>model.id===profile.model)) profile.model=(catalog.find(model=>model.id==='deepseek-flash')||catalog.find(model=>model.id==='deepseek-chat')||catalog[0]).id;
    if (store.data.config.activeAI === profile.id) activate(store,profile.id);
    await store.commit();
    return catalog;
  }
  async function clearKey(store,id) {
    await store.setSecret(secretName(id),'');
    if (id === 'api-legacy') await store.setSecret('aiKey','');
    await store.commit();
    return store.publicConfig();
  }
  class BrowserAI {
    constructor(store) { this.store=store; this.active=new Map(); }
    cancel(id) { this.active.get(id)?.abort(); }
    async request(input) {
      await this.store.init();
      const {id,messages,json=false}=input || {}, config={...this.store.data.config.ai};
      if (config.provider !== 'api') throw Error('网页版需要选择在线 AI 服务；Codex 账号在桌面版使用');
      if (!config.baseUrl || !config.model) throw Error('请先在设置中授权 AI 服务，并从列表选择模型');
      if (typeof id !== 'string' || !id || id.length > 200 || !Array.isArray(messages) || !messages.length || messages.length > 80) throw Error('对话上下文格式错误');
      if (this.active.has(id)) throw Error('此 AI 请求正在进行，请稍候或取消');
      const key = await keyFor(this.store,config);
      if (!key) throw Error('请先在设置中填写该服务的 API Key');
      const base = baseURL(config.baseUrl), controller=new AbortController();
      this.active.set(id,controller);
      const timer=setTimeout(()=>controller.abort(),120000);
      try {
        const response=await fetch(base+'/chat/completions',{
          method:'POST',redirect:'error',signal:controller.signal,
          headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
          body:JSON.stringify({model:config.model,...(config.thinking?{thinking:{type:config.thinking}}:{}),messages:messages.map(message=>({role:['system','user','assistant'].includes(message.role)?message.role:'user',content:String(message.content).slice(0,100000)})),...(json&&config.jsonMode?{response_format:{type:'json_object'}}:{})})
        });
        if (!response.ok) throw Error(response.status===401?'AI 认证失败，请检查密钥':response.status===429?'AI 服务限流或余额不足，请稍后重试':'AI 服务请求失败（HTTP '+response.status+'）');
        const result=await responseJSON(response), text=result.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) throw Error('AI 服务没有返回可用内容');
        return {text:json?parseJSON(text):text,model:(config.name?config.name+' / ':'')+(result.model||config.model),usage:result.usage||null};
      } catch (error) {
        if (error.name==='AbortError') throw Error('请求已取消或超过两分钟；原草稿保留，可重试');
        if (error instanceof TypeError) throw Error('无法连接 AI 服务；请检查网络，服务需要允许浏览器跨域访问');
        throw error;
      } finally { clearTimeout(timer); this.active.delete(id); }
    }
    models(profile) { return models(this.store,profile); }
  }
  window.WebProfiles={normalize,activate,secretName,keyFor,validate,save,create,models,clearKey};
  window.BrowserAI=BrowserAI;
  window.WebAIHelpers={baseURL,parseJSON};
})();
