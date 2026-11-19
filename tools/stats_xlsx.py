# 人物數值後台：python3 tools/stats_xlsx.py export 表格.xlsx   /   python3 tools/stats_xlsx.py apply 表格.xlsx
import sys,json
from openpyxl import Workbook,load_workbook
from openpyxl.styles import Font,PatternFill,Alignment
from openpyxl.utils import get_column_letter
COLS=[('編號','id'),('名稱','name'),('世界','world'),('陣營','faction'),('品質','rank'),('距離','reach'),('傾向(參考)','lean'),
 ('血量','hp'),('攻擊力','damage'),('攻擊間隔(秒)','period'),('移動速度','speed'),('射程','range'),('靈力費用','cost'),('冷卻CD(秒)','cd'),('減傷(0~0.9)','armor'),('範圍傷害','splash')]
NUM=['hp','damage','period','speed','range','cost','cd','armor','splash']
def lean(s):
    if s.get('armor'):return '防'
    return '速' if s['period']<1.0 or s['speed']>=58 else '攻'
if sys.argv[1]=='export':
    ch=json.load(open('/tmp/chars.json',encoding='utf-8'))
    wb=Workbook();ws=wb.active;ws.title='人物數值'
    ws.append([c[0] for c in COLS])
    for c in ch:
        s=c['stats'];r=[c['id'],c['name'],c['world'] or '封神',c['faction'],c['rank'],c['reach'],lean(s)]+[s.get(k) for k in NUM]
        ws.append(r)
    hf=PatternFill('solid',fgColor='1F3A5F')
    for i,(h,_) in enumerate(COLS,1):
        x=ws.cell(1,i);x.font=Font(name='Arial',bold=True,color='FFFFFF');x.fill=hf;x.alignment=Alignment(horizontal='center')
        ws.column_dimensions[get_column_letter(i)].width=13 if i>2 else 14
    for row in ws.iter_rows(min_row=2):
        for i,x in enumerate(row):
            x.font=Font(name='Arial',color='0000FF' if i>=7 and i!=6 else '000000')
            if i==6:x.font=Font(name='Arial',color='888888')
    ws.freeze_panes='C2';ws.auto_filter.ref=ws.dimensions
    g=wb.create_sheet('說明')
    for l in ['【怎麼用】','1. 只改「人物數值」分頁的藍色數字，編號、名稱不要改。','2. 改完存檔，跟 Claude 說「套用數值」，Claude 會讀這張表更新遊戲。','3. 空白的格子＝這個角色沒有這項（例如沒有範圍傷害就留空）。','',
      '【欄位意思】','血量：越高越耐打。','攻擊力：每次攻擊的傷害。','攻擊間隔：幾秒打一次，越小越快。','移動速度：越大走越快。','射程：近戰約 38，中程約 135，遠程約 170。','靈力費用：派出這個角色要花的靈力。','冷卻CD：派出後要等幾秒才能再派。','減傷：0.2＝少受 20% 傷害，最高 0.9。','範圍傷害：攻擊會波及的範圍，空白＝單體。','傾向(參考)：速／攻／防，只是方便你看，改它不會有作用。']:g.append([l])
    g.column_dimensions['A'].width=70
    wb.save(sys.argv[2]);print('輸出',len(ch),'位')
else:
    ws=load_workbook(sys.argv[2],data_only=True)['人物數值'];H=[c.value for c in ws[1]];out={};bad=[]
    key={h:k for h,k in COLS}
    for r in ws.iter_rows(min_row=2,values_only=True):
        d={key[h]:v for h,v in zip(H,r) if h in key}
        if not d.get('id'):continue
        s={}
        for k in NUM:
            v=d.get(k)
            if v in(None,''):continue
            try:s[k]=float(v) if k in('period','cd','armor') else round(float(v))
            except:bad.append((d['id'],k,v))
        if s.get('armor',0)>.9:s['armor']=.9;bad.append((d['id'],'減傷超過0.9，已改成0.9'))
        out[d['id']]=s
    js='/* 自動產生：python3 tools/stats_xlsx.py apply 表格.xlsx（來源：雲端「諸仙陣_人物數值.xlsx」） */\n(function(){const O='+json.dumps(out,ensure_ascii=False,separators=(",",":"))+';\nfor(const c of FS.characters){const o=O[c.id];if(!o)continue;const keep={color:c.stats.color};c.stats=Object.assign(keep,o)}\n})();\n'
    open('data/stats-override.js','w',encoding='utf-8').write(js);print('套用',len(out),'位；問題',bad)
