/* 封神（重製）資料檔：角色、陣營、稀有度、招募池。
   大廳（index.html）與戰鬥頁（fengshen-duel.html）都只從這裡讀內容。
   新增或修改角色只改這個檔，不需要動玩法程式。
   art：美術設定。null＝尚未有美術，程式自動用陣營色剪影占位。
        之後有圖集時填 {manifest:{image,grid,anchor,anims…}}（格式見 nezha-sprite.js 的 DEFAULT）。 */
window.FS={
 title:'封神',
 factions:{
  '闡教':{color:'#e8c46a',side:0},
  '截教':{color:'#b58ae0',side:1}
 },
 ranks:['普通','稀有','封神級'],
 /* 射程類型：近戰（射程約 35）、中程（約 130～142）、遠程（156 以上）；顏色用在卡片標籤 */
 reachTypes:{'近戰':'#e58a6a','中程':'#e8c46a','遠程':'#7fb8e8'},
 /* 招募池：[名稱,[普通%,稀有%,封神級%]] */
 pools:[['一般池',[80,18,2]],['神武池',[55,38,7]],['封神池',[50,35,15]]],
 /* 劇情試戰角色。編號＝順序（0～8），隊伍參數與存檔都用這個編號；0～4 為闡教（我方可用），5～8 為截教（敵方出兵） */
 characters:[
  {id:'nezha',reach:'中程',name:'哪吒',faction:'闡教',rank:'普通',role:'中距離・乾坤圈投擲',art:{height:104},
   stats:{cost:32,hp:92,damage:28,range:142,speed:54,period:1.15,cd:4,color:'#f88667',splash:49}},
  {id:'yangjian',reach:'遠程',name:'楊戩',faction:'闡教',rank:'稀有',role:'遠程單體',art:null,
   stats:{cost:34,hp:111,damage:49,range:184,speed:48,period:1.42,cd:4.7,color:'#aabdf3'}},
  {id:'weihu',reach:'近戰',name:'韋護',faction:'闡教',rank:'普通',role:'厚甲前排',art:null,
   stats:{cost:40,hp:340,damage:20,range:36,speed:34,period:1.1,cd:5.8,color:'#a9abbf',armor:.24}},
  {id:'jiangziya',reach:'中程',name:'姜子牙',faction:'闡教',rank:'封神級',role:'回復友軍',art:null,
   stats:{cost:36,hp:85,damage:9,range:130,speed:44,period:1.5,cd:4.4,color:'#e0d3a5',heal:42}},
  {id:'leizhenzi',reach:'近戰',name:'雷震子',faction:'闡教',rank:'稀有',role:'疾風連擊',art:null,
   stats:{cost:24,hp:68,damage:20,range:35,speed:105,period:.62,cd:1.4,color:'#8dd4c6'}},
  {id:'shengongbao',reach:'遠程',name:'申公豹',faction:'截教',rank:'稀有',role:'遠程咒擊',art:null,unlockLater:'後期關卡獎勵（關卡待設計）', /* 平時抽不到；之後通關指定關卡才可獲得 */
   stats:{cost:31,hp:111,damage:49,range:184,speed:48,period:1.42,cd:4.7,color:'#b496e5'}},
  {id:'jiuweihu',reach:'中程',name:'九尾狐',faction:'截教',rank:'封神級',role:'狐火群攻',art:null,
   stats:{cost:36,hp:92,damage:28,range:142,speed:54,period:1.15,cd:4,color:'#ff9ab3',splash:65}},
  {id:'zhaogongming',reach:'近戰',name:'趙公明',faction:'截教',rank:'普通',role:'重甲前排',art:null,
   stats:{cost:37,hp:340,damage:20,range:36,speed:34,period:1.1,cd:5.8,color:'#9d9ace',armor:.24}},
  {id:'yunxiao',reach:'遠程',name:'雲霄',faction:'截教',rank:'封神級',role:'遠程緩速',art:null,
   stats:{cost:34,hp:96,damage:17,range:156,speed:50,period:1.15,cd:3.8,color:'#e7a0ae',slow:2}}
 ],
 /* 武裝：weapon＝武器、armor＝裝備。stats 為 [[欄位名,數值],...]，尚未設計時留空。目前各一筆占位，之後直接在這裡增修 */
 equipment:{
  weapon:[], // 由下方 FS.weaponTypes 與 FS.exclusive 產生
  armor:[] // 由下方 FS.armorTypes 與 FS.exclusiveArmor 產生
 },
 /* 神術：[代號,名稱,效果說明,顏色]。戰鬥頁與大廳神術頁共用 */
 skills:[
  ['wind','風 · 旋風','推退前線附近敵軍','#a8eed3'],
  ['fire','火 · 真火','前線範圍傷害與灼燒','#ff9d58'],
  ['thunder','雷 · 連鎖','最多彈跳至 3 名敵人','#e4ccff'],
  ['shock','電 · 麻痺','最前方敵人停止行動 4 秒','#f7db74'],
  ['ice','冰 · 霜封','凍結前線附近敵軍 2 秒','#9de9ff'],
  ['poison','毒 · 蝕骨','敵軍持續損失生命 7 秒','#b5ea72'],
  ['slow','緩慢 · 泥沼','敵軍移速降低 6 秒','#b6a4dd'],
  ['haste','加速 · 神行','己方移速提高 65%，持續 7 秒','#8de7cb'],
  ['rage','狂暴 · 戰吼','傷害與攻速提高，承傷增加','#ff9589'],
  ['ward','金光護陣','己方武將減傷 7 秒','#f7d783'],
  ['heal','回天仙術','回復武將與基地生命','#a3edb7'],
  ['energy','聚靈敕令','立即獲得 60 靈力','#f7db74']
 ],
 /* 商店雛型：分頁與商品皆為暫定內容，價格尚未決定（price 留空顯示「價格待定」）。尚未接金流，購買按鈕只提示未開放 */
 shop:[
  {id:'stone',name:'靈石',items:[]}, // 靈石檔位由下方 FS.stoneTiers 產生
  {id:'exchange',name:'兌換',items:[]}, // 靈石兌換招募券（比例見 FS.recruit）
  {id:'pack',name:'禮包',items:[
   {name:'新手禮包',desc:'限購一次：招募券 ×10、指定神將 1 位（待定）',price:''},
   {name:'每日禮包',desc:'每日一次：招募券、少量靈石（內容待定）',price:''},
   {name:'每週禮包',desc:'每週一次：招募券、靈石（內容待定）',price:''}]},
  {id:'free',name:'免費',items:[
   {name:'看廣告領招募券',desc:'每日限次：招募券 ×1（次數待定）',price:'免費'},
   {name:'靈石兌換招募券',desc:'用靈石兌換招募券（比例待定）',price:'靈石'}]}
 ],
 /* 單機原型（不帶隊伍參數開戰鬥頁）用的 8 名武將 */
 classic:[
  {name:'雷震子',role:'快攻',cost:16,hp:68,damage:13,range:35,speed:105,period:.62,cd:1.4,color:'#8dd4c6'},
  {name:'黃飛虎',role:'前排',cost:25,hp:235,damage:15,range:39,speed:46,period:.85,cd:3.1,color:'#f1be68'},
  {name:'哪吒',role:'火焰群攻',cost:32,hp:92,damage:28,range:142,speed:54,period:1.15,cd:4,color:'#f88667',splash:49},
  {name:'楊戩',role:'遠程單體',cost:34,hp:111,damage:49,range:184,speed:48,period:1.42,cd:4.7,color:'#aabdf3'},
  {name:'姜子牙',role:'回復友軍',cost:30,hp:85,damage:9,range:130,speed:44,period:1.5,cd:4.4,color:'#e0d3a5',heal:33},
  {name:'韋護',role:'厚甲前排',cost:40,hp:340,damage:20,range:36,speed:34,period:1.1,cd:5.8,color:'#a9abbf',armor:.24},
  {name:'土行孫',role:'低耗突進',cost:11,hp:48,damage:9,range:28,speed:125,period:.55,cd:1.15,color:'#cd986b'},
  {name:'龍吉公主',role:'遠程緩速',cost:29,hp:96,damage:17,range:156,speed:50,period:1.15,cd:3.8,color:'#90e0ef',slow:1.6}
 ]
};

