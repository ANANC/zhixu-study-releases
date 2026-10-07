'use strict';
// Adaptive columns keep diagnostic evidence separate from confirmed course mastery.
const adaptiveSubjects={
  sd:{title:'软件设计师',goal:'围绕真实问题连接基础、结构、设计与验证',modules:[
    ['sd-foundation','计算机基础',['进制与编码','Cache与存储系统'],['sd-data','sd-os']],
    ['sd-data','数据结构与算法',['栈与队列','树与图','算法复杂度'],['sd-os','sd-case']],
    ['sd-os','操作系统',['进程与线程','同步与死锁','存储管理'],['sd-data','sd-db']],
    ['sd-network','网络',['TCP/UDP','协议与子网'],['sd-os','sd-design']],
    ['sd-db','数据库',['SQL','关系与范式','事务并发'],['sd-design','sd-case']],
    ['sd-design','建模与设计',['UML','设计模式','职责与接口'],['sd-engineering','sd-case']],
    ['sd-engineering','软件工程与测试',['开发模型','用例与边界','耦合内聚'],['sd-design','sd-data']],
    ['sd-language','程序语言',['参数传递','编译过程'],['sd-data','sd-engineering']],
    ['sd-law','知识产权与标准',['著作权','标准化'],['sd-engineering','sd-design']],
    ['sd-case','综合案例',['数据流图','数据库设计','算法设计'],['sd-data','sd-db','sd-design']]
  ]},
  en:{title:'英语',goal:'在同一段材料里连接句子理解、语法与表达',modules:[
    ['en-structure','句子结构',['词性基础','句子成分','be动词'],['en-tense','en-reading']],
    ['en-tense','时间与动作',['一般现在时','一般过去时','现在完成时'],['en-structure','en-writing']],
    ['en-relations','句间与词间关系',['介词','连词','定语从句'],['en-reading','en-writing']],
    ['en-reading','阅读与推断',['段落主旨','上下文猜词','长难句拆解'],['en-structure','en-relations']],
    ['en-writing','表达与翻译',['简单翻译','疑问句','否定句'],['en-tense','en-reading']]
  ]},
  game:{title:'游戏开发',goal:'把数学、运行行为与工程验证放进可复现的小任务',modules:[
    ['game-math','数学与空间',['向量','几何基础','曲线与插值'],['game-engine','game-render']],
    ['game-render','图形与渲染',['光照','纹理与材质','Shader基础'],['game-math','game-performance']],
    ['game-performance','性能与验证',['CPU优化','内存优化','调试与分析'],['game-engine','game-render']],
    ['game-network','网络与同步',['同步模型','AOI','网络基础'],['game-engine','game-performance']],
    ['game-engine','引擎与玩法',['UE基础架构','蓝图与C++','GameplayFramework'],['game-math','game-performance']],
    ['game-frontier','技术探索',['Mass/ECS','PCG','工具链扩展'],['game-engine','game-performance']]
  ]}
};
const adaptiveForms={scenario:'情境任务',reading:'短文与材料',comparison:'对比判断',debugging:'纠错调试',experiment:'小实验',translation:'翻译改写',explanation:'讲给别人',retrieval:'独立回忆'};
const adaptiveQuestionBank={
  'sd-foundation':[
    ['十进制 10 写成二进制是什么？',['1010','1001','1110','1100'],'A','10 = 8 + 2，因此是 1010。'],
    ['程序重复访问很小的一组数据，缓存最直接利用哪种特点？',['局部性','所有数据永久不变','网络可靠性','整数溢出'],'A','重复或邻近访问体现局部性，缓存利用这类访问特征。']
  ],
  'sd-data':[
    ['撤销操作要先撤销最近一步，哪种结构最符合这个取出规则？',['队列','栈','无序集合','按名称排序'],'B','最近加入的先取出，符合栈的后进先出。'],
    ['已按数值排序的数组，二分查找每轮把范围大致减半，其时间复杂度是哪项？',['O(n²)','O(n)','O(log n)','O(1)'],'C','范围每轮减半，最多需要对数量级的轮次。']
  ],
  'sd-os':[
    ['两个线程修改同一个共享计数器，需要什么来避免丢失更新？',['只改变量名','同步互斥或等效原子操作','只增加缓存','让两个线程总是同时执行'],'B','读改写必须按正确的同步规则协调。'],
    ['两个任务各占一个资源，并等待对方手里的资源，最应检查什么？',['字符编码','循环等待与死锁','文件扩展名','网页颜色'],'B','互相等待形成循环等待，是死锁的重要条件。']
  ],
  'sd-network':[
    ['任务要求可靠、有序的字节流，通常选择哪个传输协议？',['UDP','TCP','HTML','PNG'],'B','TCP 提供可靠有序字节流；应用仍需处理自身消息边界。'],
    ['从一个 TCP 接收调用里拿到数据，能否认定刚好是一整条应用消息？',['总能','不能，应用需定义并处理消息边界','只要数据很短就能','中文消息才不能'],'B','TCP 是字节流，不保留应用消息边界。']
  ],
  'sd-db':[
    ['订单明细中的订单 ID 指向订单表，最相关的约束是什么？',['外键','字体','压缩比','页面缓存'],'A','外键表达并约束记录间的引用关系。'],
    ['转账扣款和入账必须一起成功或一起失败，主要需要事务的哪种性质？',['原子性','语法高亮','可读性','文件命名规则'],'A','原子性保证事务作为一个整体完成或回滚。']
  ],
  'sd-design':[
    ['对象之间协作时，哪项最有助于降低不必要的依赖？',['暴露全部内部字段','通过清晰接口交互','复制所有代码','让所有类互相引用'],'B','清晰接口减少对内部实现细节的依赖。'],
    ['要描述多个对象在一次业务中的消息先后，哪类 UML 图更适合？',['顺序图','只有一张类名列表','饼图','柱状图'],'A','顺序图强调对象之间消息的时间顺序。']
  ],
  'sd-engineering':[
    ['允许年龄 18 到 60，包含端点。哪组数据更适合先检查边界？',['30、35、40','17、18、60、61','20、25、28','只测18'],'B','边界内外的邻近值有助于发现比较条件错误。'],
    ['发现错误后，只改代码但从不重新运行相关用例，会缺少什么？',['回归验证','开发人员姓名','更多颜色','更多变量'],'A','回归验证用于确认修复及检查相关行为是否被破坏。']
  ],
  'sd-language':[
    ['函数按值接收一个整数形参，在函数里只修改这个形参，通常会怎样？',['自动改变调用者的整数变量','只改变形参的局部值','自动终止进程','删除原始变量'],'B','按值传递时形参获得值的副本；此题限定整数且没有其他副作用。'],
    ['编译器的语法分析最直接检查什么？',['程序结构是否符合语法','网络传输是否可靠','机器是否有足够磁盘','函数是否业务正确'],'A','语法分析检查结构规则，不能单独证明业务正确。']
  ],
  'sd-law':[
    ['准备在项目中使用第三方代码，首先应检查什么？',['许可证及其适用条件','文件颜色','作者头像','是否只有十行'],'A','应检查授权范围及需要履行的许可证条件；具体法律问题需专业核对。'],
    ['使用第三方图片但修改了文件名，能否据此认定无需授权？',['可以','不能，改名不证明有使用授权','只要小于1MB就可以','只要在电脑上就可以'],'B','文件名变化不构成使用授权的证据。']
  ],
  'sd-case':[
    ['用户要求“保存订单后可查询”，最有用的验收项是哪项？',['按钮是蓝色','提交后按订单号查到正确内容','代码有100行','项目目录很大'],'B','验收应连接用户操作、存储结果和可观察的业务输出。'],
    ['一个案例包含订单、明细和商品，建模时最先需要澄清什么？',['实体职责、关系和业务约束','IDE主题','开发机壁纸','所有表使用同一列'],'A','模型应表达实体关系和真实业务规则。']
  ],
  'en-structure':[
    ['“The small robot moves.” 中谓语是什么？',['The','small','robot','moves'],'D','moves 表示句子中的动作，是谓语。'],
    ['哪句具有明确的主语与谓语？',['The new tool.','The tool works.','Very useful.','In the room.'],'B','The tool 是主语，works 是谓语。']
  ],
  'en-tense':[
    ['“Yesterday, she ___ the file.” 最合适的是哪项？',['opens','opened','opening','open'],'B','Yesterday 指向过去，这里使用一般过去时 opened。'],
    ['“He usually checks the logs.” 最直接描述什么？',['日常习惯','正在这一刻发生','只会在未来发生','从来没发生'],'A','usually 和一般现在时在这里描述习惯。']
  ],
  'en-relations':[
    ['“The test failed because the input was empty.” because 表达什么关系？',['原因','相反','选择','比较大小'],'A','because 引出测试失败的原因。'],
    ['“The program is small, but it is useful.” but 表达什么关系？',['因果','转折','时间先后','所有权'],'B','but 表达前后内容的转折关系。']
  ],
  'en-reading':[
    ['“The function returns true when the value is positive. Otherwise it returns false.” value = -2 时返回什么？',['true','false','positive','无法由材料判断'],'B','负数不满足 positive，进入 otherwise 对应的 false。'],
    ['“Save your changes before you close the editor.” 哪件事应先做？',['关闭编辑器','保存修改','删除文件','重新安装'],'B','before 表示先保存，再关闭。']
  ],
  'en-writing':[
    ['“她每天读取日志。” 哪个表达合适？',['She reads the logs every day.','She read the logs yesterday.','She reading every day.','She are read logs.'],'A','reads 与单数主语搭配，every day 描述习惯。'],
    ['把 “The tool works.” 改为否定句，哪项正确？',['The tool not works.','The tool does not work.','The tool do not works.','The tool is not work.'],'B','一般现在时否定用 does not，动词用原形 work。']
  ],
  'game-math':[
    ['向量 (3,4) 的长度是多少？',['3','4','5','7'],'C','长度是 √(3² + 4²) = 5。'],
    ['两个非零单位向量点积为 0，夹角是多少？',['0°','45°','90°','180°'],'C','单位向量点积等于夹角余弦，cos90° = 0。']
  ],
  'game-render':[
    ['要给模型表面不同位置使用不同颜色信息，最直接使用什么？',['纹理及其采样坐标','只改帧率','网络消息','音量'],'A','纹理存储表面数据，采样坐标决定读取位置。'],
    ['漫反射计算中，法线和光照方向应满足什么基本要求？',['相同坐标空间并按公式归一化','一个在世界空间一个在屏幕空间','都必须长度为0','方向可以忽略'],'A','向量必须在同一空间，单位方向才能按余弦解释点积。']
  ],
  'game-performance':[
    ['帧率下降但还不知道原因，最有依据的下一步是什么？',['先删全部特效','测量CPU/GPU等实际耗时','只改变量名','把代码全部重写'],'B','先测量瓶颈，才能选择与瓶颈有关的优化。'],
    ['优化前后要可比较，哪项更重要？',['相同场景与条件的测量','只看最好的单帧','每次换电脑','只记录主观感觉'],'A','可比条件与重复测量比单帧或感觉更能支持结论。']
  ],
  'game-network':[
    ['客户端和服务器对同一角色位置出现差异，首先应澄清什么？',['状态权威、同步时序与修正策略','角色名字长度','界面字体','贴图扩展名'],'A','同步设计需要明确谁决定状态、何时发送以及如何处理差异。'],
    ['网络测试只用本机零延迟连接，最容易漏掉什么？',['延迟、抖动和丢包下的行为','所有语法错误','图片尺寸','类名拼写'],'A','真实网络条件会影响同步行为，需要分别观察。']
  ],
  'game-engine':[
    ['游戏角色行为变化后，怎样证明修改产生预期效果？',['只看代码是否保存','在对应场景运行并记录实际行为','只改变注释','只看文件日期'],'B','代码保存不证明行为正确，需在相关场景观察执行结果。'],
    ['同一逻辑每帧执行与每秒执行一次，对结果可能有什么影响？',['频率改变可能影响速度与开销','必然完全相同','都会变成网络请求','只影响文件名'],'A','执行频率会影响累积行为与成本，应明确时间步与触发条件。']
  ],
  'game-frontier':[
    ['想把一项新技术加入项目，最有用的第一轮产出是什么？',['代表真实需求的小原型与对照测量','仅收集宣传语','立刻替换全部系统','不留任何记录'],'A','用小原型核对需求、限制和成本，再决定是否扩展。'],
    ['一个原型在简单场景有效，是否已证明所有规模都适用？',['是','否，需要验证目标规模与限制','只要名字新就适用','只要文件小就适用'],'B','简单场景的证据不能直接推广到其他负载和规模。']
  ]
};

