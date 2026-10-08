/* Local browser cache and an encrypted, device-only credential vault. */
(function () {
  'use strict';
  const DATABASE = 'zhixu-study-web';
  const SCHEMA = 1;
  const MAX_WORKSPACE = 12000000;
  const clone = value => value == null ? value : structuredClone(value);
  const secretName = name => {
    if (!['aiKey', 'youdaoKey', 'accountConfigPassword'].includes(name) && !/^aiKey:[\w-]{1,80}$/.test(name)) throw Error('不支持的凭据');
    return name;
  };
  const request = value => new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error || Error('浏览器缓存读取失败'));
  });
  const finished = transaction => new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || Error('浏览器缓存写入失败'));
    transaction.onerror = () => {};
  });
  function defaults() {
    const profile = {id: 'deepseek', name: 'DeepSeek', provider: 'api', baseUrl: 'https://api.deepseek.com', model: '', jsonMode: true, thinking: 'disabled', models: []};
    return {
      schema: SCHEMA, revision: 0, deviceId: crypto.randomUUID(), workspace: null,
      config: {
        activeAI: 'deepseek', ai: {...profile}, aiProfiles: [profile],
        youdao: {folderId: '', folderName: 'Z-知序', autoSync: false, workspaceAutoSync: true},
        updates: {owner: 'ANANC', repo: 'zhixu-study-releases'},
        reminders: {enabled: false, time: '20:30', startup: false}
      },
      secrets: {}, credentialBindings: {}, credentialBindingsVersion: 1, sync: {notes: {}, lastSnapshot: null}
    };
  }
  function workspaceCopy(value) {
    if (value === null) return null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('学习数据格式错误');
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_WORKSPACE) throw Error('学习数据超过 12MB，请先导出备份');
    return clone(value);
  }
  function canonicalURL(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('AI 接口地址无效');
    return url.href.replace(/\/$/, '');
  }
  function hasKeyFor(profile, data) {
    if (profile?.provider !== 'api' || !Object.hasOwn(data.credentialBindings || {}, profile.id)) return false;
    try { if (data.credentialBindings[profile.id]?.baseUrl !== canonicalURL(profile.baseUrl)) return false; } catch { return false; }
    return !!data.secrets['aiKey:' + profile.id] || (profile.id === 'api-legacy' && !!data.secrets.aiKey);
  }
  function unbind(data, name) {
    const id = name === 'aiKey' ? 'api-legacy' : name.startsWith('aiKey:') ? name.slice(6) : null;
    if (id && data.credentialBindings) delete data.credentialBindings[id];
  }
  function bindingMatches(data, binding) {
    return !binding || (Object.hasOwn(data.credentialBindings || {}, binding.id) && data.credentialBindings[binding.id]?.baseUrl === binding.baseUrl);
  }
  function publicFields(value) {
    if (Array.isArray(value)) return value.map(publicFields);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !['secrets', 'password', 'accountConfigPassword', 'credentialBindings', 'credentialBindingsVersion', 'apiKey', 'aiKey', 'youdaoKey'].includes(key)).map(([key, item]) => [key, publicFields(item)]));
  }
  function publicProfile(profile, data) {
    const fields = ['id', 'name', 'provider', 'baseUrl', 'model', 'codexModel', 'jsonMode', 'thinking', 'models', 'modelsAt'];
    const copy = Object.fromEntries(fields.filter(key => profile[key] !== undefined).map(key => [key, publicFields(clone(profile[key]))]));
    copy.hasKey = hasKeyFor(profile, data);
    return copy;
  }
  class BrowserStore {
    constructor() {
      this.root = '此设备的浏览器缓存';
      this.data = defaults();
      this.queue = Promise.resolve();
      this.ready = null;
      this.db = null;
      this.key = null;
      this.diskRevision = 0;
    }
    init() {
      if (!this.ready) this.ready = this.open();
      return this.ready;
    }
    async open() {
      if (!window.isSecureContext || !window.indexedDB || !crypto.subtle) throw Error('请通过 HTTPS 打开知序；此浏览器需要支持加密和离线缓存');
      this.db = await new Promise((resolve, reject) => {
        const opening = indexedDB.open(DATABASE, SCHEMA);
        opening.onupgradeneeded = () => {
          const db = opening.result;
          for (const name of ['records', 'vault', 'backups']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        };
        opening.onsuccess = () => resolve(opening.result);
        opening.onerror = () => reject(Error('浏览器无法打开本地缓存，请使用普通 Safari 标签页并检查存储空间'));
        opening.onblocked = () => reject(Error('请关闭其他知序网页后重新打开，以完成本地缓存升级'));
      });
      this.db.onversionchange = () => { this.db.close(); this.db = null; };
      const read = this.db.transaction(['vault', 'records'], 'readonly');
      const done = finished(read);
      const savedKey = await request(read.objectStore('vault').get('key'));
      await done;
      let generated = savedKey;
      if (!generated) generated = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
      // Creation is atomic across tabs. The non-extractable CryptoKey remains in
      // IndexedDB and is never encoded into a backup or an application asset.
      const initial = this.db.transaction(['vault', 'records'], 'readwrite');
      const complete = finished(initial);
      let actualKey, actualData;
      const keys = initial.objectStore('vault'), records = initial.objectStore('records');
      const keyRead = keys.get('key');
      keyRead.onsuccess = () => { actualKey = keyRead.result || generated; if (!keyRead.result) keys.put(actualKey, 'key'); };
      const stateRead = records.get('state');
      stateRead.onsuccess = () => { actualData = stateRead.result || this.data; if (!stateRead.result) records.put(actualData, 'state'); };
      await complete;
      if (!actualKey || actualKey.extractable || actualKey.algorithm?.name !== 'AES-GCM') throw Error('本机凭据缓存格式无效，请保留学习备份后清除该网站缓存');
      if (actualData?.schema !== SCHEMA) throw Error('学习数据版本不兼容，请更新知序网页后重试');
      this.key = actualKey;
      this.data = actualData;
      this.diskRevision = Number(actualData.revision) || 0;
      this.data.secrets ||= {};
      this.data.sync ||= {notes: {}, lastSnapshot: null};
      this.data.sync.notes ||= {};
      let migrated = false;
      if (!this.data.credentialBindings || typeof this.data.credentialBindings !== 'object' || Array.isArray(this.data.credentialBindings)) { this.data.credentialBindings = {}; migrated = true; }
      if (Number(this.data.credentialBindingsVersion || 0) < 1) {
        for (const profile of this.data.config?.aiProfiles || []) {
          if (profile?.provider !== 'api' || !profile.baseUrl || Object.hasOwn(this.data.credentialBindings, profile.id)) continue;
          if (!this.data.secrets['aiKey:' + profile.id] && !(profile.id === 'api-legacy' && this.data.secrets.aiKey)) continue;
          try { this.data.credentialBindings = {...this.data.credentialBindings, [profile.id]: {baseUrl: canonicalURL(profile.baseUrl)}}; } catch {}
        }
        // This runs before any account configuration can replace local URLs.
        // Never let a later incoming profile claim a leftover unbound key.
        this.data.credentialBindingsVersion = 1; migrated = true;
      }
      if (migrated) await this.write(clone(this.data));
      return this;
    }
    enqueue(work) {
      const operation = this.queue.then(async () => { await this.init(); if (!this.db) throw Error('网页缓存已升级，请重新打开知序'); return work(); });
      this.queue = operation.catch(() => {});
      return operation;
    }
    async write(copy) {
      const tx = this.db.transaction('records', 'readwrite');
      const done = finished(tx), records = tx.objectStore('records');
      let conflict = false;
      const existing = records.get('state');
      existing.onsuccess = () => {
        if ((Number(existing.result?.revision) || 0) !== this.diskRevision || existing.result?.deviceId !== this.data.deviceId) { conflict = true; tx.abort(); return; }
        copy.revision = this.diskRevision + 1;
        records.put(copy, 'state');
      };
      try { await done; } catch (error) {
        if (conflict) throw Error('另一个知序标签页已保存数据，请保留当前草稿并关闭其他标签页后重新打开');
        throw Error(error?.name === 'QuotaExceededError' ? '浏览器存储空间不足；本次内容仍在页面中，请先导出备份' : '此设备缓存保存失败；本次内容仍在页面中，请先导出备份');
      }
      this.diskRevision = copy.revision;
      this.data.revision = copy.revision;
      return {revision: copy.revision};
    }
    commit() {
      // Snapshot in queue order, so a preceding credential encryption is part
      // of the same saved state. Successful writes are atomic IDB transactions.
      return this.enqueue(() => this.write(clone(this.data)));
    }
    setWorkspace(value) {
      const copy = workspaceCopy(value);
      return this.enqueue(async () => {
        this.data.workspace = copy;
        this.data.workspaceUpdated = Date.now();
        return this.write(clone(this.data));
      });
    }
    setSecret(name, value) {
      secretName(name);
      if (typeof value !== 'string' || value.length > 16000) return Promise.reject(Error('凭据格式无效'));
      return this.enqueue(async () => {
        if (!value) { unbind(this.data, name); delete this.data.secrets[name]; return; }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const content = new TextEncoder().encode(value);
        const cipher = await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(name)}, this.key, content);
        unbind(this.data, name);
        this.data.secrets[name] = {version: 1, iv, cipher};
      });
    }
    secret(name, binding) {
      secretName(name);
      return this.enqueue(async () => {
        if (!bindingMatches(this.data, binding)) return '';
        const value = this.data.secrets[name];
        if (!value) return '';
        if (value.version !== 1 || !value.iv || !value.cipher) throw Error('此设备无法读取保存的凭据，请重新授权；学习数据已保留');
        try {
          const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: value.iv, additionalData: new TextEncoder().encode(name)}, this.key, value.cipher);
          return bindingMatches(this.data, binding) ? new TextDecoder().decode(plain) : '';
        } catch { throw Error('此设备无法解密保存的凭据，请重新授权；学习数据已保留'); }
      });
    }
    publicConfig() {
      const config = this.data.config;
      const profiles = (config.aiProfiles || []).map(profile => publicProfile(profile, this.data));
      const active = profiles.find(profile => profile.id === config.activeAI);
      return {
        activeAI: config.activeAI, ai: active || publicProfile(config.ai || {}, this.data), aiProfiles: profiles,
        youdao: publicFields(clone(config.youdao)), updates: publicFields(clone(config.updates)), reminders: publicFields(clone(config.reminders)),
        hasAiKey: !!active?.hasKey, hasYoudaoKey: !!this.data.secrets.youdaoKey,
        deviceId: this.data.deviceId, dataPath: this.root
      };
    }
    backup() { return {format: 'zhixu-backup', schema: SCHEMA, exported: Date.now(), workspace: clone(this.data.workspace)}; }
    backupLocal(backup, reason = 'restore') {
      if (backup?.format !== 'zhixu-backup' || backup.schema !== SCHEMA) return Promise.reject(Error('恢复前备份格式无效'));
      const value = {format: 'zhixu-backup', schema: SCHEMA, exported: backup.exported || Date.now(), workspace: workspaceCopy(backup.workspace)};
      return this.enqueue(async () => {
        const id = crypto.randomUUID(), tx = this.db.transaction('backups', 'readwrite');
        const done = finished(tx), records = tx.objectStore('backups');
        records.put({id, at: Date.now(), reason: String(reason).slice(0,80), backup: value}, id);
        const all = records.getAll();
        all.onsuccess = () => { for (const row of all.result.sort((a,b) => b.at-a.at).slice(5)) records.delete(row.id); };
        await done;
        return id;
      });
    }
    localBackups() {
      return this.enqueue(async () => { const tx=this.db.transaction('backups','readonly'), done=finished(tx); const rows=await request(tx.objectStore('backups').getAll()); await done; return rows.sort((a,b)=>b.at-a.at); });
    }
    resetAccount(options = {}) {
      if (options.confirm !== true) return Promise.reject(Error('请先确认退出有道授权；此设备学习数据会保留'));
      return this.enqueue(async () => {
        delete this.data.secrets.youdaoKey;
        delete this.data.secrets.accountConfigPassword;
        this.data.config.youdao = {...this.data.config.youdao, folderId: '', folderName: '', workspaceAutoSync: false};
        this.data.sync = {notes: {}, lastSnapshot: null};
        await this.write(clone(this.data));
        return this.publicConfig();
      });
    }
    clearDevice(options = {}) {
      if (options.confirm !== true) return Promise.reject(Error('请先导出或同步学习数据，并确认清除本设备缓存'));
      return this.enqueue(async () => {
        const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
        const next = defaults(), tx = this.db.transaction(['records','vault','backups'], 'readwrite'), done = finished(tx);
        for (const name of ['records','vault','backups']) tx.objectStore(name).clear();
        tx.objectStore('records').put(next,'state');
        tx.objectStore('vault').put(key,'key');
        await done;
        this.key=key; this.data=next; this.diskRevision=0;
        return this.publicConfig();
      });
    }
  }
  window.BrowserStore = BrowserStore;
})();