// 闖關關卡（占位）：一大關含 10 小關，只有 1-1 可進入，其餘待設計
FS.chapter={name:'第一大關'};
FS.stages=[
 {name:'1-1　故事試戰',enemy:'截教 · 申公豹',story:'闡教與截教的對決一觸即發。闡教門人集結，迎戰申公豹與截教的來犯。',reward:'待設計',open:true,
  // 敵軍難度：首次出兵秒數、出兵間隔（起始／最短／縮短速度）、敵兵血量與攻擊倍率（固定不隨時間變強）
  difficulty:{firstSpawn:5,startGap:4,minGap:2.5,gapSec:75,hp:.75,dmg:.7}}
];
for(let k=2;k<=10;k++)FS.stages.push({name:'1-'+k,enemy:'待設計',story:'劇情待設計。',reward:'待設計',open:false,boss:k===10}); // 暫定 1-10 為 BOSS 關，可自行改
/* 戰鬥勝利獎勵與玩家升級：金幣、經驗值。關卡可在 FS.stages[n].win 覆寫 {gold,exp}
   升級所需經驗：第 1 級升 2 級要 expBase，之後每升一級為前一級的 expGrow 倍（1.15） */
FS.player={expBase:100,expGrow:1.15};
FS.winReward={gold:100,exp:50};      // 一般關卡
FS.bossReward={gold:100,exp:100};    // BOSS 關卡（關卡資料標 boss:true）
FS.expNeed=lv=>Math.round(FS.player.expBase*Math.pow(FS.player.expGrow,lv-1));
FS.gainExp=(lv,exp,gain)=>{exp+=gain;let ups=0;while(exp>=FS.expNeed(lv)){exp-=FS.expNeed(lv);lv++;ups++}return{lv,exp,ups}};
FS.skillMaxLevel=5; // 每個神術等級上限

