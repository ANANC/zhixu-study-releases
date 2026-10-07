(function(global){
  'use strict';
  // Reuse the desktop protocol verbatim. Shared's Node adapters supply SHA-256,
  // byte limits and an IndexedDB backup writer; user data stays in Youdao.
  function protocol(){
    const modules=global.StudyModules;
    if(!modules)throw Error('学习同步组件尚未加载，请刷新应用。');
    if(typeof modules.WorkspaceCloud==='function')return modules;
    if(typeof modules.require==='function')return modules.require('./cloud.cjs');
    throw Error('学习同步组件加载不完整，请刷新应用。');
  }
  class WebCloud{
    constructor(store,youdao,emit){
      const {WorkspaceCloud}=protocol();
      this.store=store;this.youdao=youdao;
      this.protocol=new WorkspaceCloud(store,youdao,emit);
      this.resume=()=>{
        if(document.visibilityState==='visible'&&navigator.onLine&&this.status().connected&&!this.status().busy)this.protocol.sync().catch(()=>{});
      };
      document.addEventListener('visibilitychange',this.resume);
      global.addEventListener('online',this.resume);
    }
    get data(){return this.protocol.data;}
    get operation(){return this.protocol.operation;}
    status(){return this.protocol.status();}
    connect(){return this.protocol.connect();}
    sync(){return this.protocol.sync();}
    pull(){return this.protocol.pull();}
    resolve(choice){return this.protocol.resolve(choice);}
    flush(){return this.protocol.flush();}
    schedule(){return this.protocol.schedule();}
    assertSourceChange(value){return this.protocol.assertSourceChange(value);}
    sourceChanged(){const result=this.protocol.sourceChanged();this.youdao.close();return result;}
    readRemote(){return this.protocol.readRemote();}
    close(){
      document.removeEventListener('visibilitychange',this.resume);
      global.removeEventListener('online',this.resume);
      this.protocol.close();this.youdao.close();
    }
  }
  global.WebCloud=WebCloud;
  global.WebWorkspaceCloud=WebCloud;
})(window);