function adaptiveData(){
  state.adaptive||={version:2,subject:'sd',view:'overview',columns:{},loops:{},run:null,draft:null,targets:{}};
  const a=state.adaptive;a.columns||={};a.loops||={};a.targets||={};
  for(const id of Object.keys(adaptiveSubjects)){a.columns[id]||={evidence:[],diagnostics:[]};a.columns[id].evidence||=[];a.columns[id].diagnostics||=[];}
  if((a.version||1)<2&&a.view==='diagnosis'&&a.run&&!a.run.exam)a.view='column';
  // Existing courses, answers and running diagnostics retain their original scope.
  a.version=2;return a;
}
function adaptiveTrack(subject=adaptiveData().subject){return typeof examTracks!=='undefined'?examTracks[subject]:null;}
function adaptiveExam(subject=adaptiveData().subject){const t=adaptiveTrack(subject),variants=t?.variants||[],picked=adaptiveData().targets[subject],v=variants.find(x=>x.id===picked)||variants[0];return {id:subject+'-'+(v?.id||'practical'),title:t?.title||adaptiveSubjects[subject].title,track:v?.title||t?.target||adaptiveSubjects[subject].goal};}
function adaptiveSelectTarget(subject,variant){if(busy)return;if(!adaptiveTrack(subject)?.variants?.some(x=>x.id===variant))return;rememberDraft();adaptiveData().targets[subject]=variant;save();render('top');}
function adaptiveThemes(subject=adaptiveData().subject){return adaptiveTrack(subject)?.themes||[];}
function adaptiveTheme(key){for(const subject of Object.keys(adaptiveSubjects)){const t=adaptiveThemes(subject).find(x=>x.key===key);if(t)return t;}return null;}
function adaptiveQuestionModules(q){return [...new Set([q.moduleId,...(q.relatedModuleIds||q.moduleIds||[])])].filter(id=>adaptiveModule(id));}
function adaptiveErrorLinks(q){const raw=q.errorLinks||q.optionFaults||[];return (Array.isArray(raw)?raw:Object.entries(raw).map(([option,x])=>({...x,option}))).map(x=>({option:x.option||null,reason:x.reason||'',moduleIds:(x.moduleIds||[]).filter(id=>adaptiveModule(id)),kind:'hypothesis'})).filter(x=>x.reason&&x.moduleIds.length);}
function adaptiveRecentFaults(subject=adaptiveData().subject){return adaptiveColumn(subject).evidence.filter(e=>e.correct===false&&!e.hinted&&!e.seen&&e.answer).slice(-8).reverse();}

function adaptiveRankThemes(subject=adaptiveData().subject){
  const faults=adaptiveRecentFaults(subject),a=adaptiveData(),general=subject==='en'&&adaptiveExam(subject).id.endsWith('-general');
  return adaptiveThemes(subject).map((theme,index)=>{
    const existing=Object.entries(a.loops).find(([,m])=>m.templateKey===theme.key||m.themeKey===theme.key),matched=faults.filter(e=>[...(e.moduleIds||[]),...(e.faultHypotheses||[]).flatMap(x=>x.moduleIds||[])].some(id=>theme.modules.includes(id))),targetFit=general&&theme.key==='en-city-bikes'?20:0;
    return {theme,existing,matched,rank:matched.length*30+targetFit+(existing&&!adaptiveLoopComplete(existing[0])?10:0)-(existing&&adaptiveLoopComplete(existing[0])?100:0)-index/100};
  }).sort((a,b)=>b.rank-a.rank);
}

function adaptiveColumn(id=adaptiveData().subject){return adaptiveData().columns[id];}
function adaptiveModule(id){for(const [subject,column] of Object.entries(adaptiveSubjects)){const m=column.modules.find(x=>x[0]===id);if(m)return {id:m[0],title:m[1],topics:m[2],related:m[3],subject};}return null;}
function adaptiveCourseModules(id){return adaptiveData().loops[id]?.modules||({stack:['sd-data'],english:['en-structure'],vector:['game-math']}[id]||[]);}
function adaptiveEvidence(moduleId){const m=adaptiveModule(moduleId);if(!m)return [];const saved=adaptiveColumn(m.subject).evidence.filter(e=>(e.moduleIds||[]).includes(moduleId));const existing=Object.entries(state.sessions).filter(([id])=>courses[id]&&!adaptiveData().loops[id]&&adaptiveCourseModules(id).includes(moduleId)).flatMap(([id,s])=>{const records=[];if(s.diagnosis)records.push({id:'existing-diagnosis-'+id,at:s.created,type:'diagnosis',moduleIds:[moduleId],correct:s.diagnosis.correct,hinted:s.diagnosis.correct===true,source:'已有课程诊断（帮助情况未单独记录）',answer:s.diagnosis.answer,course:id,scope:courses[id].diagnosis.prompt});for(let i=0;i<s.answers.length;i++)records.push({id:'existing-acceptance-'+id+'-'+i,at:s.created+1+i,type:'acceptance',moduleIds:[moduleId],scope:courses[id].criteria[i],correct:s.answers[i].correct,hinted:!!s.hinted,source:s.answers[i].source||'已有验收记录',answer:s.answers[i].answer,course:id});if(s.confirmed&&complete(s))records.push({id:'existing-confirmed-'+id,at:s.created+100,type:'confirmed',moduleIds:[moduleId],correct:true,hinted:false,source:'已有课程验收、作业与确认',answer:courses[id].goal,course:id});return records;});return [...existing,...saved].sort((a,b)=>a.at-b.at);}
function adaptiveModuleStatus(moduleId){const evidence=adaptiveEvidence(moduleId),latest=evidence.filter(e=>!e.seen&&['diagnosis','acceptance','homework','confirmed'].includes(e.type)).slice(-6),independent=latest.filter(e=>e.type!=='confirmed'&&!e.hinted&&typeof e.correct==='boolean');const score=independent.length?Math.round(independent.filter(e=>e.correct).length/independent.length*100):null;const last=latest.filter(e=>typeof e.correct==='boolean').at(-1),confirmed=latest.some(e=>e.type==='confirmed'&&e.correct);const weak=last&&last.type!=='confirmed'&&(!last.correct||last.hinted||score<75);const title=weak?'实测任务待复核':confirmed?'有任务范围通过证据':independent.length&&score>=75?'本次抽样表现较好':'暂无实测证据';return {score,status:title,weak:!!weak,confirmed,evidence,priority:weak?100:score===null?55:100-score};}
function adaptivePrior(moduleId){const m=adaptiveModule(moduleId),rows=legacy.filter(t=>t.subject===adaptiveSubjects[m.subject].title&&m.topics.includes(t.title));return rows.length?(rows.reduce((n,t)=>n+t.mastery,0)/rows.length).toFixed(1):null;}
function adaptiveRecommendations(subject=adaptiveData().subject){const modules=adaptiveSubjects[subject].modules.map(m=>({...adaptiveModule(m[0]),...adaptiveModuleStatus(m[0])}));return modules.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));}
function adaptiveLoopComplete(id){const s=ses(id);return !!s&&s.confirmed&&complete(s);}
function adaptiveCourseCount(subject){return Object.entries(adaptiveData().loops).filter(([id,m])=>m.subject===subject&&ses(id)?.confirmed&&complete(ses(id))).length;}

const adaptiveOldCourses=coursesPage;
coursesPage=function(){if(state.selected)return adaptiveOldCourses();const a=adaptiveData();if(a.view==='legacy')return `<div class="actions space">${btn('返回学习专栏','adaptiveOverview()','small')}</div>`+adaptiveOldCourses();if(a.view==='diagnosis'&&a.run)return adaptiveDiagnosisPage();if(a.view==='column')return adaptiveColumnPage();return adaptiveOverviewPage();};

