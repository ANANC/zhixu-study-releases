(function(global){
  'use strict';

  // Uses the same authorized official service as the desktop CLI. Credentials
  // belong to this browser's store and are sent only in request headers.
  const SERVER='https://open.mail.163.com/api/ynote/mcp/sse';
  const SERVER_ORIGIN=new URL(SERVER).origin;
  const MAX_BYTES=12*1024*1024;
  const READ_TIMEOUT=30000,WRITE_TIMEOUT=60000;
  function identifier(value,label='有道笔记 ID'){
    if(typeof value!=='string'||!/^[-\w]{1,200}$/.test(value))throw Error(label+'无效');
    return value;
  }
  function failure(message,retryable=false,uncertain=false){
    const error=Error(message);error.retryable=retryable;error.uncertain=uncertain;return error;
  }
  function httpFailure(status,write=false){
    if(status===401||status===403)return failure('有道账号授权暂不可用，请重新填写有道授权密钥。');
    if(status===429)return failure('有道请求较频繁，请稍后再试；学习内容仍保留在本机。',true,write);
    if(status===404)return failure('有道连接已失效，请重试；如果笔记已移动，请重新选择学习目录。',true,write);
    if(status>=500)return failure('有道服务暂时不可用，学习内容仍保留在本机。',true,write);
    return failure('有道请求未完成（HTTP '+status+'），学习内容仍保留在本机。',false,write);
  }
  function parsedResult(raw){
    if(raw?.isError)throw failure('有道未接受这次操作，请检查授权、目录和笔记后重试。');
    const texts=(raw?.content||[]).filter(x=>x?.type==='text'&&typeof x.text==='string').map(x=>x.text);
    let data=raw?.structuredContent;
    if(typeof data==='string'){try{data=JSON.parse(data);}catch{data=null;}}
    if(!data||typeof data!=='object'){
      data=null;
      for(const value of texts){try{const decoded=JSON.parse(value);if(decoded&&typeof decoded==='object'){data=decoded;break;}}catch{}}
    }
    return {data,text:texts.join('\n')};
  }

  class MCPConnection{
    constructor(key){
      this.key=key;this.controller=new AbortController();this.pending=new Map();this.sequence=0;
      this.endpoint=null;this.ready=null;this.failed=false;this.closed=false;this.idleTimer=null;
    }
    close(){
      if(this.closed)return;this.closed=true;clearTimeout(this.idleTimer);this.controller.abort();
      this.fail(failure('有道连接已关闭，请重新连接。',true));
    }
    fail(error){
      this.failed=true;
      this.endpointReject?.(error);
      for(const waiting of this.pending.values()){
        clearTimeout(waiting.timer);
        waiting.reject(waiting.write?failure('有道保存连接中断，云端可能已收到；请回读核对，本机内容已保留。',!!error.retryable,true):error);
      }
      this.pending.clear();
    }
    keepAlive(){
      clearTimeout(this.idleTimer);
      // iOS may suspend the stream at any time. Do not retain an unused session.
      this.idleTimer=setTimeout(()=>this.pending.size?this.keepAlive():this.close(),45000);
    }
    async open(){
      if(this.ready)return this.ready;
      this.ready=this.initialize();return this.ready;
    }
    async initialize(){
      const endpointPromise=new Promise((resolve,reject)=>{this.endpointResolve=resolve;this.endpointReject=reject;});
      // Attach immediately: a failed GET can otherwise reject before awaiting it.
      endpointPromise.catch(()=>{});
      const timeout=setTimeout(()=>{this.fail(failure('有道连接超时，本机学习内容已保留，请稍后重试。',true));this.controller.abort();},READ_TIMEOUT);
      try{
        let response;
        try{response=await fetch(SERVER,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',headers:{'x-api-key':this.key,Accept:'text/event-stream'},signal:this.controller.signal});}
        catch{throw failure('无法连接有道，请检查网络或稍后重试；本机学习内容已保留。',true);}
        if(!response.ok)throw httpFailure(response.status);
        if(!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw failure('有道没有返回可用的同步连接，请稍后重试。',true);
        this.reader=response.body.getReader();
        this.pump().catch(error=>{if(!this.closed)this.fail(error);});
        await endpointPromise;
        const result=await this.rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'zhixu-study-web',version:global.StudyWebVersion||'1.0'}},false);
        if(!result||typeof result.protocolVersion!=='string')throw failure('有道连接初始化未完成，请重新连接。',true);
        await this.post({jsonrpc:'2.0',method:'notifications/initialized'},false);
        clearTimeout(timeout);this.keepAlive();return this;
      }catch(error){clearTimeout(timeout);this.fail(error);this.controller.abort();throw error;}
    }
    receive(block){
      let event='message';const values=[];
      for(const line of block.split(/\r?\n/)){
        if(line.startsWith(':'))continue;
        if(line.startsWith('event:'))event=line.slice(6).trim();
        if(line.startsWith('data:'))values.push(line.slice(5).replace(/^ /,''));
      }
      if(!values.length)return;
      const value=values.join('\n');
      if(event==='endpoint'){
        let endpoint;try{endpoint=new URL(value,SERVER);}catch{throw failure('有道返回的消息地址无效，已停止发送授权信息。');}
        if(endpoint.origin!==SERVER_ORIGIN||!endpoint.pathname.startsWith('/api/ynote/mcp/')||endpoint.username||endpoint.password||endpoint.hash)throw failure('有道消息地址不属于授权服务，已停止发送授权信息。');
        if(this.endpoint&&endpoint.href!==this.endpoint)throw failure('有道连接地址发生变化，请重新连接。',true);
        this.endpoint=endpoint.href;this.endpointResolve?.(this.endpoint);return;
      }
      if(event!=='message')return;
      let message;try{message=JSON.parse(value);}catch{throw failure('有道返回了无法解析的消息，本机内容已保留。',true);}
      const waiting=this.pending.get(message.id);
      if(!waiting)return;
      this.pending.delete(message.id);clearTimeout(waiting.timer);
      if(message.error)waiting.reject(failure('有道请求未完成，请检查授权或笔记状态后重试。',message.error.code===-32603,waiting.write));
      else waiting.resolve(message.result);
    }
    async pump(){
      const decoder=new TextDecoder();let buffer='';
      try{
        while(!this.closed){
          const chunk=await this.reader.read();
          if(chunk.done)throw failure('有道连接已中断，本机学习内容已保留，请重新连接。',true);
          buffer+=decoder.decode(chunk.value,{stream:true});
          if(buffer.length>MAX_BYTES)throw failure('有道单条响应超过读取上限，请先保留本机备份。');
          let match;
          while((match=/\r?\n\r?\n/.exec(buffer))){
            const block=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);this.receive(block);
          }
        }
      }catch(error){if(!this.closed)throw error.retryable!==undefined?error:failure('有道连接已中断，本机学习内容已保留，请重新连接。',true);}
    }
    async post(message,write){
      if(!this.endpoint||this.failed||this.closed)throw failure('有道连接已失效，请重新连接。',true,write);
      let response;
      try{
        response=await fetch(this.endpoint,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',headers:{'x-api-key':this.key,'Content-Type':'application/json'},body:JSON.stringify(message),signal:this.controller.signal});
      }catch{throw failure(write?'有道保存响应未确认，云端可能已收到；请稍后回读核对，本机内容已保留。':'有道请求连接中断，请稍后重试；本机内容已保留。',true,write);}
      if(!response.ok)throw httpFailure(response.status,write);
      // Legacy SSE returns 202. Responses are matched on the open GET stream.
      this.keepAlive();
    }
    async rpc(method,params,write=false){
      if(this.failed||this.closed)throw failure('有道连接已失效，请重新连接。',true);
      const id=++this.sequence;
      const result=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{
          this.pending.delete(id);
          reject(failure(write?'有道保存响应超时，云端可能已收到；请回读核对，本机内容已保留。':'有道读取超时，本机内容已保留，请稍后重试。',true,write));
          this.failed=true;this.controller.abort();
        },write?WRITE_TIMEOUT:READ_TIMEOUT);
        this.pending.set(id,{resolve,reject,timer,write});
      });
      // Handle both the POST transport and its eventual SSE result immediately.
      return Promise.all([this.post({jsonrpc:'2.0',id,method,params},write),result]).then(([,value])=>value).catch(error=>{
        const waiting=this.pending.get(id);if(waiting){clearTimeout(waiting.timer);this.pending.delete(id);waiting.reject(error);}
        if(error.retryable){this.failed=true;this.controller.abort();}
        throw error;
      });
    }
    async tool(name,args,write=false){
      await this.open();
      return parsedResult(await this.rpc('tools/call',{name,arguments:args},write));
    }
  }

  class WebYoudao{
    constructor(store){this.store=store;this.busy=false;this.client=null;this.connecting=null;this.sourceKey='';}
    async installed(){return true;}
    close(){this.client?.close();this.client=null;this.connecting=null;this.sourceKey='';}
    async connection(){
      const key=String(await this.store.secret('youdaoKey')||'').trim();
      if(!key){this.close();throw Error('请先在设置中授权有道账号。');}
      if(key!==this.sourceKey||this.client?.closed||this.client?.failed)this.close();
      if(this.client)return this.client;
      if(this.connecting)return this.connecting;
      this.sourceKey=key;const client=new MCPConnection(key);
      this.connecting=client.open().then(()=>{this.client=client;return client;}).finally(()=>{this.connecting=null;});
      return this.connecting;
    }
    async call(name,args,readOnly=true){
      const attempts=readOnly?3:1;
      for(let attempt=0;attempt<attempts;attempt++){
        try{return await (await this.connection()).tool(name,args,!readOnly);}
        catch(error){
          // An uncertain write is never repeated here. Cloud protocol reads the
          // actual note/version before deciding what to do with a later retry.
          if(!readOnly||!error.retryable||attempt+1===attempts)throw error;
          this.close();await new Promise(resolve=>setTimeout(resolve,350*(attempt+1)));
        }
      }
    }
    async list(folder){
      const parentId=folder?identifier(String(folder),'有道目录 ID'):'0';
      const result=[],seen=new Set();let lastId;
      for(let page=0;page<100;page++){
        const response=await this.call('listNotes',{parentId,...(lastId?{lastId}:{})});
        if(!response.data||!Array.isArray(response.data.entries))throw Error('有道目录响应不完整，请重新连接账号。');
        const batch=response.data.entries;
        if(!batch.length)return result;
        let added=0;
        for(const row of batch){
          const id=identifier(String(row.id??row.fileId??''));
          if(seen.has(id))continue;
          seen.add(id);added++;
          result.push({id,title:String(row.name??row.title??''),directory:row.dir===true||row.directory===true||row.dir===1});
        }
        const cursor=identifier(String(batch[batch.length-1].id??batch[batch.length-1].fileId??''));
        if(response.data.hasMore===false||response.data.hasNext===false)return result;
        if(!added||cursor===lastId){
          if(response.data.hasMore===true||response.data.hasNext===true)throw Error('有道分页游标没有前进，尚未确认完整目录，请稍后重试。');
          return result;
        }
        lastId=cursor;
      }
      throw Error('有道目录超过当前分页读取上限，尚未确认完整目录，请保留本机数据。');
    }
    async search(term){
      const keyword=String(term).slice(0,200),result=[],seen=new Set();
      for(let page=0;page<100;page++){
        const response=await this.call('searchNotes',{keyword,startIndex:page*15});
        if(!response.data||!Array.isArray(response.data.entries))throw Error('有道搜索响应不完整，请稍后重试。');
        const batch=response.data.entries;if(!batch.length)return result;let added=0;
        for(const row of batch){const id=identifier(String(row.id??row.fileId??''));if(seen.has(id))continue;seen.add(id);added++;result.push({id,title:String(row.name??row.title??''),directory:row.dir===true||row.directory===true||row.dir===1});}
        if(!added||batch.length<15||response.data.hasMore===false)return result;
      }
      throw Error('有道搜索结果超过读取上限，请缩小关键词范围。');
    }
    async read(id){
      const response=await this.call('getNoteTextContent',{fileId:identifier(String(id))});
      if(response.data?.content!=null)return String(response.data.content);
      if(response.text)return response.text;
      throw Error('有道没有返回笔记内容，尚未确认读取成功。');
    }
    async create(title,content){
      const parentId=identifier(String(this.store.data.config.youdao.folderId||''),'有道学习目录');
      const response=await this.call('createAnyNote',{title:String(title),content:String(content),type:'md',parentId},false);
      const id=response.data?.fileId||response.data?.id||response.data?.data?.fileId||response.text.match(/文件id为[：:]\s*([^\s]+)/i)?.[1];
      if(!id)throw failure('有道未返回保存后的笔记 ID；云端可能已收到，请先回读目录，本机内容已保留。',false,true);
      return identifier(String(id));
    }
    async update(id,content){await this.call('updateMarkdownNote',{fileId:identifier(String(id)),content:String(content)},false);}
    async test(){return {entries:await this.list()};}
    noteBody(note){return note.cloudBodyOverride||'<!-- zhixu-note:'+note.id+' -->\n# '+note.title+'\n\n'+String(note.text).replace(/保存状态：浏览器本地；尚未云同步/g,'保存状态：学习记录已确认');}
    async hash(text){
      const bytes=new TextEncoder().encode(String(text).replace(/\r\n/g,'\n').trim());
      return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    }
    async syncNotes(forceId){
      if(this.busy)throw Error('笔记同步正在进行，请稍候。');this.busy=true;
      const results=[];try{
        const folder=String(this.store.data.config.youdao.folderId||'');if(!folder)throw Error('请先选择有道学习目录。');
        const entries=await this.list(folder);this.store.data.sync.notes||={};
        for(const note of this.store.data.workspace?.notes||[]){
          const body=this.noteBody(note),meta=this.store.data.sync.notes[note.id]||{},digest=await this.hash(body),title='知序 · '+note.id+'.md';
          try{
            let cloudId=meta.cloudId&&entries.some(x=>x.id===meta.cloudId)?meta.cloudId:entries.find(x=>x.title===title&&!x.directory)?.id;
            if(cloudId){
              const remote=await this.read(cloudId),remoteHash=await this.hash(remote);
              if(remoteHash!==meta.cloudHash&&remoteHash!==digest&&forceId!==note.id){this.store.data.sync.notes[note.id]={...meta,cloudId,status:'conflict',remote,local:body,error:'有道笔记已变化，等待选择保留版本'};results.push({id:note.id,status:'conflict'});continue;}
              if(remoteHash!==digest)await this.update(cloudId,body);
            }else cloudId=await this.create(title,body);
            if(await this.hash(await this.read(cloudId))!==digest)throw Error('有道笔记回读与本机内容不同，尚未确认同步成功。');
            this.store.data.sync.notes[note.id]={cloudId,status:'synced',localHash:digest,cloudHash:digest,at:Date.now()};results.push({id:note.id,status:'synced'});
          }catch(error){this.store.data.sync.notes[note.id]={...meta,status:'failed',error:error.message};results.push({id:note.id,status:'failed',error:error.message});}
        }
        await this.store.commit();return results;
      }finally{this.busy=false;}
    }
    async sync(forceId){return this.syncNotes(forceId);}
    async uploadSnapshot(){
      const backup=this.store.backup();if(!backup.workspace)throw Error('尚无可备份的学习数据。');
      const json=JSON.stringify(backup),id=await this.create('知序数据快照 · '+new Date().toISOString().replace(/[:.]/g,'-')+' · '+this.store.data.deviceId+'.md','# 知序学习数据快照\n\n```json\n'+json+'\n```');
      if(!(await this.read(id)).includes(json))throw Error('有道快照回读核对失败，尚未确认保存成功。');
      this.store.data.sync.lastSnapshot={id,at:Date.now()};await this.store.commit();return {id};
    }
    async snapshots(){return (await this.list(identifier(String(this.store.data.config.youdao.folderId||''),'有道学习目录'))).filter(x=>!x.directory&&x.title.startsWith('知序数据快照 · ')).sort((a,b)=>b.title.localeCompare(a.title));}
    async snapshot(id){
      const rows=await this.snapshots();if(!rows.some(x=>x.id===id))throw Error('备份不属于当前有道学习目录。');
      const match=(await this.read(id)).match(/```json\s*([\s\S]*?)\s*```/);if(!match)throw Error('不是知序学习备份。');
      return JSON.parse(match[1]);
    }
  }
  global.WebYoudao=WebYoudao;
})(window);
