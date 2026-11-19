# 匯入 GPT 圖卡：透明 PNG → 裁邊 → webp，登錄到 assets/manifest.js，並產生 data/fengshen-cards.js
# 用法：python3 tools/import_cards.py   （圖卡來源放在 /mnt/user-data/uploads/…/成品/角色/）
import os,re,json,glob,hashlib,sys
from PIL import Image
import openpyxl
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC='/mnt/user-data/uploads/07) 封神戰線/給GPT-美術需求/成品/角色/'
XLSX='/mnt/user-data/outputs/封神西遊人物清單-品質分類.xlsx'
Q0={('西遊','南斗星君'):'仙品'}  # 表內沒有的單張圖卡，暫定品質
QR={'凡品':'普通','仙品':'稀有','聖品':'封神級'}
# ---- 品質表 ----
wb=openpyxl.load_workbook(XLSX)
Q={}
for ws,w in((wb['封神人物'],'封神'),(wb['西遊人物'],'西遊')):
    for r in ws.iter_rows(min_row=2,values_only=True):
        if r[1]:Q[(w,r[1])]=r[8]
Q.update(Q0)
# ---- 名稱表 ----
def mdnames(path,col):
    m={}
    for l in open(path,encoding='utf-8'):
        c=[x.strip() for x in l.strip().strip('|').split('|')]
        if len(c)>=5 and c[0].isdigit() and c[4]=='已出圖':m[os.path.basename(c[3])]=c[1]
    return m
FSN=mdnames(SRC+'封神人物圖卡/諸仙陣_封神圖卡匯入表.md',1)
XYN=mdnames(SRC+'諸仙陣_西遊圖卡匯入表.md',1)
FSFAC={'01':'上古','02':'闡教','03':'截教','04':'商朝','05':'西方教','06':'西岐','07':'靈獸'}
XYFAC={'取經團隊':'取經團隊','天庭':'天庭','龍宮':'龍宮','佛門':'佛門','散仙':'散仙','妖怪':'妖怪','人間':'人間'}
# 多人合圖、重複圖、放錯的圖：不匯入
XY_SKIP={'beidou','ershibaxiu','jiuyao','qixiannv','sizhi','liudingliujia','shiba-luohan','qizhizhu','maliu-bengba','qingfeng-mingyue'}  # 多人合圖（已由群像拆卡取代）
FS_SKIP={'079'}  # 魔家四將（四人合圖）
# ---- 暫定數值（依定位＋品質）----
# 近中遠 × 速攻防：三種距離各有基礎，再套「速／攻／防」傾向（遊戲內不標示，讓玩家自己摸索）
ARCH={'near':('近戰','近身作戰',dict(cost=32,hp=190,damage=28,range=38,speed=46,period=1.05,cd=4.5)),
 'mid':('中程','中距離・法術',dict(cost=32,hp=120,damage=26,range=135,speed=46,period=1.2,cd=4.0,splash=40)),
 'far':('遠程','遠程單體',dict(cost=32,hp=90,damage=32,range=170,speed=42,period=1.35,cd=4.4))}
LEAN={'speed':dict(hp=.8,damage=.85,speed=1.4,period=.75,cd=.75,cost=0),
 'atk':dict(hp=.8,damage=1.5,speed=.95,period=1.05,cd=1.0,cost=3),
 'def':dict(hp=1.7,damage=.7,speed=.82,period=1.0,cd=1.1,cost=3)}
