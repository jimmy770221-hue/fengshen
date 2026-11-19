/* 封面人物位置表（A～F 六個位置）
   A B C 在左邊、面向右，由上到下是 A 雷震子、B 楊戩、C 哪吒；D E F 在右邊、面向左，由上到下是 D 沙僧、E 豬八戒、F 孫悟空。位置座標是「該側方框」的比例（方框 寬＝高）：
     cx＝人物中心的左右位置（0 左邊緣～1 右邊緣）、b＝腳底的上下位置（0 頂～1 底）、h＝人物高度（占方框高度）、z＝前後層次（大的在前）
   換人物只要改 pick；每張圖在 pool 裡記錄「原本朝哪一邊」，朝向不對的會自動左右翻面。
   random:true 時，每次開啟 APP 會從 pool 隨機抽人放進 A～F（不重複）。 */
window.COVER={
 random:false,
 slots:{
  A:{side:'L',cx:.61,b:.46,h:.44,z:1,face:'r'},
  B:{side:'L',cx:.27,b:.86,h:.66,z:2,face:'r'},
  C:{side:'L',cx:.55,b:1,h:.52,z:3,face:'r'},
  D:{side:'R',cx:.39,b:.58,h:.52,z:1,face:'l'},
  E:{side:'R',cx:.73,b:.86,h:.70,z:2,face:'l'},
  F:{side:'R',cx:.45,b:1,h:.56,z:3,face:'l'}
 },
 pick:{A:'leizhenzi',B:'yangjian',C:'nezha',D:'shawujing',E:'zhubajie',F:'sunwukong'},
 pool:{
  yangjian:{face:'r'},leizhenzi:{face:'r'},nezha:{face:'r'},
  zhubajie:{face:'l'},shawujing:{face:'l'},sunwukong:{face:'l'}
 }
};