function adaptiveOverviewPage(){
  const a=adaptiveData();
  return `<div class="section">${head('学习专栏 · 目标与主题','围绕考试和实际任务，用多个有主题的小闭环逐步扩展。',btn('查看已有课程','adaptiveLegacy()','small'))}
  <div class="notice">做一项实际任务 → 从错题提出错因假设 → 补相关知识、换形式练习 → 回到新材料验收 → 迁移作业 → 扩展到下一个相关主题</div>
  <div class="grid3 space">${Object.entries(adaptiveSubjects).map(([id,c])=>{const t=adaptiveTrack(id),e=adaptiveExam(id),faults=adaptiveRecentFaults(id);return panel(t?.title||c.title,`<p>${esc(e.track)}</p><p class="sub">${esc(t?.description||c.goal)}</p><div class="actions space">${badge(adaptiveThemes(id).length+' 个主题','gray')}${badge(adaptiveCourseCount(id)+' 个确认闭环','green')}${faults.length?badge(faults.length+' 项错题待复核','amber'):''}</div><div class="actions space">${btn('查看主题与内容',`adaptiveOpenColumn('${id}')`,'primary')}${btn('先做目标任务',`adaptiveStartDiagnosis('${id}','')`,'small')}</div>`);}).join('')}</div>
  ${a.run?panel(a.run.done?'最近一轮任务诊断':'未完成的任务诊断',`<p>${esc(a.run.taskTitle||adaptiveSubjects[aSubject(a.run.subject)].title)} · 已作答 ${a.run.answers.length}/${a.run.questions.length}</p>${btn(a.run.done?'查看错题与下一主题':'继续这一轮','adaptiveResumeDiagnosis()','small space')}`):''}
  ${panel('已有学习会话',Object.entries(state.sessions).filter(([id])=>!a.loops[id]&&courses[id]).map(([id,s])=>`<div class="item"><div class="grow"><strong>${esc(courses[id].title)}</strong><div class="sub">${esc(status(id))} · 原有提交保留</div></div>${btn('继续',`startCourse('${id}')`,'small')}</div>`).join('')||'<p class="sub">可以从当前水平做任务，再决定补哪些内容。</p>')}</div>`;
}
function aSubject(id){return adaptiveSubjects[id]?id:'sd';}
function adaptiveTargetPanel(subject){
  const t=adaptiveTrack(subject),exam=adaptiveExam(subject),variants=t?.variants||[];
  return panel('当前目标',`<div class="actions space">${variants.map(v=>btn(v.title,`adaptiveSelectTarget('${subject}','${v.id}')`,exam.id===subject+'-'+v.id?'primary small':'small')).join('')}</div><p class="sub space">${esc(variants.find(v=>exam.id===subject+'-'+v.id)?.description||t?.description||'按实际任务范围推进。')}</p><p class="tiny">目标用于选择任务和材料。自编任务的结果只评价本次范围，不换算考试分数。已启用闭环保留原目标与证据。</p>`);
}
function adaptiveThemeCard(row){
  const t=row.theme,meta=row.existing?.[1],fault=row.matched[0],reason=fault?`关联实际错题：${fault.scope||fault.prompt||'本次任务'}。相关错因仍需新题验证。`:'可以直接查看材料和活动；已有基础可跳过重复讲解，以新任务验收。';
  return `<section class="card theme-card"><div class="row"><h3>${esc(t.title)}</h3>${meta?badge(status(row.existing[0]),'gray'):badge(t.examTaskType||'实际任务','gray')}</div><p class="sub space">主题：${esc(t.theme||t.title)} · 约 ${t.minutes||30} 分钟</p><p class="space">${esc(t.practicalOutput)}</p><div class="actions space">${[...new Set((t.activities||[]).map(a=>adaptiveForms[a.form]||a.form))].map(x=>badge(x,'gray')).join('')}</div><ol class="criteria">${(t.activities||[]).map(a=>`<li>${esc(a.title)}</li>`).join('')}</ol><p class="tiny">${esc(reason)}</p><div class="actions space">${btn('展开完整闭环内容',`adaptiveThemePreview('${t.key}')`,'small')}${meta?btn('继续这个闭环',`startCourse('${row.existing[0]}')`,'primary small'):btn('检查并启用',`adaptiveBuiltinDraft('${t.key}')`,'primary small')}${aiConfigured()?btn('据错题生成新任务',`adaptiveDesignTheme('${t.key}')`,'small'):''}</div></section>`;
}
function adaptiveFaultNetwork(subject){
  const faults=adaptiveRecentFaults(subject);if(!faults.length)return `<p class="sub">先做阅读、案例或项目判断任务。具体错题会在这里连接相关知识与新主题；一个错误不会直接判定整个模块薄弱。</p>`;
  return faults.slice(0,4).map(e=>{const hypotheses=e.faultHypotheses||e.errorLinks||[],related=[...new Set(hypotheses.flatMap(x=>x.moduleIds||[]))],recommendations=adaptiveThemes(subject).filter(t=>t.modules.some(id=>[...(e.moduleIds||[]),...related].includes(id))).slice(0,2);return `<article class="notice space"><strong>${esc(e.taskTitle||'已作答任务')}</strong><p class="sub">${esc(e.scope||e.prompt||'题目范围')} · 选择 ${esc(e.selectedOption||e.answer)}</p><div class="learning-links"><span>实际任务</span><span aria-hidden="true"> → </span><span>待验证错因</span><span aria-hidden="true"> → </span><span>相关知识</span><span aria-hidden="true"> → </span><span>新情境任务</span></div><p class="space">${esc(hypotheses.map(h=>h.reason).join('；')||'先检查依据与推理，再用新题定位具体原因。')}</p><p class="tiny">${related.length?'候选知识：'+related.map(id=>adaptiveModule(id)?.title||id).join(' / '):'尚未取得具体错因证据。'} · 关联仅用于选择训练，不计为这些知识模块的测评分数。</p><div class="actions space">${recommendations.map(t=>btn('回到主题：'+(t.theme||t.title),`adaptiveThemePreview('${t.key}')`,'small')).join('')}${(e.moduleIds||[])[0]?btn('查看原题证据',`adaptiveEvidenceModal('${e.moduleIds[0]}')`,'small'):''}</div></article>`;}).join('');
}
function adaptiveColumnPage(){
  const a=adaptiveData(),subject=a.subject,c=adaptiveSubjects[subject],track=adaptiveTrack(subject),exam=adaptiveExam(subject),rows=adaptiveRankThemes(subject),recommended=rows.find(r=>!r.existing||!adaptiveLoopComplete(r.existing[0]))||rows[0],loops=Object.entries(a.loops).filter(([,m])=>m.subject===subject),diag=track?.diagnostic;
  return `<div class="section">${head((track?.title||c.title)+' · 主题小闭环',exam.track,btn('全部专栏','adaptiveOverview()','small'))}
  ${adaptiveTargetPanel(subject)}
  ${a.run&&!a.run.done&&a.run.subject===subject?panel('保留的未完成任务',`<p class="sub">${esc(a.run.taskTitle||'已有范围诊断')} · 已作答 ${a.run.answers.length}/${a.run.questions.length}。题目、答案和学习记录已保留。</p><div class="actions space">${btn('继续保留的这一轮','adaptiveResumeDiagnosis()','small')}${!a.run.exam?btn('结束旧轮，做目标任务',`adaptiveRestartDiagnosis('${subject}','')`,'small'):''}</div>`):''}
  <section class="hero"><div class="tiny">当前入口 · 随实际答题证据调整</div><h2 class="space">${esc(recommended?.theme.title||diag?.title||'从一个完整任务开始')}</h2><p class="sub space">${recommended?.matched.length?'这项主题与近期错题有关，先复核错因，再回到新的实际任务。':'可以先做一组目标任务定位当前水平，或展开主题内容后直接开始；无需从零按章节顺序学习。'}</p><div class="actions space">${btn('先做 '+(diag?.title||'目标任务'),`adaptiveStartDiagnosis('${subject}','')`,'primary')}${recommended?btn('查看推荐闭环内容',`adaptiveThemePreview('${recommended.theme.key}')`):''}${a.draft?btn('检查保存的闭环草案','adaptiveDraftModal()','small'):''}</div></section>
  ${panel('主题目录 · 每个小闭环都有材料、活动与实际产出',`<p class="sub">展开后可看到整个闭环：主题材料、不同形式的任务、独立验收和迁移作业标准。主题按错题关联推荐，不按模块编号依次推进。</p><div class="grid2 space">${rows.map(adaptiveThemeCard).join('')}</div>`)}
  ${panel('从错题扩散的学习网络',adaptiveFaultNetwork(subject))}
  ${loops.length?panel('已启用的小闭环',loops.slice().reverse().map(([id,m])=>`<div class="item"><div class="grow"><strong>${esc(courses[id]?.title||m.title)}</strong><div class="sub">${esc(m.exam?.track||m.target||'已有闭环')} · ${esc(status(id))}</div><div class="tiny">${(m.activities||[]).map(x=>esc(x.title)).join(' → ')}</div></div><div class="actions">${btn('查看完整内容',`adaptiveLoopContents('${id}')`,'small')}${btn('继续',`startCourse('${id}')`,'small')}</div></div>`).join('')):''}
  <details class="card space"><summary><strong>知识网络 · 用于解释错因和扩展内容</strong></summary><p class="sub space">知识点服务于当前主题任务。任务只给实际测到的范围记证据；关联和错因假设不会自动变成多个模块通过。</p><div class="grid2 space">${c.modules.map(row=>{const m=adaptiveModule(row[0]),s=adaptiveModuleStatus(m.id),prior=adaptivePrior(m.id),candidates=adaptiveRecentFaults(subject).filter(e=>(e.faultHypotheses||[]).some(h=>h.moduleIds?.includes(m.id)));return `<div class="notice"><strong>${esc(m.title)}</strong><div class="actions space">${badge(s.status,'gray')}${candidates.length?badge(candidates.length+' 条错因候选','amber'):''}</div><p class="tiny">${m.topics.map(esc).join(' · ')}</p><p class="tiny">${s.score===null?'尚无这个范围的直接测评':'近期实际题目符合率 '+s.score+'%'}${prior!==null?' · 旧记录 '+prior+'/5（待复查）':''}</p><div class="actions space">${btn('用任务重点复核',`adaptiveStartDiagnosis('${subject}','${m.id}')`,'small')}${s.evidence.length?btn('实际证据',`adaptiveEvidenceModal('${m.id}')`,'small'):''}</div></div>`;}).join('')}</div></details></div>`;
}
function adaptiveEvidenceModal(moduleId){
  const m=adaptiveModule(moduleId);if(!m)return;const items=adaptiveEvidence(moduleId);
  openModal(m.title+' · 实际任务证据',`<p class="sub">仅评价实际提交的题目和产出。错因关联为待验证假设；诊断与训练不替代新题验收、作业和记录确认。</p>${items.slice(-16).reverse().map(e=>`<div class="item"><div class="grow"><strong>${esc(e.taskTitle||{diagnosis:'任务诊断',acceptance:'新任务验收',confirmed:'闭环记录确认',homework:'迁移作业'}[e.type]||e.type)}</strong><div class="sub">${new Date(e.at).toLocaleString()} · ${e.hinted?'有帮助或已见题的训练':e.correct===null?'等待核验':e.correct?'符合当前范围标准':'当前范围待复核'} · ${esc(e.source||'已有记录')}</div><p class="tiny">实测范围：${esc(e.scope||e.prompt||'已有课程目标')}</p>${e.material?`<details><summary>查看原任务材料</summary><pre class="pre space">${esc(e.material)}</pre></details>`:''}${e.prompt?`<p style="white-space:pre-wrap">${esc(e.prompt)}</p>`:''}<pre class="pre space">${esc(e.answer||'')}${e.reason?'\n'+esc(e.reason):''}</pre>${e.faultHypotheses?.length?`<p class="tiny">待验证错因：${esc(e.faultHypotheses.map(h=>h.reason).join('；'))}</p>`:''}</div></div>`).join('')}`);
}

function adaptiveNavigate(view,subject){if(busy)return toast('先等待当前请求完成或取消');rememberDraft();pauseActive();state.selected=null;state.page='courses';const a=adaptiveData();a.view=view;if(subject)a.subject=subject;save();closeModal();render('top');}
function adaptiveOverview(){adaptiveNavigate('overview');}
function adaptiveLegacy(){adaptiveNavigate('legacy');}
function adaptiveOpenColumn(id){if(!adaptiveSubjects[id])return;adaptiveNavigate('column',id);}
function adaptiveResumeDiagnosis(){if(adaptiveData().run)adaptiveNavigate('diagnosis',adaptiveData().run.subject);}