// 靈石儲值檔位：[售價(NT$), 靈石倍率]；倍率由 10 倍逐級遞增到 15 倍；靈石數 = 售價 × 倍率（四捨五入）
/* 招募：1 張招募券 = 150 靈石；單抽 1 張、5 連 5 張、10 連 9 張（9 折） */
FS.recruit={ticketStone:150,pulls:[[1,1,'單抽'],[5,5,'5 連'],[10,9,'10 連']],exchange:[1,5,9]};
FS.stoneTiers=[[33,10],[66,10.5],[99,11],[199,11.5],[399,12],[699,13],[1199,14],[1399,15],[1699,15]];
FS.shop.find(t=>t.id==='stone').items=FS.stoneTiers.map(([price,ratio],i)=>({name:'靈石 第 '+(i+1)+' 檔',price:'NT$ '+price,ratio,amount:Math.round(price*ratio),tier:i}));

/* 武器：類別（一般武器每類一件占位）＋專武（每位神將一件專屬）。之後直接在這裡增修名稱、介紹、數據。
   weapon 項目欄位：type＝類別、kind＝'一般'或'專武'、owner＝專武持有神將（一般武器為空） */
FS.weaponTypes=['劍','刀','槍','矛','法輪','圈','鞭','棍','杵','斧','錘鐧','綾索','旗幡','珠斗','塔罩','瓶葫蘆'];
FS.exclusive=[ // [專武名稱, 類別, 持有神將]
 ['乾坤圈','圈','哪吒'],['三尖兩刃刀','刀','楊戩'],['降魔杵','杵','韋護'],['打神鞭','鞭','姜子牙'],
 ['黃金棍','棍','雷震子'],['定海珠','珠斗','趙公明'],['混元金斗','珠斗','雲霄'],
 ['專武（待定）','待定','申公豹'],['專武（待定）','待定','九尾狐']
];
FS.weaponCommon=['劍','刀','槍','矛','斧','錘鐧','棍']; // 一般武器中屬「普通」稀有度的類別，其餘為「稀有」；專武一律「封神級」
FS.equipment.weapon=FS.weaponTypes.map(t=>({id:'w_'+t,name:t+'（一般）',type:t,kind:'一般',rank:FS.weaponCommon.includes(t)?'普通':'稀有',owner:'',desc:'一般武器 · '+t+'類。介紹待設計。',stats:[]}))
 .concat(FS.exclusive.map(([n,t,o],i)=>({id:'x_'+i,name:n,type:t,kind:'專武',rank:'封神級',owner:o,desc:'專武 · '+o+'專屬。介紹待設計。',stats:[]})));

/* 裝備：部位（不含寵物、坐騎）＋專屬裝備。欄位同武器：type＝部位、kind＝'一般'或'專屬'、owner＝持有神將 */
FS.armorTypes=['頭冠','衣甲','法衣','配飾','靴'];
FS.exclusiveArmor=[ // [名稱, 部位, 持有神將]
 ['混天綾','法衣','哪吒'],['風雷翅','配飾','雷震子'],
 ['專屬裝備（待定）','待定','楊戩'],['專屬裝備（待定）','待定','韋護'],['專屬裝備（待定）','待定','姜子牙'],
 ['專屬裝備（待定）','待定','趙公明'],['專屬裝備（待定）','待定','雲霄'],['專屬裝備（待定）','待定','申公豹'],['專屬裝備（待定）','待定','九尾狐']
];
FS.armorCommon=['衣甲','靴']; // 一般裝備中屬「普通」稀有度的部位，其餘為「稀有」；專屬一律「封神級」
FS.equipment.armor=FS.armorTypes.map(t=>({id:'a_'+t,name:t+'（一般）',type:t,kind:'一般',rank:FS.armorCommon.includes(t)?'普通':'稀有',owner:'',desc:'一般裝備 · '+t+'。介紹待設計。',stats:[]}))
 .concat(FS.exclusiveArmor.map(([n,t,o],i)=>({id:'ax_'+i,name:n,type:t,kind:'專屬',rank:'封神級',owner:o,desc:'專屬裝備 · '+o+'專屬。介紹待設計。',stats:[]})));