TANK='亢宿 氐宿 牛宿 壁宿 軫宿 甲子 甲戌 甲申 甲午 甲辰 甲寅 芭將軍 看門羅漢 靜坐羅漢 降龍羅漢 牛魔王 黑熊精 白象精 青獅精 九靈元聖 獨角兕大王 鼉龍 巨靈神 增長天王 持國天王 豬八戒 沙悟淨 紂王 黃袍怪 墨麒麟 黃風怪 虎力大仙 蜈蚣精'.split()
ARCHER='蜘蛛精大姐 蜘蛛精二姐 蜘蛛精三姐 蜘蛛精四姐 蜘蛛精五姐 蜘蛛精六妹 蜘蛛精七妹 雷公 電母 風伯 雨師 嫦娥 太陰星君 太陽星君 蘇妲己 胡喜媚 王貴人 鄧嬋玉 崇侯虎 高蘭英 廣目天王 瓊霄 碧霄 金靈聖母 金光聖母 白骨精 白鼠精 玉面公主 鐵扇公主 蠍子精 紅孩兒 靈感大王 金角大王 銀角大王 王母娘娘 四不像 哮天犬 黑點虎 姬旦 伯邑考'.split()
FIGHT='參宿 崩將軍 馬元帥 流元帥 魔禮青 魔禮壽 火曜星君 土曜星君 金曜星君 伏虎羅漢 金吒 木吒 李靖 黃天化 土行孫 武吉 殷郊 殷洪 楊任 孫悟空 白龍馬 托塔李天王 多聞天王 六耳獼猴 通臂猿猴 虎力大仙'.split()
MIDF={'上古','闡教','截教','西方教','天庭','龍宮','佛門','散仙','人間','取經團隊'}
def arch(name,fac):
    """回傳 (距離, 傾向)。名單內的依原本定位，其餘依陣營與編號輪流分配。"""
    if name in TANK:return 'near','def'
    if name in FIGHT:return 'near',('speed' if len(name)%2 else 'atk')
    if name in ARCHER:return 'far',('speed','atk','def')[len(name)%3 if False else (sum(map(ord,name))%3)]
    if name in('魔禮海','魔禮紅'):return 'mid','atk'
    k=sum(map(ord,name))
    if fac in('商朝','西岐','靈獸','妖怪'):return 'near',('speed','atk','def')[k%3]
    return ('mid','far')[k%5==0],('speed','atk','def')[(k//3)%3]
def stats(a,q,color):
    reach,lean=a;rc,role,b=ARCH[reach];b=dict(b);L=LEAN[lean];m={'凡品':.85,'仙品':1,'聖品':1.3}[q]
    for k in('hp','damage','speed','period','cd'):b[k]=b[k]*L[k]
    b['hp']=round(b['hp']*m);b['damage']=round(b['damage']*m);b['speed']=round(b['speed']);b['period']=round(b['period'],2);b['cd']=round(b['cd'],1)
    b['cost']=b['cost']+L['cost']+{'凡品':-2,'仙品':0,'聖品':4}[q]
    if 'splash' in b:b['splash']=round(b['splash']*m)
    if lean=='def':b['armor']=.28 if reach=='near' else .18
    b['color']=color
    return rc,role,b
FCOL={'上古':'#f2d27a','闡教':'#e8c46a','截教':'#b58ae0','商朝':'#c0584c','西方教':'#f0e2a8','西岐':'#7fb890','靈獸':'#9ac7e8','取經團隊':'#ffd06a','天庭':'#8fb8f0','龍宮':'#5fc4d6','佛門':'#f3c25e','散仙':'#a6d49b','妖怪':'#c46a8a','人間':'#c9b38a'}
QCOL={'凡品':'#6aa7e8','仙品':'#b58ae0','聖品':'#f0c14b'}
items=[]
for p in sorted(glob.glob(SRC+'封神人物圖卡/*/fs-*_card.png')):
    n=re.search(r'fs-(\d+)_',p).group(1)
    if n in FS_SKIP:continue
    name=FSN.get('fs-%s_card.png'%n);fac=FSFAC[os.path.basename(os.path.dirname(p))[:2]]
    items.append(('fs'+n,name,'封神',fac,p))
for p in sorted(glob.glob(SRC+'西遊人物圖卡_*/*_card.png')):
    key=os.path.basename(p)[:-9]
    if key in XY_SKIP:continue
    name=XYN.get(os.path.basename(p));fac=XYFAC[os.path.basename(os.path.dirname(p)).split('_')[1]]
    items.append(('xy_'+key.replace('-','_'),name,'西遊',fac,p))
# ---- 群像拆卡：每位獨立一張，編號 bd-01 → id bd01 ----
GRP=SRC+'諸仙陣_群像拆卡/'
GFAC={'bd':('西遊','天庭'),'sx':('西遊','天庭'),'jy':('西遊','天庭'),'xn':('西遊','天庭'),'gz':('西遊','天庭'),'dj':('西遊','天庭'),
      'lh':('西遊','佛門'),'qf':('西遊','散仙'),'hg':('西遊','妖怪'),'zz':('西遊','妖怪'),'mj':('封神','商朝')}
GNAME={}
if os.path.exists(GRP+'群像拆卡_102位人物設定.md'):
    for l in open(GRP+'群像拆卡_102位人物設定.md',encoding='utf-8'):
        c=[x.strip() for x in l.strip().strip('|').split('|')]
        if len(c)>=9 and re.match(r'[a-z]{2}-\d\d$',c[0]):GNAME[c[0]]=c[1]
for p in sorted(glob.glob(GRP+'*/*_card.png')):
    k=os.path.basename(p)[:-9]
    if k not in GNAME or k[:2] not in GFAC:continue
    w,fac=GFAC[k[:2]];nm=GNAME[k]
    Q.setdefault((w,nm),'凡品')   # 品質表沒有的群像成員，暫定凡品
    items.append((k.replace('-',''),nm,w,fac,p))
# 重複圖檢查
seen={}
for it in items:
    h=hashlib.md5(open(it[4],'rb').read()).hexdigest()
    if h in seen:print('重複圖，略過',it[0],it[1],'=',seen[h]);it+=('dup',)
    seen[h]=it[0]
items=[it for it in items if len(it)==5]
# ---- 轉檔 ----
man=open(ROOT+'/assets/manifest.js',encoding='utf-8').read()
tail=man[man.index('window.ASSETS=')+14:]
brace=tail.index('};')+1 if '};' in tail else None
js=tail[:tail.rindex('"files"')] if False else None
m=re.search(r'window\.ASSETS=(\{.*?\});',man,re.S)
A=json.loads(m.group(1));files=A['files']
prefix=man[:m.start()];suffix=man[m.end():]
rows=[];miss=[]
for id,name,w,fac,p in items:
    q=Q.get((w,name))
    if not q:miss.append((id,name));continue
    im=Image.open(p).convert('RGBA');bb=im.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox()
    pad=int(max(bb[2]-bb[0],bb[3]-bb[1])*.03);bb=(max(0,bb[0]-pad),max(0,bb[1]-pad),min(im.width,bb[2]+pad),min(im.height,bb[3]+pad))
    im=im.crop(bb)
    if int(hashlib.md5(id.encode()).hexdigest()[0],16)%2:im=im.transpose(Image.FLIP_LEFT_RIGHT)   # 依編號固定隨機左右翻面（GPT 出圖一律朝右）
    im.thumbnail((300,420),Image.LANCZOS)
    d=ROOT+'/assets/char/'+id;os.makedirs(d,exist_ok=True)
    tmp=d+'/_t.webp';im.save(tmp,'WEBP',quality=82,method=4)
    h=hashlib.md5(open(tmp,'rb').read()).hexdigest()[:8]
    for f in glob.glob(d+'/card.*.webp'):os.remove(f)
    os.replace(tmp,d+'/card.%s.webp'%h)
    rel='assets/char/%s/card.%s.webp'%(id,h)
    for k in('card','portrait','icon'):files['char/%s/%s'%(id,k)]=rel
    a=arch(name,fac);reach,role,st=stats(a,q,QCOL[q])
    rows.append([id,name,w,fac,QR[q],reach,role,st])
lazy=sorted(k for k in files if k.endswith(('/card','/portrait','/icon')) and re.match(r'char/(fs|xy_)',k))
A['files']=dict(sorted(files.items()));A['lazy']=lazy
A['v']=hashlib.md5(json.dumps(A['files'],sort_keys=True).encode()).hexdigest()[:8]
open(ROOT+'/assets/manifest.js','w',encoding='utf-8').write(prefix+'window.ASSETS='+json.dumps(A,ensure_ascii=False,separators=(',',':'))+';'+suffix)
# ---- 資料檔 ----
out='/* 自動產生，請勿手改：python3 tools/import_cards.py\n   新匯入的 GPT 圖卡角色（單張圖卡＋暫定數值）。品質：普通＝凡品、稀有＝仙品、封神級＝聖品。 */\n(function(){\nFS.baseCount=FS.characters.length;\nconst FC='+json.dumps(FCOL,ensure_ascii=False)+';\nfor(const f in FC)if(!FS.factions[f])FS.factions[f]={color:FC[f],side:0};\n'
out+='const ST=(c,r)=>c;\nFS.cards=['+',\n'.join(json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in rows)+'];\n'
out+='for(const [id,name,world,faction,rank,reach,role,stats] of FS.cards)FS.characters.push({id,name,world,faction,rank,reach,role,art:null,card:true,stats});\n})();\n'
open(ROOT+'/data/fengshen-cards.js','w',encoding='utf-8').write(out)
print('匯入',len(rows),'張；缺品質',miss)
from collections import Counter
print(Counter(r[4] for r in rows),Counter(r[2] for r in rows))