function adaptiveNormalizeQuestion(q,subject){
  const result={...structuredClone(q)},ids=adaptiveQuestionModules(q);result.relatedModuleIds=ids;result.moduleIds=ids;
  if(result.options)result.options=result.options.map((o,i)=>String.fromCharCode(65+i)+'. '+String(o).replace(/^[A-F][.、:：)\s]\s*/,''));
  result.expected=String(result.expected||result.answer||'');result.reference=result.reference||result.reason||'';
  result.errorLinks=adaptiveErrorLinks(result);result.scope=result.scope||result.prompt;
  const fingerprint=(result.material||'')+'\n'+result.prompt;
  result.seen=adaptiveColumn(subject).evidence.some(e=>e.questionId===result.id||(e.prompt&&((e.material||'')+'\n'+e.prompt===fingerprint)));
  return result;
}
function adaptiveMakeQuestion(moduleId,variant=0){const row=adaptiveQuestionBank[moduleId][variant%2],id=moduleId+'-builtin-'+variant;return adaptiveNormalizeQuestion({id,moduleId,prompt:row[0],options:row[1],expected:row[2],reference:row[3],criteria:[row[3]],grading:'choice',taskTitle:'已有范围复查',scope:row[0]},adaptiveModule(moduleId).subject);}
function adaptiveStartDiagnosis(subject,focus){if(busy)return;const a=adaptiveData();if(a.run&&!a.run.done){openModal('保留未完成任务诊断',`<p>有一轮任务尚未完成，已提交回答已经保留。</p><div class="actions space">${btn('继续这一轮','adaptiveResumeDiagnosis()','primary')}${btn('结束这一轮后重新开始',`adaptiveRestartDiagnosis('${subject}','${focus||''}')`)}</div>`);return;}adaptiveBeginDiagnosis(subject,focus);}
function adaptiveRestartDiagnosis(subject,focus){adaptiveArchiveDiagnosis(false);adaptiveData().run=null;adaptiveBeginDiagnosis(subject,focus);}
function adaptiveBeginDiagnosis(subject,focus){
  if(!adaptiveSubjects[subject])return;const t=adaptiveTrack(subject),d=t?.diagnostic;
  let questions=(d?.questions||[]).filter(q=>!focus||adaptiveQuestionModules(q).includes(focus)).map(q=>adaptiveNormalizeQuestion({...q,material:q.material||d.material,taskTitle:q.taskTitle||d.title,taskType:q.taskType||t.target},subject));
  if(!questions.length){openModal('这个知识关联需要专门任务',`<p>当前自编情境没有直接覆盖“${esc(adaptiveModule(focus)?.title||'此范围')}”。先做现有完整任务，或让 AI 围绕它设计新的实用情境。</p><div class="actions space">${btn('先做目标任务',`adaptiveStartDiagnosis('${subject}','')`,'primary')}${aiConfigured()?btn('生成相关主题',`adaptiveDesignLoop('${focus}')`):''}${btn('查看主题目录',`adaptiveOpenColumn('${subject}')`)}</div>`);return;}
  adaptiveData().run={id:'diagnosis-'+crypto.randomUUID(),subject,exam:adaptiveExam(subject),theme:{title:d.title,taskType:t.target||d.title,scenario:d.material||'',practicalOutput:'独立完成当前材料的题目，并保留原文或情境依据，定位需要复核的范围。'},taskTitle:d.title,focus:focus?[focus]:[],questions,index:0,answers:[],messages:[],hinted:false,feedback:null,done:false,at:Date.now(),source:d.source||'知序自编目标任务'};
  adaptiveNavigate('diagnosis',subject);
}
function adaptiveDiagnosisPage(){
  const r=adaptiveData().run,c=adaptiveSubjects[r.subject];if(r.done)return adaptiveDiagnosisResult();const q=r.questions[r.index];if(!q)return '<div class="empty">本轮没有可作答题目，请回到主题目录。</div>';const m=adaptiveModule(q.moduleId);
  return `<div class="section">${head(q.taskTitle||r.taskTitle||c.title+' · 当前任务',`第 ${r.index+1}/${r.questions.length} 项 · ${r.exam?.track||'已有诊断'} · ${r.source}`,btn('主题目录',`adaptiveOpenColumn('${r.subject}')`,'small'))}
  <div class="notice">先完成实际任务，再根据错误复核相关知识。不确定可以直接记录；需要讲解时点击“获取帮助”，本题只记训练。当前题实测范围：${esc(q.scope||m?.title||q.prompt)}。</div>
  ${q.seen?'<div class="notice amber">这个材料和题目已见过，复查只计训练。新的独立证据需要不同材料与问题。</div>':''}
  ${question({...q,format:q.grading==='choice'?'点击选项提交，也可在底部补充判断依据。':'在底部提交本任务的答案与依据。'},q.taskType||'实用任务诊断')}
  ${r.feedback?panel('反馈与错因关联',`<div class="notice ${r.feedback.correct&&!r.feedback.hinted?'green':'amber'}">${r.feedback.hinted?'使用过帮助或已见过，仅计训练':r.feedback.correct?'当前题符合标准':'当前题需要复核'}</div><p style="white-space:pre-wrap">${esc(r.feedback.reason||'已保留回答')}</p>${r.feedback.faultHypotheses?.length?`<div class="notice space"><strong>待验证错因假设</strong>${r.feedback.faultHypotheses.map(h=>`<p class="sub">${esc(h.reason)} · 可复核：${h.moduleIds.map(id=>esc(adaptiveModule(id)?.title||id)).join(' / ')}</p>`).join('')}<p class="tiny">这些关联用于推荐训练，尚未证明整个知识模块薄弱。</p></div>`:''}<div class="actions space">${btn(r.index===r.questions.length-1?'查看错题关联与下一主题':'继续当前材料下一题','adaptiveNextQuestion()','primary')}</div>`):`<div class="actions">${btn('不确定，先记录','adaptiveUnknown()','small')}${btn('获取帮助（记为训练）','adaptiveDiagnosisHelp()','small')}${aiConfigured()?btn('追加相关新情境题','adaptiveMoreDiagnosis()','small'):''}</div>`}</div>`;
}
function adaptiveDiagnosisResult(){
  const r=adaptiveData().run,rank=adaptiveRankThemes(r.subject),row=rank.find(x=>!x.existing||!adaptiveLoopComplete(x.existing[0]))||rank[0];
  return `<div class="section">${head('任务诊断 · 错因与下一主题','结果只反映本次材料和实际作答范围。相关知识需复核，不根据一题断言整个模块。',btn('主题目录',`adaptiveOpenColumn('${r.subject}')`,'primary'))}
  ${row?panel('推荐下一个小闭环',adaptiveThemeCard(row)):''}
  ${panel('这次任务的实际回答',r.answers.map(e=>`<div class="item"><div class="grow"><strong>${esc(e.taskTitle||r.taskTitle||'已有诊断')}</strong><div class="sub">${esc(e.scope||e.prompt||adaptiveModule(e.moduleIds?.[0])?.title||'实测范围')} · ${e.hinted?'仅计训练':e.correct?'当前题符合标准':'需要复核'}</div><p class="tiny">实测知识范围：${(e.moduleIds||[]).map(id=>esc(adaptiveModule(id)?.title||id)).join(' / ')}</p>${(e.faultHypotheses||[]).map(h=>`<p class="sub">待验证：${esc(h.reason)} → ${h.moduleIds.map(id=>esc(adaptiveModule(id)?.title||id)).join(' / ')}</p>`).join('')}</div></div>`).join(''))}
  ${panel('从错题扩展到关联知识，再回到新任务',adaptiveFaultNetwork(r.subject))}
  <div class="actions space">${btn('复查同一材料（仅训练）',`adaptiveStartDiagnosis('${r.subject}','')`,'small')}${aiConfigured()?btn('追加新情境诊断','adaptiveMoreDiagnosis()','small'):''}</div></div>`;
}
function adaptiveArchiveDiagnosis(done){
  const a=adaptiveData(),r=a.run;if(!r)return;const column=adaptiveColumn(r.subject),snapshot={id:r.id,at:r.at,focus:r.focus,answers:r.answers,questions:r.questions,exam:r.exam,theme:r.theme,taskTitle:r.taskTitle,done:!!done,source:r.source};
  if(!column.diagnostics.some(x=>x.id===r.id))column.diagnostics.push(snapshot);else Object.assign(column.diagnostics.find(x=>x.id===r.id),snapshot);r.done=!!done;save();
}
function adaptiveNextQuestion(){const r=adaptiveData().run;if(!r?.feedback||busy)return;r.index++;r.feedback=null;r.hinted=false;if(r.index>=r.questions.length){r.index=r.questions.length-1;adaptiveArchiveDiagnosis(true);}save();render('top');}
async function adaptiveUnknown(){if(busy||adaptiveData().run?.feedback)return;state.drafts[draftKey()]='不确定';render();await sendAI();}
function adaptiveDiagnosisHelp(){const r=adaptiveData().run;if(!r||r.feedback||r.done)return;r.hinted=true;const q=r.questions[r.index];append(r.messages,q.reference||'可以在底部明确提问。获得帮助后，本题只计训练。','任务帮助 · 训练');save();render('bottom');}
function adaptiveFilteredLinks(links,allowed){return (links||[]).map(x=>({...x,moduleIds:(x.moduleIds||[]).filter(id=>allowed.has(id))})).filter(x=>x.moduleIds.length);}
async function adaptiveMoreDiagnosis(){
  if(busy)return;await task(async()=>{
    requireDesktop();const r=adaptiveData().run,q=r?.questions[r.index];if(!q)throw Error('先选择一个目标任务');if(r.questions.length>=40)throw Error('本轮题目较多，请完成后再开启新的主题诊断');
    const ids=[...new Set([...adaptiveQuestionModules(q),...(r.focus||[])])].filter(id=>adaptiveModule(id)),allowed=new Set(ids),modules=ids.map(adaptiveModule),firstAdded=r.questions.length;
    requestId='adaptive-diagnosis';
    const previous=r.answers.filter(x=>allowed.has(x.moduleIds?.[0])).slice(-24).map(x=>{const old=r.questions.find(y=>y.id===x.questionId);return {questionId:x.questionId,moduleId:x.moduleIds[0],answer:x.answer,correct:x.correct,hinted:x.hinted,prompt:x.prompt||old?.prompt||'',material:x.material||old?.material||'',relatedModuleIds:(x.relatedModuleIds||[x.moduleIds[0]]).filter(id=>allowed.has(id)),errorLinks:adaptiveFilteredLinks(x.errorLinks||x.faultHypotheses,allowed)};});
    const result=await desktop.designAdaptiveDiagnosis({id:requestId,subject:adaptiveSubjects[r.subject].title,exam:r.exam||adaptiveExam(r.subject),theme:r.theme||{title:r.taskTitle||'围绕当前材料的新任务',taskType:adaptiveTrack(r.subject)?.target||'实际任务',scenario:q.material||q.prompt,practicalOutput:'独立完成新情境任务，并给出依据。'},modules,focus:r.focus?.length?r.focus.filter(id=>allowed.has(id)):[q.moduleId],previous});
    const seen=new Set(r.questions.map(x=>(x.material||'')+'\n'+x.prompt)),added=result.questions.map(x=>adaptiveNormalizeQuestion(x,r.subject)).filter(x=>!seen.has((x.material||'')+'\n'+x.prompt));
    if(!added.length)throw Error('未取得新的材料与问题，原回答已保留');r.questions.push(...added);r.source='自编目标任务 + AI 新情境 · '+result.model;
    if(r.done){r.done=false;r.index=firstAdded;r.feedback=null;r.hinted=false;adaptiveArchiveDiagnosis(false);adaptiveData().view='diagnosis';state.page='courses';state.selected=null;}
    save();await persist();toast('已追加新情境题，原材料和回答保留');
  });
}
const adaptiveBaseThread=thread,adaptiveBaseDraftKey=draftKey,adaptiveBasePlaceholder=placeholder;
thread=function(){const a=adaptiveData();return state.page==='courses'&&a.view==='diagnosis'&&a.run?a.run.messages:adaptiveBaseThread();};
draftKey=function(){const a=adaptiveData();return state.page==='courses'&&a.view==='diagnosis'&&a.run?'adaptive:'+a.run.id:adaptiveBaseDraftKey();};
placeholder=function(){const a=adaptiveData();return state.page==='courses'&&a.view==='diagnosis'&&a.run?'点击选项，或提交当前任务的答案与依据…':adaptiveBasePlaceholder();};
const adaptiveBaseSend=sendAI;
sendAI=async function(){
  const a=adaptiveData();if(state.page!=='courses'||a.view!=='diagnosis'||!a.run||a.run.done)return adaptiveBaseSend();if(busy)return;const r=a.run,input=document.getElementById('aiInput'),value=input.value.trim();if(!value)return;if(r.feedback)return toast('先选择继续当前材料下一题');
  const q=r.questions[r.index],key=draftKey();r.messages.push({role:'user',text:value,at:Date.now()});state.drafts[key]='';busy=true;render('bottom');
  try{
    if(/^(提示|解释|帮我|举例|我不会|为什么|怎么|如何)/.test(value)){
      r.hinted=true;if(aiConfigured())await coach(r.messages,value,{purpose:'实际任务诊断帮助，本题仅计训练；从阅读或情境错误提出待验证假设，再解释有助于当前任务的相关知识，不推定整个模块薄弱',exam:r.exam,theme:r.theme,module:adaptiveModule(q.moduleId),material:q.material,question:q.prompt,scope:q.scope});else append(r.messages,q.reference,'内置任务帮助');
    }else{
      let result,picked=null;
      if(q.grading==='semantic'){if(!aiConfigured())throw Error('开放题需要已连接的 AI 评审；草稿保留，可先完成内置选择题');result=await semantic([q.material,q.prompt].filter(Boolean).join('\n\n'),q.reference,q.criteria,value);}
      else{picked=value.trim().match(/^([A-F])(?:[.、:：\s]|$)/i)?.[1]?.toUpperCase()||null;result={correct:picked===q.expected,reason:q.reference,source:'自编任务答案核对'};}
      const hinted=r.hinted||!!q.seen,faults=!result.correct&&!hinted?adaptiveErrorLinks(q).filter(x=>x.option===picked||x.option===null):[];
      const e={id:crypto.randomUUID(),questionId:q.id,type:'diagnosis',moduleIds:[q.moduleId],relatedModuleIds:adaptiveQuestionModules(q),scope:q.scope||q.prompt,prompt:q.prompt,material:q.material||'',taskTitle:q.taskTitle||r.taskTitle||r.theme?.title||'',taskType:q.taskType||r.theme?.taskType||'',exam:r.exam,selectedOption:picked,answer:value,correct:result.correct,hinted,seen:!!q.seen,reason:result.reason,source:result.source,faultHypotheses:faults,errorLinks:faults,at:Date.now()};
      r.answers.push(e);adaptiveColumn(r.subject).evidence.push(e);r.feedback=e;
      append(r.messages,(e.hinted?'本题记为训练。':e.correct?'当前任务这一题符合标准。':'当前题需要复核。')+'\n'+result.reason+(faults.length?'\n待验证错因：'+faults.map(x=>x.reason).join('；')+'\n下一步用相关训练和新的实际任务验证这些假设。':''),result.source);adaptiveArchiveDiagnosis(false);
    }
  }catch(e){state.drafts[key]=value;append(r.messages,e.message,'请求未完成',true);}finally{busy=false;save();if(desktop)await persist().catch(showError);render('bottom');}
};

function adaptiveChoice(prompt,options,answer,reason){return {type:'choice',prompt,options:options.map((x,i)=>String.fromCharCode(65+i)+'. '+x),answer,expected:answer,reason,format:'输入 A、B 或 C，可附解释。',grading:'exact'};}
function adaptiveExact(prompt,answer,reason){return {type:'exact',prompt,answer,expected:answer,reason,format:'按题目要求输入答案。',grading:'exact'};}
const adaptiveLoopTemplates=[
  {key:'sd-service',subject:'sd',title:'服务任务：排队规则与同步',modules:['sd-data','sd-os'],teaching:'先到先服务使用队列（FIFO）。共享队列被多个线程修改时，需要互斥等同步机制防止更新冲突。结构规则决定取出顺序，同步规则决定并发访问是否正确。',scenario:'两名工作人员从同一个取号队列领取任务。要保持取号顺序，并避免两人同时领走同一个任务。',practice:adaptiveExact('空队列加入 2、7，取出一次，再加入 9。此时队首是什么？','7','先取出2，队首变为7。'),tests:[[adaptiveChoice('编号 x、y、z 按这个顺序入队，先服务谁？',['z','x','任意一个'],'B','先进先出先服务x。'),adaptiveChoice('两线程同时执行“检查非空→取任务”，哪个方案更合理？',['只改队列名字','把检查和取出作为正确同步的整体','各自都读取同一任务'],'B','共享读改操作需要正确同步，防止竞态。')],[adaptiveChoice('打印请求必须按提交先后处理，选择哪项？',['栈后进先出','队列先进先出','随机丢弃'],'B','提交顺序对应FIFO。'),adaptiveChoice('线程各持一个锁并等待另一个锁，首先检查什么？',['字体大小','循环等待','二进制图片'],'B','循环等待可能导致死锁。')]],homework:[{prompt:'① 空队列依次加入 4、6，取出后加入 8，再连续取出。写出最后两次输出。\n② 多线程对共享队列“检查并取出”需要“同步”还是“改名”？\n格式：数字,数字;选择的规则',answers:['6,8','同步']},{prompt:'① 空队列依次加入 3、5、7，连续取出两次。写出两次输出。\n② 多线程共享计数器读改写需要“同步”还是“注释”？\n格式：数字,数字;同步',answers:['3,5','同步']}],criteria:['追踪新的 FIFO 操作序列','识别共享访问需要同步及循环等待风险'],hwCriteria:['任务取出顺序正确','明确并发访问所需同步']},
  {key:'sd-order',subject:'sd',title:'订单案例：关系与业务验收',modules:['sd-db','sd-case'],teaching:'订单与订单明细是不同实体，一张订单可以有多项明细。明细的订单 ID 可通过外键引用订单。业务验收应核对实际操作后的结果，不能只检查按钮是否存在。接口提供清楚的职责边界。',scenario:'用户创建一张含两件商品的订单，之后要能按订单号查到完整明细。连接数据库关系、接口职责和可观察的验收结果。',practice:adaptiveChoice('明细记录引用订单，哪个字段最合理？',['订单ID','背景颜色','用户屏幕宽度'],'A','订单ID关联订单实体。'),tests:[[adaptiveChoice('一张订单含多个明细，关系是哪项？',['一对多','必须一对一','没有关系'],'A','同一订单可被多个明细引用。'),adaptiveChoice('订单保存功能最直接的业务验证是什么？',['代码行数增加','保存后查到正确订单及明细','按钮更大'],'B','可查询结果支持实际业务要求。')],[adaptiveChoice('转账扣款和入账应同时成功，最相关性质是什么？',['原子性','颜色一致','压缩比'],'A','事务原子性保证一起成功或回滚。'),adaptiveChoice('订单服务暴露清晰接口，主要有助于什么？',['降低对内部实现的依赖','共享所有私有字段','禁止测试'],'A','职责和接口减少实现细节耦合。')]],homework:[{prompt:'① 明细中的订单 ID 是“外键”还是“颜色”？\n② 验收保存订单应“查询实际结果”还是“只看按钮”？\n两项用分号分隔。',answers:['外键','查询实际结果']},{prompt:'① 一笔转账所有步骤共同成功或回滚，需要“原子性”还是“字体”？\n② 模块通过“清晰接口”还是“共享所有内部字段”协作更合适？\n两项用分号分隔。',answers:['原子性','清晰接口']}],criteria:['在订单案例里解释关系或事务约束','连接设计职责与可观察的业务验证'],hwCriteria:['数据库约束选择符合场景','验证与接口选择符合业务目标']},
  {key:'sd-protocol',subject:'sd',title:'接收数据：消息边界与测试',modules:['sd-network','sd-engineering'],teaching:'TCP 提供可靠有序的字节流，应用需要定义自身消息边界。一次接收可能只有部分消息，也可能包含多条消息。测试要覆盖拆分、合并、边界输入与错误输入。语法通过不表示业务行为已经正确。',scenario:'你写了一个网络消息处理函数，程序把每次 receive 的数据都当一条完整消息。请用对照和边界用例检查这种假设。',practice:adaptiveChoice('一次接收只得到半条消息，应用应怎样做？',['直接认定完整','保留并按协议拼接解析','把网络改名'],'B','应用要处理字节流中的部分消息。'),tests:[[adaptiveChoice('一次 TCP 接收拿到两条消息的字节，说明什么？',['协议必然错误','应用要按自身边界解析','TCP失去有序性'],'B','接收调用边界不是应用消息边界。'),adaptiveChoice('合法长度范围 2–8（含端点），哪组更适合检查边界？',['4,5','1,2,8,9','只测6'],'B','边界内外的值用于查比较条件。')],[adaptiveChoice('业务消息必须可靠且按序到达，传输层通常用哪项？',['TCP','PNG','随机文件'],'A','TCP提供可靠有序字节流。'),adaptiveChoice('语法分析通过，是否就证明消息解析符合业务？',['是','否，还需实际用例核对','只看注释即可'],'B','语法正确不能替代业务验证。')]],homework:[{prompt:'① TCP 是“字节流”还是“自动保留应用消息边界”？\n② 修复解析后应“回归验证”还是“只保存代码”？\n两项用分号分隔。',answers:['字节流','回归验证']},{prompt:'① 应用消息的边界由“应用协议”还是“每次接收调用”决定？\n② 包含端点的长度 3–9，输入边界内外值为 2,3,9,10，写出这组数字。\n两项用分号分隔。',answers:['应用协议','2,3,9,10']}],criteria:['区分字节流与应用消息边界','设计边界验证并区分语法与行为正确'],hwCriteria:['消息边界判断正确','验证方案符合新场景']},
  {key:'en-log',subject:'en',title:'读懂一次日志记录，再改写说明',modules:['en-structure','en-tense'],teaching:'先找主语和谓语，再根据时间词理解动作。Yesterday 通常引导过去事件；every day 可描述日常习惯。第三人称单数一般现在时常在动词后加s；过去式规则动词常加ed。',scenario:'材料：The tool checks the logs every day. Yesterday, it found an error. 从同一段内容识别动作、判断时间，再改写一条说明。',practice:adaptiveExact('“The worker checks the file.” 的谓语是什么？','checks','checks 是谓语动词。'),tests:[[adaptiveExact('“The robot moves quickly.” 的谓语是什么？','moves','moves 是谓语。'),adaptiveExact('填空：Yesterday, she ___ the window.（open，使用过去式）','opened','Yesterday 对应过去时间，open过去式为opened。')],[adaptiveExact('“The service stops.” 的主语是什么？','The service','The service 是主语。'),adaptiveExact('填空：He ___ the logs every day.（read，第三人称单数）','reads','习惯动作配第三人称单数reads。')]],homework:[{prompt:'① 写出 “The editor saves the file.” 的谓语。\n② 填空：Yesterday, he ___ the file.（save的过去式）\n两项用分号分隔。',answers:['saves','saved']},{prompt:'① 写出 “The user opened the folder.” 的谓语。\n② 填空：She ___ the folder every day.（open第三人称单数）\n两项用分号分隔。',answers:['opened','opens']}],criteria:['独立定位新句子的主语或谓语','在新句子里根据时间与主语使用动词形式'],hwCriteria:['句子成分判断正确','改写的动作时间和主语一致']},
  {key:'en-reason',subject:'en',title:'故障说明：读原因，连接句子',modules:['en-reading','en-relations'],teaching:'because 引出原因，but 表示转折。理解短文时先定位发生了什么，再区分原因、结果或相反信息。改写时保留原来的因果关系和事实。',scenario:'材料：The app stopped because the file was missing. The backup was old, but it was readable. 找出故障原因，并把事实连接成简短说明。',practice:adaptiveChoice('材料里的 app 为什么停止？',['文件缺失','备份太旧','无法由材料知道'],'A','because直接给出文件缺失这一原因。'),tests:[[adaptiveChoice('“The test failed because the input was empty.” 测试失败的原因是什么？',['输入为空','程序一定很大','测试已成功'],'A','because后面是原因。'),adaptiveExact('填空：The tool is small, ___ it is useful.（转折连词）','but','but连接转折。')],[adaptiveChoice('“The service restarted because the setting changed.” 原因是哪项？',['设置改变','服务从未启动','文字变小'],'A','because引出setting changed。'),adaptiveExact('填空：The file is old, ___ it still opens.（转折连词）','but','后文与old形成转折。')]],homework:[{prompt:'材料：The build stopped because the disk was full. The report was short, but it was clear.\n① 原因是“disk was full”还是“report was short”？\n② 表示转折的连词是什么？\n两项用分号分隔。',answers:['disk was full','but']},{prompt:'材料：The check passed because the input was valid. The task was small, but it was important.\n① 原因是“input was valid”还是“task was small”？\n② 表示原因的连词是什么？\n两项用分号分隔。',answers:['input was valid','because']}],criteria:['从未见过的短文定位明确原因','用合适连词保留原因或转折关系'],hwCriteria:['理解新材料里的因果事实','识别关系词并保留表达关系']},
  {key:'en-instruction',subject:'en',title:'操作说明：理解顺序与句子骨架',modules:['en-reading','en-structure'],teaching:'祈使句常省略主语you，使用动词原形给出指令。before表示先完成前一动作再执行后一动作。读操作说明时要区分动作和顺序，不只逐词翻译。',scenario:'材料：Save your changes before you close the editor. Then check the output. 找出动作并按实际顺序写一份简短清单。',practice:adaptiveChoice('上述说明第一步应做什么？',['关闭编辑器','保存修改','检查输出'],'B','先Save，再close。'),tests:[[adaptiveChoice('“Check the file before you send it.” 哪件事先做？',['发送','检查文件','删文件'],'B','before说明先check。'),adaptiveExact('“The new editor starts.” 的谓语是什么？','starts','starts 是谓语。')],[adaptiveChoice('“Open the folder before you read the note.” 哪件事先做？',['读笔记','打开文件夹','关闭文件夹'],'B','先open，再read。'),adaptiveExact('“The small script runs.” 的谓语是什么？','runs','runs 是谓语。')]],homework:[{prompt:'材料：Save the file before you close the window.\n① 第一步动作写为英文动词。\n② “The window closes.” 的谓语是什么？\n两项用分号分隔。',answers:['Save','closes']},{prompt:'材料：Check the output before you send the report.\n① 第一步动作写为英文动词。\n② “The report looks clear.” 的谓语是什么？\n两项用分号分隔。',answers:['Check','looks']}],criteria:['理解新操作说明的实际先后顺序','从新句子定位谓语并支撑表达'],hwCriteria:['新说明的动作顺序正确','新句子的成分判断正确']},
  {key:'game-direction',subject:'game',title:'角色朝向：空间判断与行为验证',modules:['game-math','game-engine'],teaching:'向量长度由分量平方和开方得到。归一化得到单位方向，但零向量不能直接除以长度。单位向量点积是夹角余弦。公式推导和游戏内实际行为需要分别验证。',scenario:'角色要判断目标是否在正前方。先理解方向、检查零距离，再设计实际场景观察；本闭环只验收空间推理与验证设计，工程执行需要单独提供日志。',practice:adaptiveExact('方向向量 (0,2) 的长度是多少？','2','√(0²+2²)=2。'),tests:[[adaptiveExact('非零单位方向 (1,0) 与 (0,1) 的点积是多少？','0','相互垂直，点积为0。'),adaptiveChoice('目标和角色重合时，直接除以距离归一化合理吗？',['合理','不合理，先明确零距离处理','总会朝正前方'],'B','距离为0，不能直接相除。')],[adaptiveExact('非零单位方向 (1,0) 与 (-1,0) 的点积是多少？','-1','反向单位向量点积-1。'),adaptiveChoice('只保存了方向判定代码，是否证明角色行为正确？',['已证明','需运行相关场景并记录实际结果','只改注释即可'],'B','保存不等于实际运行验证。')]],homework:[{prompt:'① 向量 (6,8) 的长度是多少？\n② 零向量归一化前应“先处理零距离”还是“直接除0”？\n两项用分号分隔。本作业是空间推理，不代表工程已经运行。',answers:['10','先处理零距离']},{prompt:'① 单位方向 (0,1) 与 (0,-1) 的点积是多少？\n② 验证角色行为需“实际运行”还是“只保存代码”？\n两项用分号分隔。',answers:['-1','实际运行']}],criteria:['独立计算新方向关系','识别空间边界并区分推理与实际行为验证'],hwCriteria:['新向量计算正确','零距离或行为验证规则明确']},
  {key:'game-render',subject:'game',title:'表面光照：坐标空间与对照实验',modules:['game-render','game-performance'],teaching:'计算法线和光方向点积时，应在同一坐标空间并按公式归一化。单位方向的点积范围为-1到1。排查画面差异要固定场景条件，一次改变一个相关因素并记录真实结果。',scenario:'同一模型转动后，光照方向看起来不对。连接空间转换、单位方向和固定条件的对照思路；本闭环只验证原理与实验设计。',practice:adaptiveExact('同向非零单位向量点积是多少？','1','夹角0°，余弦为1。'),tests:[[adaptiveChoice('世界空间法线与局部空间光方向直接点积，主要问题是什么？',['空间不一致','变量名太短','纹理太小'],'A','两个方向应转换到相同空间。'),adaptiveChoice('比较两次画面结果应先怎样？',['每次换场景','固定场景和条件，记录变化','只看最好结果'],'B','可比条件支撑归因。')],[adaptiveExact('相反方向非零单位向量点积是多少？','-1','夹角180°，余弦为-1。'),adaptiveChoice('要判断渲染是否是瓶颈，先做什么？',['测量实际GPU等相关耗时','直接删材质','只改角色名字'],'A','测量证据支持瓶颈判断。')]],homework:[{prompt:'① 两个方向参与同一点积前应处于“相同空间”还是“随意空间”？\n② 对照实验要“固定条件”还是“每次换场景”？\n两项用分号分隔。',answers:['相同空间','固定条件']},{prompt:'① 垂直非零单位方向的点积是多少？\n② 判断GPU瓶颈要“实际测量”还是“只凭感觉”？\n两项用分号分隔。',answers:['0','实际测量']}],criteria:['解释空间一致性或计算方向关系','设计可比较的渲染观察与耗时测量'],hwCriteria:['空间或方向判断正确','实验与测量条件明确']},
  {key:'game-network',subject:'game',title:'角色同步：时序、运行与可比证据',modules:['game-network','game-performance'],teaching:'同步设计先明确状态权威，再约定更新时序与差异修正。零延迟本机结果不能证明延迟、抖动或丢包条件下正确。对照测试固定场景、规模与条件，再改变要研究的网络因素。',scenario:'本机双客户端正常，但角色在远程连接中位置跳动。先确定谁拥有最终状态，再设计延迟下的观察任务。工程行为需在真实环境中运行，本闭环只确认方案理解。',practice:adaptiveChoice('同步前最需要明确什么？',['状态权威','按钮颜色','文件大小'],'A','先明确谁决定最终状态。'),tests:[[adaptiveChoice('客户端和服务端位置不同，哪项是相关设计问题？',['状态权威与差异修正','菜单字体','图片命名'],'A','同步要定义状态来源和修正策略。'),adaptiveChoice('只测零延迟本机连接，漏掉哪些证据？',['延迟抖动丢包下的行为','所有编译错误','所有贴图'],'A','网络条件会影响实际时序与行为。')],[adaptiveChoice('每帧发送与每秒发送一次，可能改变什么？',['同步时序和开销','只改变文件名','必然完全相同'],'A','发送频率改变时间间隔和消息成本。'),adaptiveChoice('优化前后比较要怎样？',['相同场景与规模进行测量','只记最好一帧','每次改变电脑和玩家数'],'A','可比较条件支撑优化结论。')]],homework:[{prompt:'① 同步设计要先明确“状态权威”还是“壁纸”？\n② 非零延迟下正确需“实际运行”还是“只看本机”？\n两项用分号分隔。',answers:['状态权威','实际运行']},{prompt:'① 网络同步测试应覆盖“延迟抖动丢包”还是“仅零延迟”？\n② 对比性能应“固定场景与规模”还是“每次换规模”？\n两项用分号分隔。',answers:['延迟抖动丢包','固定场景与规模']}],criteria:['识别同步状态与时序规则','提出覆盖网络条件且可比较的运行验证'],hwCriteria:['状态或网络条件选择正确','实际验证与比较方式合理']}
];

function adaptiveTemplateReview(key){const map={
  'sd-service':adaptiveChoice('消息必须按到达顺序处理，只根据这个规则选择数据结构。',['栈','队列','反向排序'],'B','队列符合先进先出。'),
  'sd-order':adaptiveChoice('明细表里有不存在的订单 ID，通常应由什么约束检查引用关系？',['字体','外键','图片大小'],'B','外键约束记录的引用关系。'),
  'sd-protocol':adaptiveChoice('客户端按长度前缀发送消息，接收端应如何处理？',['按接收调用截断','按协议长度解析并保留未完整部分','总当作单字节消息'],'B','应用协议决定消息边界。'),
  'en-log':adaptiveExact('“The engineer checks the result.” 的主语是什么？','The engineer','The engineer 是主语。'),
  'en-reason':adaptiveExact('填空：The file is small, ___ it contains useful data.（转折）','but','这里是转折关系。'),
  'en-instruction':adaptiveChoice('“Read the instructions before you start.” 哪件事先做？',['开始','阅读说明','关闭程序'],'B','before表明先读说明。'),
  'game-direction':adaptiveExact('向量 (0,7) 的长度是多少？','7','长度是√49=7。'),
  'game-render':adaptiveChoice('比较材质修改前后的画面，哪项更有依据？',['同一场景固定条件记录','每次换灯光和镜头','只保存代码'],'A','固定条件支持可比较观察。'),
  'game-network':adaptiveChoice('要评价同步策略在网络波动下的行为，需哪项证据？',['仅本机截图','代表性网络条件下的实际记录','仅类名清单'],'B','实际网络条件与行为记录支持范围内结论。')
};return map[key];}
function adaptiveTemplateActivities(t){const forms=t.subject==='en'?['reading','translation','explanation']:t.subject==='game'?['scenario','debugging','experiment']:['scenario','comparison','explanation'];const instructions=t.subject==='en'?[
  '阅读材料，找出两个关键动作或事实，说明相关时间、顺序或原因。',
  '用自己的表达改写场景，改变一个时间、主语或连接关系；说明修改后的含义。',
  '向初学者解释这段材料：先说主语和动作，再说时间或句间关系，最后给出另一句不同的例子。'
]:t.subject==='game'?[
  '列出这个场景的输入、预期行为和一个必须考虑的边界。区分公式结论与实际运行证据。',
  '找出错误假设并修订：只保存代码或只测理想场景，就能证明所有输入都正确。请针对本任务给出一个反例。',
  '设计小实验：固定条件，改变一个与问题相关的因素，写出输入、预期输出与观察记录。可以运行 JavaScript 小实验；引擎行为仍需在实际工程里核对。'
]:[
  '把场景拆成两个相互关联的问题，说明每个模块在其中承担什么职责。',
  '比较两种方案：一种只检查表面现象，另一种同时检查操作规则与约束。给出能区分两者的具体输入。',
  '向同伴解释为什么需要同时使用这两个模块，再提出一个不同场景；说明哪些规则可以迁移，哪些必须重新验证。'
];return forms.map((form,i)=>({id:'activity-'+i,form,title:['理解情境与联系','应用、比较与纠错','迁移与验证'][i],instructions:instructions[i],content:i===0?t.scenario:i===1?t.teaching:'围绕最初场景完成上面的实际任务。在底部保存你的回答和与 AI 的交流；训练产出不直接计入独立验收。',moduleIds:t.modules}));}
function adaptiveTemplateCourse(t){const id='course-'+crypto.randomUUID();return {course:{id,title:t.title,subject:adaptiveSubjects[t.subject].title,goal:t.criteria.join('；'),prereq:'按当前模块证据选取内容，已有基础可直接用新题验收，不要求从头学习。',source:'知序自编基础示范题；只评价列出的原理与推理范围。',minutes:25,hwMinutes:7,priority:'P1',version:'1.0',teaching:t.teaching,example:t.scenario,criteria:t.criteria,hwCriteria:t.hwCriteria,diagnosis:t.practice,practice:t.practice,review:adaptiveTemplateReview(t.key),tests:structuredClone(t.tests),homework:t.homework.map(h=>({...h,grading:'exact'}))},adaptive:{templateKey:t.key,modules:t.modules,focus:[t.modules[0]],rationale:'使用一个情境连接相关模块，分别保留独立验收与新任务作业。通过证据只覆盖所列原理与推理范围。',criterionModuleIds:[[t.modules[0]],[t.modules[1]]],testModuleIds:t.tests.map(()=>[[t.modules[0]],[t.modules[1]]]),homeworkCriterionModuleIds:[[t.modules[0]],[t.modules[1]]],activities:adaptiveTemplateActivities(t),relations:[{from:t.modules[0],to:t.modules[1],reason:'同一个任务中的相关前提、应用或验证'}]},model:'内置自编示范'};}

function adaptiveThemeCourse(t){
  const id='course-'+crypto.randomUUID(),exam=adaptiveExam(t.subject),source=t.source||adaptiveTrack(t.subject)?.diagnostic?.source||'知序自编实用任务；非官方试题，不换算考试分数。';
  const course={id,title:t.title,subject:adaptiveSubjects[t.subject].title,goal:t.practicalOutput||t.criteria.join('；'),prereq:'依据当前实际任务表现选择活动；已有基础可直接尝试新的任务验收。',source,minutes:t.minutes||35,hwMinutes:t.hwMinutes||8,priority:'P1',version:'1.0',teaching:t.teaching,example:t.scenario,criteria:structuredClone(t.criteria),hwCriteria:structuredClone(t.hwCriteria),diagnosis:structuredClone(t.diagnosis),practice:structuredClone(t.practice),review:structuredClone(t.review),tests:structuredClone(t.tests),homework:structuredClone(t.homework),authoredBy:'知序自编主题任务'};
  return {course,adaptive:{version:2,themeKey:t.key,templateKey:t.key,theme:{title:t.theme||t.title,taskType:t.examTaskType,scenario:t.scenario,practicalOutput:t.practicalOutput},exam,target:[exam.title,exam.track].join(' · '),taskType:t.examTaskType,practicalOutput:t.practicalOutput,modules:t.modules,focus:[t.modules[0]],rationale:'围绕“'+(t.theme||t.title)+'”先完成实际任务，再按错题复核相关知识，回到不同材料的独立任务和迁移作业；仅记录当前任务范围证据。',criterionModuleIds:t.criterionModuleIds,testModuleIds:t.testModuleIds||t.tests.map(()=>t.criterionModuleIds),testScopes:t.tests.map(group=>group.map(q=>q.scope||q.prompt)),testErrorLinks:t.tests.map(group=>group.map(q=>adaptiveErrorLinks(q))),homeworkCriterionModuleIds:t.homeworkCriterionModuleIds,activities:structuredClone(t.activities),relations:t.relations||[],evidenceLinks:[]},model:'知序自编主题任务'};
}
function adaptiveBuiltinDraft(key){
  if(busy)return;const theme=adaptiveTheme(key),legacyTemplate=!theme&&adaptiveLoopTemplates.find(x=>x.key===key),t=theme||legacyTemplate;if(!t)return;
  const prior=Object.entries(adaptiveData().loops).find(([,m])=>m.templateKey===key||m.themeKey===key);
  if(prior){adaptiveLoopContents(prior[0]);toast('这套固定题库已启用，继续已有闭环。新的独立证据需要不同的材料和任务。');return;}
  adaptiveData().draft={...(theme?adaptiveThemeCourse(theme):adaptiveTemplateCourse(t)),subject:t.subject,at:Date.now()};save();adaptiveDraftModal();
}

function adaptiveQuestionPreview(q,label){
  if(!q)return '';const material=q.material||'',displayPrompt=material&&q.prompt.startsWith(material)?q.prompt.slice(material.length).trim():q.prompt;
  return `<h3 class="space">${esc(label)}</h3>${material?`<pre class="pre space">${esc(material)}</pre>`:''}<p style="white-space:pre-wrap">${esc(displayPrompt)}</p>${q.options?`<ol class="criteria">${q.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`:''}<p class="tiny">${esc(q.format||'在课堂完成任务。')}</p>`;
}

function adaptiveLoopContentHTML(c,m,model){
  return `<h3 class="space">${esc(c.title)}</h3><p class="sub">${esc(m.exam?.title||adaptiveSubjects[m.subject]?.title||c.subject)} · ${esc(m.exam?.track||m.target||'已有目标')} · ${esc(m.taskType||m.theme?.taskType||'实际任务')}</p><div class="notice space"><strong>闭环主题：${esc(m.theme?.title||c.title)}</strong><p>${esc(m.practicalOutput||m.theme?.practicalOutput||c.goal)}</p></div><p class="sub space">约 ${c.minutes} 分钟（作业 ${c.hwMinutes} 分钟，已计入总时长） · 来源：${esc(model||'已启用课程')}</p><p class="tiny">${esc(c.source)}</p><p class="space">${esc(m.rationale||'通过实际任务选择关联训练，再回到新的任务验收。')}</p><h3 class="space">本主题材料与任务背景</h3><pre class="pre space">${esc(m.theme?.scenario||c.example)}</pre><h3 class="space">小闭环中的活动与完整内容</h3>${(m.activities||[]).map((x,i)=>`<section class="notice space"><div class="row"><strong>${i+1}. ${esc(x.title)}</strong>${badge(adaptiveForms[x.form]||x.form,'gray')}</div><p class="space" style="white-space:pre-wrap">${esc(x.instructions)}</p><pre class="pre space">${esc(x.content===(m.theme?.scenario||c.example)?"使用上方完整主题材料，按本活动要求完成任务。":x.content)}</pre><p class="tiny">本任务相关知识：${(x.moduleIds||[]).map(id=>esc(adaptiveModule(id)?.title||id)).join(' / ')}</p></section>`).join('')}<details class="space"><summary>展开本主题的知识补学材料</summary><pre class="pre space">${esc(c.teaching)}</pre></details>${adaptiveQuestionPreview(c.practice,'试作与训练任务')}<h3 class="space">新材料独立验收 · ${c.tests.length} 组可用任务</h3><ol class="criteria">${c.criteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p class="tiny">进入验收时才显示新题材料和问题；参考答案在提交后用于评分。训练或提示后的回答不算新的独立通过证据。</p><h3 class="space">迁移作业标准 · ${c.homework.length} 份不同任务</h3><ol class="criteria">${c.hwCriteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${c.homework.map((h,i)=>`<details class="space"><summary>查看第 ${i+1} 份作业材料与产出要求</summary><pre class="pre space">${esc(h.prompt)}</pre><p class="tiny">${h.executionRequired?'需要真实运行与输出记录；文字方案不能代替执行证据。':h.grading==='semantic'?'开放任务由当前 AI 按上述标准逐项评审；未配置 AI 时可学习和保存草稿。':'按逐项标准核对实际提交。'}</p></details>`).join('')}<h3 class="space">如何继续扩散</h3><p class="sub">实际错题产生待验证假设 → 回到相关活动补学 → 用新材料复核 → 作业与记录确认 → 根据新证据选择其他关联主题或安排复习。</p>${(m.relations||[]).length?`<ul class="criteria">${m.relations.map(r=>`<li>${esc(adaptiveModule(r.from)?.title||r.from)} ↔ ${esc(adaptiveModule(r.to)?.title||r.to)}：${esc(r.reason)}</li>`).join('')}</ul>`:''}`;
}
function adaptiveThemePreview(key){
  const t=adaptiveTheme(key);if(!t)return;const prior=Object.entries(adaptiveData().loops).find(([,m])=>m.templateKey===key||m.themeKey===key);if(prior)return adaptiveLoopContents(prior[0]);
  const d=adaptiveThemeCourse(t);openModal('主题小闭环 · 完整内容',adaptiveLoopContentHTML(d.course,{...d.adaptive,subject:t.subject},d.model)+`<div class="actions space">${btn('检查并启用这个主题',`adaptiveBuiltinDraft('${key}')`,'primary')}${aiConfigured()?btn('基于错题设计全新任务',`adaptiveDesignTheme('${key}')`):''}${btn('关闭','closeModal()')}</div>`);
}
function adaptiveLoopContents(id){
  const c=courses[id],m=adaptiveData().loops[id];if(!c||!m)return;openModal('已启用闭环 · 完整内容',adaptiveLoopContentHTML(c,m,m.model)+`<div class="actions space">${btn('继续这个闭环',`adaptiveContinueLoop('${id}')`,'primary')}${btn('关闭','closeModal()')}</div>`);
}
function adaptiveContinueLoop(id){closeModal();startCourse(id);}
function adaptiveDesignTheme(key){const t=adaptiveTheme(key);if(!t)return;return adaptiveGenerateTheme(t);}
async function adaptiveDesignLoop(moduleId){
  const m=adaptiveModule(moduleId);if(!m)return;const t=adaptiveRankThemes(m.subject).find(row=>row.theme.modules.includes(moduleId))?.theme;
  if(t)return adaptiveGenerateTheme(t,moduleId);
  if(!aiConfigured()){adaptiveOpenColumn(m.subject);return toast('此关联暂无固定主题，可先选择已有情境；连接 AI 后可设计新任务。');}
  const d=adaptiveTrack(m.subject)?.diagnostic;
  return adaptiveGenerateTheme({key:'related-'+moduleId,subject:m.subject,title:d?.title||'新的综合实践任务',theme:d?.title||'综合实践',examTaskType:adaptiveTrack(m.subject)?.target||'实际情境判断',scenario:d?.material||'根据当前目标和实际错题设计一个有明确用途的综合情境。',practicalOutput:'在新的完整情境中独立完成分析、给出依据与可核对的产出。',modules:[moduleId,...m.related.slice(0,2)],minutes:35},moduleId);
}
function adaptiveCoursePrompts(c){return [c.diagnosis?.prompt,c.practice?.prompt,c.review?.prompt,...(c.tests||[]).flat().map(q=>q.prompt),...(c.homework||[]).map(h=>h.prompt)].filter(Boolean);}
async function adaptiveGenerateTheme(t,requestedFocus){
  if(busy)return;if(!aiConfigured()){adaptiveThemePreview(t.key);toast('可以先学习自编主题。新的开放任务设计需要连接 AI。');return;}
  closeModal();const success=await task(async()=>{
    requireDesktop();const subject=t.subject,faults=adaptiveRecentFaults(subject),requested=requestedFocus&&adaptiveModule(requestedFocus),selected=[...new Set([...(requested?[requested.id]:[]),...(t.modules||[])])].slice(0,4),allowed=new Set(selected);
    const actual=faults.find(e=>(e.moduleIds||[]).some(id=>allowed.has(id))),focus=requested?[requested.id]:actual?.moduleIds?.filter(id=>allowed.has(id)).slice(0,1)||[selected[0]];
    const idMap=new Map(),modules=selected.map(id=>{const m=adaptiveModule(id),s=adaptiveModuleStatus(id),evidence=s.evidence.slice(-8).map((e,index)=>{idMap.set('evidence-'+id+'-'+index,e.id);return {...e,material:e.material||'',prompt:e.prompt||'',taskTitle:e.taskTitle||'',taskType:e.taskType||'',selectedOption:e.selectedOption||null,scope:e.scope||e.prompt||'',errorLinks:adaptiveFilteredLinks(e.errorLinks||e.faultHypotheses,allowed)};});return {...m,score:s.score,status:s.status,evidence};});
    const previous=Object.entries(courses).filter(([id,c])=>c.subject===adaptiveSubjects[subject].title&&(adaptiveData().loops[id]||state.sessions[id])).slice(-8).map(([id,c])=>{const meta=adaptiveData().loops[id];return {title:c.title,modules:adaptiveCourseModules(id).filter(x=>allowed.has(x)),forms:[...new Set((meta?.activities||[]).map(a=>a.form))],prompts:adaptiveCoursePrompts(c).slice(0,32)};});
    const priorTasks=adaptiveColumn(subject).evidence.filter(e=>e.type==='diagnosis'&&e.prompt&&e.answer).slice(-24);if(priorTasks.length)previous.push({title:'实际提交过的目标任务',modules:[...new Set(priorTasks.flatMap(e=>e.moduleIds||[]))].filter(id=>allowed.has(id)).slice(0,4),forms:[],prompts:priorTasks.map(e=>[e.material,e.prompt].filter(Boolean).join('\n\n'))});
    requestId='adaptive-loop-'+crypto.randomUUID();
    const result=await desktop.designAdaptiveLoop({id:requestId,subject:adaptiveSubjects[subject].title,exam:adaptiveExam(subject),theme:{title:t.theme||t.title,taskType:t.examTaskType||'实际任务',scenario:t.scenario||'',practicalOutput:t.practicalOutput||'独立完成新的主题任务并给出可核对依据。'},modules,focus:focus.length?focus:[selected[0]],minutes:t.minutes||35,goal:t.practicalOutput||adaptiveExam(subject).track,previous});
    result.adaptive.evidenceLinks=(result.adaptive.evidenceLinks||[]).map(link=>({...link,originalEvidenceId:idMap.get(link.evidenceRef)||null}));
    adaptiveData().draft={...result,subject,at:Date.now()};save();await persist();return true;
  });if(success)adaptiveDraftModal();
}
function adaptiveDraftModal(){
  const d=adaptiveData().draft;if(!d)return;const c=d.course,m={...d.adaptive,subject:d.subject};
  openModal('检查并启用主题小闭环',adaptiveLoopContentHTML(c,m,d.model)+`<div class="actions space">${btn('确认启用这个闭环','adaptiveActivateDraft()','primary')}${btn('保留草案，稍后检查','closeModal()')}</div>`);
}
function adaptiveActivateDraft(){
  if(busy)return;const a=adaptiveData(),d=a.draft;if(!d)return;const c=d.course,m=d.adaptive;
  if(!/^course-[0-9a-f-]{36}$/.test(c.id)||!Array.isArray(c.tests)||!Array.isArray(m.activities))return toast('草案格式不完整，请重新设计');
  const prior=(m.themeKey||m.templateKey)&&Object.entries(a.loops).find(([,x])=>x.templateKey===(m.themeKey||m.templateKey)||x.themeKey===(m.themeKey||m.templateKey));
  if(prior){a.draft=null;save();return adaptiveLoopContents(prior[0]);}
  state.customCourses||={};state.customCourses[c.id]=c;courses[c.id]=c;state.mastery[c.id]=0;a.loops[c.id]={...m,subject:d.subject,title:c.title,model:d.model,created:Date.now(),activityIndex:0,activityDone:[],training:[]};a.draft=null;a.subject=d.subject;a.view='column';closeModal();save();startCourse(c.id);
}

const adaptiveBaseStart=startCourse,adaptiveBaseLesson=lessonPage;
startCourse=function(id){const meta=adaptiveData().loops[id];if(meta&&!ses(id)){state.sessions[id]=newSession(id);state.sessions[id].stage='learn';}adaptiveBaseStart(id);};

function adaptiveLearningCard(c,s,meta){
  const index=Math.min(meta.activityIndex||0,meta.activities.length-1),a=meta.activities[index],linked=(meta.evidenceLinks||[]).map(link=>({link,e:adaptiveColumn(meta.subject).evidence.find(e=>e.id===link.originalEvidenceId)})).filter(x=>x.e);
  return `<div class="section">${head(c.title,meta.practicalOutput||c.goal,btn('主题目录',`adaptiveOpenColumn('${meta.subject}')`,'small'))}
  <div class="actions">${badge(meta.theme?.title||'已启用闭环')}${badge(meta.exam?.track||meta.target||'已有目标','gray')}${badge('活动 '+(index+1)+'/'+meta.activities.length,'gray')}${badge(status(c.id),'gray')}${btn('展开整个闭环内容',`adaptiveLoopContents('${c.id}')`,'small')}</div>
  <div class="steps">${meta.activities.map((x,i)=>`<button class="step ${i===index?'on':''}" data-action="adaptiveActivity(${i})">${i+1}. ${esc(x.title)}${meta.activityDone.includes(i)?' ✓':''}</button>`).join('')}</div>
  ${s.paused?`<div class="notice amber">当前课堂已暂停。${btn('继续学习计时',`startCourse('${c.id}')`,'small')}</div>`:''}
  ${panel(a.title,`<div class="actions space">${badge(adaptiveForms[a.form]||a.form,'gray')}</div><p class="space" style="white-space:pre-wrap">${esc(a.instructions)}</p><pre class="pre space">${esc(a.content)}</pre><p class="tiny">围绕这个主题完成任务、给出依据或提出反例。相关知识：${(a.moduleIds||[]).map(id=>esc(adaptiveModule(id)?.title||id)).join(' / ')}。</p><p class="tiny">在底部保存回答并与 AI 交流。活动标记记录学习过程；独立验收与迁移作业使用新的情境材料。</p><div class="actions space">${btn(index<meta.activities.length-1?'记录本活动，切换下一种形式':'活动完成，回到新任务验收','adaptiveCompleteActivity()','primary')}${btn('已有基础，直接新任务验收','startAcceptance()','small')}${btn('尝试本主题训练题',"setStage('practice')",'small')}${btn('迁移作业',`openAssignment('${c.id}')`,'small')}${a.form==='experiment'&&desktop?btn('运行 JavaScript 小实验','experimentModal()','small'):''}</div>`)}
  ${linked.length?panel('为什么这次补这些内容',linked.map(({link,e})=>`<div class="notice space"><p>${esc(e.taskTitle||'实际错题')}：${esc(e.scope||e.prompt||'实测范围')}</p><p class="sub">待验证假设：${esc(link.reason)}</p><p class="tiny">关联知识：${link.moduleIds.map(id=>esc(adaptiveModule(id)?.title||id)).join(' / ')}；活动后用新任务复核。</p></div>`).join('')):''}
  ${panel('本主题的闭环证据',`<p class="sub">新材料独立验收 ${s.acceptance.pass?'已通过':'待完成'} · 迁移作业 ${s.homework.pass?'已达标':'待完成'} · 学习记录 ${s.confirmed?'已确认':'待确认'}</p><ol class="criteria">${c.criteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p class="tiny">只有本次任务的标准和实际提交支持通过。一个主题结束后按错题关联或复习证据选择下一主题。</p>`)}${messages()}</div>`;
}
lessonPage=function(){
  const meta=adaptiveData().loops[state.selected];if(!meta)return adaptiveBaseLesson();const c=courses[state.selected],s=ses();
  if(s?.stage==='learn')return adaptiveLearningCard(c,s,meta);
  return `<div class="actions">${btn('回到主题活动',"setStage('learn')",'small')}${btn('完整闭环内容',`adaptiveLoopContents('${c.id}')`,'small')}${btn('主题目录与下一轮',`adaptiveOpenColumn('${meta.subject}')`,'small')}${badge(meta.theme?.title||c.title,'gray')}</div>`+adaptiveBaseLesson();
};

function adaptiveActivity(index){if(busy)return;const meta=adaptiveData().loops[state.selected];if(!meta||index<0||index>=meta.activities.length)return;rememberDraft();meta.activityIndex=index;ses().stage='learn';save();render('top');}
function adaptiveCompleteActivity(){if(busy)return;const meta=adaptiveData().loops[state.selected];if(!meta)return;const i=meta.activityIndex||0;if(!meta.activityDone.includes(i))meta.activityDone.push(i);if(i<meta.activities.length-1){meta.activityIndex=i+1;save();render('top');}else{save();startAcceptance();}}

// Preserve the existing grading and confirmation chain, attaching scope to actual answers.
const adaptiveBaseLearning=learningAnswer;
// An English question mark can be part of the answer; help requires explicit intent.
helpRequest=function(value){return /^(?:提示|给(?:我|点).{0,6}提示|请(?:帮|解释|举例|教|给)|帮(?:我|忙)|解释(?:一下|这|为什么)|举(?:个|一|例)|看答案|换种(?:说法|讲法)|不懂|没懂|不会|我(?:不懂|不会|没懂)|怎么(?:做|理解|解|写)|如何(?:做|理解|解|写)|为什么)/.test(String(value).trim());};
const adaptiveBaseGrade=grade;
grade=function(q,value){const expected=String(q.expected||q.answer||'').trim();if(q.options&&/^[A-F]$/.test(expected)){const picked=String(value).trim().match(/^([A-F])(?:[\s.、:：]|$)/i)?.[1]?.toUpperCase();return picked===expected;}return adaptiveBaseGrade(q,value);};

learningAnswer=async function(c,s,value,list){
  const meta=adaptiveData().loops[c.id];
  if(meta&&s.stage==='learn'&&!/^(暂停|先到这里|先停一下|结束学习|结束|整理记录|总结|开始验收|独立验收|下一步|开始练习)$/.test(value)){
    const a=meta.activities[meta.activityIndex||0];meta.training.push({id:crypto.randomUUID(),at:Date.now(),activity:a.id,theme:meta.theme?.title||c.title,exam:meta.exam,answer:value,moduleIds:a.moduleIds});
    if(aiConfigured())await coach(list,value,{...contextFor(c,s),adaptive:{exam:meta.exam,theme:meta.theme,practicalOutput:meta.practicalOutput,modules:meta.modules.map(id=>adaptiveModule(id)),activity:a,evidenceLinks:meta.evidenceLinks,purpose:'围绕考试或实用主题任务学习；从实际错误提出待验证假设，解释有助于当前任务的知识，补学后回到新材料。当前回答只计训练，不改变独立验收或掌握度，不按模块编号线性重教。'}});
    else append(list,'活动回答已保留为训练记录，开放回答尚未自动评分。\n'+c.teaching+'\n请给出当前材料的依据，并说明知识如何用于实际任务；已有基础可直接尝试新材料验收。','自编主题补学');
    return;
  }
  const result=await adaptiveBaseLearning(c,s,value,list);
  if(meta&&s.hinted)for(const e of adaptiveColumn(meta.subject).evidence)if(e.type==='acceptance'&&e.course===c.id&&e.attempt===s.attempt)e.hinted=true;
  return result;
};

const adaptiveBaseApply=applyAnswer;
applyAnswer=function(c,s,q,stage,value,result,list){
  const meta=adaptiveData().loops[c.id],index=s.index;adaptiveBaseApply(c,s,q,stage,value,result,list);
  if(meta&&stage==='acceptance'){
    const moduleIds=meta.testModuleIds?.[s.attempt]?.[index]||meta.criterionModuleIds?.[index]||[],hinted=!!s.hinted,selectedOption=String(value).trim().match(/^([A-F])(?:[.、:：\s]|$)/i)?.[1]?.toUpperCase()||null,faults=!result.correct&&!hinted?(adaptiveErrorLinks(q).length?adaptiveErrorLinks(q):meta.testErrorLinks?.[s.attempt]?.[index]||[]).filter(x=>x.option===selectedOption||x.option===null):[];
    adaptiveColumn(meta.subject).evidence.push({id:crypto.randomUUID(),at:Date.now(),type:'acceptance',course:c.id,moduleIds,relatedModuleIds:[...new Set([...moduleIds,...faults.flatMap(x=>x.moduleIds)])],scope:q.scope||meta.testScopes?.[s.attempt]?.[index]||q.prompt,prompt:q.prompt,material:q.material||'',taskTitle:meta.theme?.title||c.title,taskType:meta.taskType||meta.theme?.taskType||'',exam:meta.exam,selectedOption,answer:value,correct:result.correct,hinted,reason:result.reason,source:result.source,attempt:s.attempt,faultHypotheses:faults,errorLinks:faults});
  }
};
const adaptiveBaseHomework=homeworkAnswer;
homeworkAnswer=async function(c,s,value,list){
  const before=s.homework.versions.length;await adaptiveBaseHomework(c,s,value,list);const meta=adaptiveData().loops[c.id],v=s.homework.versions.at(-1);
  if(meta&&s.homework.versions.length>before)for(let i=0;i<v.rubric.length;i++)adaptiveColumn(meta.subject).evidence.push({id:crypto.randomUUID(),at:v.at,type:'homework',course:c.id,moduleIds:meta.homeworkCriterionModuleIds?.[i]||[],scope:c.hwCriteria[i],prompt:c.homework[Math.min(s.homework.variant,c.homework.length-1)].prompt,material:'',taskTitle:meta.theme?.title||c.title,taskType:'迁移作业',exam:meta.exam,answer:value,correct:typeof v.rubric[i].pass==='boolean'?v.rubric[i].pass:null,hinted:v.hinted,reason:v.rubric[i].reason,source:v.source});
};
const adaptiveBaseConfirm=confirmSummary;
const adaptiveBaseEnd=endCourse;
endCourse=function(id){
  adaptiveBaseEnd(id);const meta=adaptiveData().loops[id],p=state.pendingSummary;if(!meta||p?.course!==id)return;
  p.text+='\n\n闭环主题：'+(meta.theme?.title||courses[id].title)+'\n目标任务：'+(meta.exam?.track||meta.target||courses[id].goal)+'\n活动中的关联知识：'+meta.modules.map(x=>adaptiveModule(x)?.title||x).join(' / ')+'\n实际保存的活动回答：'+meta.training.length+' 项（训练，不代替验收）\n标记完成的活动：'+meta.activityDone.length+'/'+meta.activities.length+'（用户标记）\n新材料验收范围：'+courses[id].criteria.join('；')+'\n迁移作业范围：'+courses[id].hwCriteria.join('；')+'\n下一轮根据实际错题和新任务证据选择关联主题，不据此认定整个知识模块已掌握。';save();render('top');
};
confirmSummary=function(){
  const p=state.pendingSummary,s=ses(p?.course),meta=adaptiveData().loops[p?.course];
  if(meta&&p&&s&&complete(s)&&p.text.trim()&&p.date&&p.date>=TODAY){
    const column=adaptiveColumn(meta.subject),last=s.homework.versions.at(-1),tested=new Set(s.answers.flatMap((answer,i)=>answer.correct&&!s.hinted?(meta.testModuleIds?.[s.attempt]?.[i]||meta.criterionModuleIds?.[i]||[]):[])),produced=new Set((last?.rubric||[]).flatMap((r,i)=>r.pass===true&&!last.hinted?(meta.homeworkCriterionModuleIds?.[i]||[]):[])),covered=meta.modules.filter(id=>tested.has(id)&&produced.has(id));
    if(covered.length&&!column.evidence.some(e=>e.type==='confirmed'&&e.course===p.course))column.evidence.push({id:crypto.randomUUID(),at:Date.now(),type:'confirmed',course:p.course,moduleIds:covered,scope:courses[p.course].criteria.join('；'),taskTitle:meta.theme?.title||courses[p.course].title,exam:meta.exam,answer:'新材料独立验收、迁移作业与学习记录确认：'+courses[p.course].criteria.join('；'),correct:true,hinted:false,source:'用户确认任务范围内闭环证据',support:column.evidence.filter(e=>e.course===p.course&&['acceptance','homework'].includes(e.type)&&e.correct&&!e.hinted).map(e=>e.id)});
    p.text+='\n\n闭环主题：'+(meta.theme?.title||courses[p.course].title)+'\n验收和作业共同支持的任务范围：'+courses[p.course].criteria.join('；')+'\n关联知识：'+covered.map(x=>adaptiveModule(x)?.title||x).join(' / ')+'（仅限上述任务与标准，不代表整个模块）\n活动形式：'+meta.activities.map(x=>adaptiveForms[x.form]||x.form).join('、')+'\n下一轮：由错题关联选择其他实用主题、用新材料复核或进行间隔复习。';
  }
  adaptiveBaseConfirm();
};
const adaptiveBaseTaskPool=taskPool;
taskPool=function(){
  const pool=adaptiveBaseTaskPool();return pool.sort((x,y)=>{const rank=t=>{if(t.type==='复习')return 300;if(t.type==='补交作业')return 250;const meta=adaptiveData().loops[t.course];if(meta){const themes=adaptiveRankThemes(meta.subject),row=themes.find(x=>x.theme.key===(meta.themeKey||meta.templateKey));return 100+(row?.rank||0)+adaptiveRecentFaults(meta.subject).filter(e=>(e.moduleIds||[]).some(id=>meta.modules.includes(id))).length*10;}return adaptiveCourseModules(t.course).length?Math.max(...adaptiveCourseModules(t.course).map(id=>adaptiveModuleStatus(id).priority)):0;};return rank(y)-rank(x);});
};
const adaptiveBaseToday=todayPage;
todayPage=function(){
  let html=adaptiveBaseToday();if(!ses(state.active)){
    const subject=Object.entries(adaptiveSubjects).find(([,c])=>c.title===state.goal.main)?.[0]||'sd',row=adaptiveRankThemes(subject).find(x=>!x.existing||!adaptiveLoopComplete(x.existing[0]))||adaptiveRankThemes(subject)[0],exam=adaptiveExam(subject);
    html=html.replace(/<section class="hero">[\s\S]*?<\/section>/,`<section class="hero"><div class="tiny">围绕目标推进实际任务</div><h2 class="space">${esc(row?.theme.title||adaptiveTrack(subject)?.diagnostic?.title||exam.title)}</h2><p class="sub space">${esc(exam.track)} · ${row?.matched.length?'先从实际错题复核相关知识，再回到新的主题任务。':'先做阅读或综合情境定位水平，也可以查看完整主题内容后直接开始。'}</p><div class="actions space">${btn('先做目标任务',`adaptiveStartDiagnosis('${subject}','')`,'primary')}${btn('查看主题与活动',`adaptiveOpenColumn('${subject}')`)}</div></section>`);
  }
  return `<div class="notice setup-banner row"><div><strong>按考试和实用主题学习</strong><p class="sub">做任务发现问题，补相关知识，再用新材料验证；多个小闭环按错题关联扩展。</p></div>${btn('主题学习专栏','adaptiveOverview()','small')}</div>`+html;
};
const adaptiveBasePlanPage=planPage;
planPage=function(){return adaptiveBasePlanPage().replace('本轮任务范围是三个完整示例课程和已确认的复习。未设计课程不自动加入。','安排已启用的主题闭环、已有课程和确认后的复习。先安排到期复习、补交作业，再按实测错题与主题关联选择任务；尚未启用的主题可先到专栏查看完整内容。');};
const adaptiveBaseStats=statsPage;
statsPage=function(){return `<div class="section">${panel('主题小闭环的实际证据',Object.entries(adaptiveSubjects).map(([id,c])=>`<div class="item"><div class="grow"><strong>${esc(adaptiveTrack(id)?.title||c.title)}</strong><div class="sub">${adaptiveColumn(id).diagnostics.filter(x=>x.done).length} 轮目标任务诊断 · ${adaptiveCourseCount(id)} 个确认主题闭环 · ${adaptiveRecentFaults(id).length} 条实测错题线索</div><p class="tiny">计数是实际任务与闭环记录，不换算考试分数或整体知识掌握。</p></div>${btn('下一主题',`adaptiveOpenColumn('${id}')`,'small')}</div>`).join(''))}</div>`+adaptiveBaseStats();};
const adaptiveBaseRender=render;
render=function(where){
  adaptiveData();adaptiveBaseRender(where);
  if(state.page==='courses'&&!state.selected&&adaptiveData().view!=='legacy'){
    document.querySelector('#workspace > .setup-banner')?.remove();
    if(adaptiveData().view==='diagnosis'&&!busy){const tiny=document.querySelector('.composefoot .tiny'),button=document.querySelector('.composefoot > .btn');if(tiny)tiny.textContent='目标任务诊断 · 点击选项或提交依据；帮助后只计训练';if(button)button.textContent='提交 ↑';}
  }
};
['adaptiveOverview','adaptiveLegacy','adaptiveOpenColumn','adaptiveSelectTarget','adaptiveStartDiagnosis','adaptiveRestartDiagnosis','adaptiveResumeDiagnosis','adaptiveNextQuestion','adaptiveUnknown','adaptiveDiagnosisHelp','adaptiveMoreDiagnosis','adaptiveEvidenceModal','adaptiveDesignLoop','adaptiveDesignTheme','adaptiveThemePreview','adaptiveLoopContents','adaptiveContinueLoop','adaptiveBuiltinDraft','adaptiveDraftModal','adaptiveActivateDraft','adaptiveActivity','adaptiveCompleteActivity'].forEach(name=>actions.add(name));
if(!desktop)render();
