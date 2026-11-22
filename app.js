const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const P=JSON.parse(localStorage.cb||'{"ok":0,"bad":0,"les":{}}'),save=()=>localStorage.cb=JSON.stringify(P);
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let tok=0,mode=0,b;
const say=t=>$('#st').textContent=t;
const btn=(t,f,p=$('#ct'))=>{const x=document.createElement('button');x.textContent=t;x.onclick=f;p.appendChild(x);return x};
const mvu=(g,u)=>g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
const san=(f,u)=>{try{return mvu(new Chess(f),u).san}catch(e){return u}};
const K=c=>Math.max(-1000,Math.min(1000,c));
const fmt=c=>Math.abs(c)>=9000?(c>0?'+M':'-M'):(c>0?'+':'')+(c/100).toFixed(2);
const wp=(f,i)=>{if(!i)return 0;const s=f.split(' ')[1]=='w'?1:-1;return s*(i.t=='mate'?(i.v>0?1:-1)*10000:i.v)};

function Board(el){
 const o={g:new Chess(),flip:false,sel:null,last:null,lock:false,onMove:null};
 o.set=f=>{o.g=new Chess(f||START);o.sel=null;o.last=null;o.draw()};
 o.draw=()=>{el.innerHTML='';const bd=o.g.board(),tg=o.sel?o.g.moves({square:o.sel,verbose:true}).map(m=>m.to):[];
  for(let r=0;r<8;r++)for(let f=0;f<8;f++){const rr=o.flip?7-r:r,ff=o.flip?7-f:f,sq='abcdefgh'[ff]+(8-rr),p=bd[rr][ff],d=document.createElement('div');
   d.className='sq '+((rr+ff)%2?'d':'l')+(sq==o.sel?' sel':'')+(o.last&&(o.last.from==sq||o.last.to==sq)?' last':'')+(tg.includes(sq)?(p?' cap':' tg'):'');
   if(p){const i=new Image();i.src='pieces/'+p.color+p.type.toUpperCase()+'.svg';d.appendChild(i)}
   d.onclick=()=>o.tap(sq);el.appendChild(d)}};
 o.tap=sq=>{if(o.lock)return;const g=o.g,p=g.get(sq);
  if(o.sel&&g.moves({square:o.sel,verbose:true}).some(m=>m.to==sq)){const m=g.move({from:o.sel,to:sq,promotion:'q'});o.sel=null;o.last=m;o.draw();o.onMove&&o.onMove(m);return}
  o.sel=p&&p.color==g.turn()?sq:null;o.draw()};
 o.back=()=>{o.g.undo();o.last=null;o.draw()};
 return o}

const E={w:null,run:false,p:null,res:null,last:null,onInfo:null,
 init(){this.w=new Worker('vendor/'+SF_JS);this.w.onmessage=e=>this.msg(String(e.data));this.w.postMessage('uci');this.w.postMessage('setoption name Hash value 64')},
 msg(l){if(l.startsWith('info')&&l.includes(' score ')){const m=l.match(/depth (\d+).*? score (cp|mate) (-?\d+).*? pv (\S+)/);if(m){this.last={d:+m[1],t:m[2],v:+m[3],pv:m[4]};this.onInfo&&this.onInfo(this.last)}}
  else if(l.startsWith('bestmove')){this.run=false;const r=this.res;this.res=null;r&&r({...this.last,best:l.split(' ')[1]})}},
 stop(){this.run&&this.w.postMessage('stop')},
 go(f,cmd,skill=20){if(!this.w)this.init();if(this.run)this.stop();
  const job=()=>new Promise(r=>{this.last=null;this.res=r;this.run=true;const w=this.w;w.postMessage('setoption name Skill Level value '+skill);w.postMessage('position fen '+f);w.postMessage('go '+cmd)});
  this.p=(this.p||Promise.resolve()).then(job);return this.p}};

async function cloud(f){try{const r=await fetch('https://lichess.org/api/cloud-eval?fen='+encodeURIComponent(f));if(!r.ok)return null;const j=await r.json(),p=j.pvs[0];return{c:p.mate!=null?(p.mate>0?1:-1)*10000:p.cp,best:p.moves.split(' ')[0],d:j.depth}}catch(e){return null}}
async function ev(f,cmd,cl){const g=new Chess(f);if(g.game_over())return{c:g.in_checkmate()?(g.turn()=='w'?-1:1)*10000:0,best:'',d:0};
 if(cl){const c=await cloud(f);if(c)return c}const r=await E.go(f,cmd);return{c:wp(f,r),best:r.best,d:r.d}}

const L=[
{lv:'Pemula',t:'Gerak bidak',x:'Benteng: lurus. Gajah: diagonal. Kuda: huruf L (bisa loncat). Ratu: benteng + gajah. Raja: 1 langkah. Pion: maju 1 (2 dari posisi awal), makan diagonal. Coba tap bidak di papan untuk lihat langkah legalnya.'},
{lv:'Pemula',t:'Nilai bidak',x:'Pion=1, Kuda=3, Gajah=3, Benteng=5, Ratu=9. Raja tak ternilai. Tukar bidak hanya kalau nilainya menguntungkan.'},
{lv:'Pemula',t:'Aturan khusus',x:'Rokade: raja geser 2 kotak ke benteng (belum pernah gerak, jalur kosong, tidak sedang/melewati skak). En passant: pion makan pion lawan yang baru maju 2 kotak, langsung di langkah berikutnya. Promosi: pion sampai baris terakhir jadi bidak lain (di app ini otomatis ratu).'},
{lv:'Pemula',t:'Skak, skakmat, remis',x:'Skak: raja diserang. Skakmat: skak dan tak ada jalan keluar, game selesai. Remis: stalemate (tidak skak tapi tak ada langkah legal), bidak tak cukup, pengulangan 3x, atau aturan 50 langkah.'},
{lv:'Pemula',t:'Mat satu langkah dengan ratu',x:'Putih jalan. Cari langkah skakmat; ratu dilindungi rajanya.',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',ans:'Qg7#'},
{lv:'Pemula',t:'Back-rank mate',x:'Raja yang terkurung pionnya sendiri di baris terakhir rawan kena benteng. Cari matinya.',fen:'6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',ans:'Ra8#'},
{lv:'Pemula',t:'Prinsip pembukaan',x:'1) Kuasai tengah (e4/d4). 2) Kembangkan kuda dan gajah sebelum ratu. 3) Rokade cepat. 4) Jangan gerakkan bidak yang sama dua kali tanpa alasan. 5) Jangan keluarkan ratu terlalu dini.'},
{lv:'Menengah',t:'Fork kuda',x:'Fork: satu bidak menyerang dua target sekaligus. Kuda sangat jago fork. Putih jalan.',fen:'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',ans:'Nc7+'},
{lv:'Menengah',t:'Pin, skewer, discovered attack',x:'Pin: bidak tak boleh/enggan gerak karena di belakangnya ada target lebih berharga. Skewer: kebalikannya, target mahal di depan lari, bidak di belakang dimakan. Discovered attack: gerakkan satu bidak sehingga bidak di belakangnya menyerang. Latih semuanya di tab Puzzle (pilih tema).'},
{lv:'Menengah',t:'Italian Game (Putih)',x:'Tebak langkah putih. Ide: Bc4 membidik f7, lalu c3 + d3 untuk bangun pusat.',line:'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6'},
{lv:'Menengah',t:'Ruy Lopez (Putih)',x:'Bb5 menekan kuda yang menjaga e5. Salah satu pembukaan paling klasik.',line:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O'},
{lv:'Menengah',t:'Sicilian Najdorf (Putih)',x:'Pembukaan tajam dengan posisi tak simetris.',line:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'},
{lv:'Menengah',t:'Caro-Kann (Hitam)',x:'Pertahanan solid: Hitam bangun pusat lewat c6 lalu d5.',side:'b',line:'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6'},
{lv:'Menengah',t:'London System (Putih)',x:'Sistem aman: d4, Bf4, e3, Nf3. Mudah dipelajari.',line:'d4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bg3 O-O'},
{lv:'Menengah',t:'Endgame: oposisi',x:'Dalam K+P vs K, raja yang menghadapi lawan dengan satu kotak jarak (oposisi) dan giliran lawan yang jalan biasanya menang posisi. Raja ditaruh di depan pion adalah kunci. Latih lewat tab Main dari posisi sederhana.'},
{lv:'Advanced',t:'Struktur pion',x:'Pion terisolasi, ganda, terbelakang, dan pion lolos menentukan rencana. Serang titik lemah, tukar bidak saat menguntungkan struktur, dan buat pion lolos yang didukung.'},
{lv:'Advanced',t:'Outpost & kotak lemah',x:'Outpost: kotak di wilayah lawan yang tak bisa diserang pion lawan, ideal untuk kuda. Cari kotak lemah akibat pion yang sudah maju, lalu tempatkan bidak di sana.'},
{lv:'Advanced',t:'Lucena (menang benteng)',x:'Teori endgame: benteng + pion di kolom b/g/d/e... dengan raja di depan pion. Teknik jembatan: Rc4 lalu raja berlindung di balik benteng. Coba mainkan melawan engine dari posisi ini.',fen:'1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1'},
{lv:'Advanced',t:'Cara berpikir kandidat',x:'Tiap giliran: 1) apa ancaman lawan? 2) daftar 2-3 langkah kandidat (skak, tangkap, ancaman dulu). 3) hitung variasi sampai posisi tenang. 4) cek blunder sebelum jalan. Pakai tab Analisis untuk cek kebiasaan lu.'}];

const tabs=['Belajar','Puzzle','Main','Analisis','Progres'];
function nav(){const n=$('#nav');n.innerHTML='';tabs.forEach((t,i)=>{const x=document.createElement('button');x.textContent=t;x.className=mode==i?'on':'';x.onclick=()=>go(i);n.appendChild(x)})}
function go(i,arg){tok++;E.stop();mode=i;nav();b.onMove=null;b.lock=false;b.flip=false;b.set(START);$('#ct').innerHTML=$('#pn').innerHTML='';say('');[learn,puzzle,play,analyze,prog][i](arg)}

function learn(){const p=$('#pn');let lv='';say('Pilih pelajaran');
 L.forEach((l,i)=>{if(l.lv!=lv){lv=l.lv;const h=document.createElement('h3');h.textContent=lv;p.appendChild(h)}btn((P.les[i]?'✅ ':'')+l.t,()=>lesson(i),p).className='row'})}
function lesson(i){const l=L[i],p=$('#pn'),t0=++tok;p.innerHTML='<h3>'+l.t+'</h3><p>'+l.x+'</p>';btn('« Daftar',()=>go(0),p);
 b.set(l.fen);b.flip=l.side=='b';b.lock=false;b.onMove=null;b.draw();
 const done=()=>{P.les[i]=1;save();say('✅ Selesai!')};
 if(l.ans){say('Cari langkah terbaik');b.onMove=m=>{if(m.san==l.ans){done();b.lock=true}else{say('❌ Bukan itu, coba lagi');b.back()}}}
 else if(l.line){const mv=l.line.split(' '),my=l.side||'w';let k=0;
  const step=async()=>{b.lock=true;while(k<mv.length&&b.g.turn()!=my){await sleep(500);if(t0!=tok)return;b.last=b.g.move(mv[k++]);b.draw()}
   if(k>=mv.length){done();return}b.lock=false;say('Giliran lu: tebak langkah berikutnya')};
  b.onMove=m=>{if(m.san==mv[k]){k++;step()}else{say('❌ Bukan, coba lagi');b.back()}};step()}
 else if(!l.fen)btn('Tandai selesai',done,p)}

async function puzzle(a){const t0=++tok,ct=$('#ct');ct.innerHTML='';a=a||'';
 const s=document.createElement('select');['','fork','pin','skewer','mateIn1','mateIn2','backRankMate','hangingPiece','discoveredAttack','sacrifice','endgame','opening'].forEach(v=>s.add(new Option(v||'campur',v)));s.value=a;s.onchange=()=>puzzle(s.value);ct.appendChild(s);
 btn('Berikutnya',()=>puzzle(s.value));const hint=btn('Petunjuk',()=>{});
 say('Memuat puzzle dari Lichess…');b.lock=true;let j;
 try{const r=await fetch('https://lichess.org/api/puzzle/next'+(a?'?angle='+a:''));if(!r.ok)throw 0;j=await r.json()}catch(e){say('Gagal memuat puzzle (butuh internet / kena limit Lichess). Coba lagi sebentar.');return}
 if(t0!=tok)return;const g=new Chess();g.load_pgn(j.game.pgn);b.g=g;b.flip=g.turn()=='b';b.sel=null;b.last=null;b.draw();
 const sol=j.puzzle.solution.slice();let k=0,bad=false;
 if(!g.moves({verbose:true}).some(m=>m.from+m.to+(m.promotion||'')==sol[0])){say('Format puzzle tak dikenal, tekan Berikutnya');return}
 b.lock=false;say((g.turn()=='w'?'Putih':'Hitam')+' jalan • rating '+j.puzzle.rating);
 hint.onclick=()=>say('Petunjuk: gerakkan bidak di '+sol[k].slice(0,2));
 const fin=()=>{b.lock=true;if(!bad){P.ok++;save()}say('✅ Benar! Tema: '+j.puzzle.themes.join(', '))};
 b.onMove=async m=>{if(m.from+m.to+(m.promotion||'')==sol[k]||b.g.in_checkmate()){k++;if(k>=sol.length||b.g.in_checkmate())return fin();
   b.lock=true;await sleep(400);if(t0!=tok)return;b.last=mvu(b.g,sol[k++]);b.draw();if(k>=sol.length)return fin();b.lock=false;say('Bagus, lanjut!')}
  else{if(!bad){bad=true;P.bad++;save()}say('❌ Salah, coba lagi');b.back()}}}

const LV=[[0,100],[2,200],[5,400],[8,700],[12,1000],[16,1500],[20,2500]];
function play(){const ct=$('#ct');let lvl=3,my='w';
 const ls=document.createElement('select');LV.forEach((x,i)=>ls.add(new Option('Level '+(i+1),i)));ls.value=lvl;ls.onchange=()=>lvl=+ls.value;
 const cs=document.createElement('select');cs.add(new Option('Putih','w'));cs.add(new Option('Hitam','b'));cs.onchange=()=>{my=cs.value;fresh()};
 ct.append(ls,cs);
 const chk=()=>{const g=b.g;P.last=g.pgn();save();if(g.in_checkmate())say(g.turn()==my?'Skakmat, lu kalah':'Skakmat! Lu menang 🎉');else if(g.game_over())say('Remis');else say((g.in_check()?'Skak! ':'')+'Giliran lu');return g.game_over()};
 const ai=async()=>{const t=tok;b.lock=true;say('Engine mikir…');const [s,ms]=LV[lvl],r=await E.go(b.g.fen(),'movetime '+ms,s);if(t!=tok)return;
  b.last=mvu(b.g,r.best);b.draw();b.lock=false;chk()};
 const fresh=()=>{tok++;E.stop();b.set(START);b.flip=my=='b';b.lock=false;b.onMove=()=>{if(!chk())ai()};say('Game baru');if(my=='b')ai()};
 btn('Baru',fresh);
 btn('Undo',()=>{tok++;E.stop();b.lock=false;b.g.undo();if(b.g.turn()!=my)b.g.undo();b.last=null;b.draw();b.onMove=()=>{if(!chk())ai()};chk()});
 btn('Analisis game',()=>go(3,b.g.pgn()));fresh()}

function analyze(pgn){const ct=$('#ct'),pn=$('#pn');
 pn.innerHTML='<textarea id="pg" rows="4" placeholder="Tempel PGN di sini…"></textarea><div id="rs"></div>';$('#pg').value=pgn||P.last||'';
 const mt=document.createElement('select');[500,1000,2000].forEach(v=>mt.add(new Option(v+' ms/langkah',v)));mt.value=1000;ct.appendChild(mt);
 btn('Analisis',async()=>{const t=++tok,g=new Chess();if(!g.load_pgn($('#pg').value)){say('PGN tidak valid');return}
  const h=new Chess(),fens=[h.fen()],ms=[];for(const s of g.history()){ms.push(h.move(s));fens.push(h.fen())}
  const rs=$('#rs');rs.innerHTML='';const R=[],tot={w:[0,0],b:[0,0]};b.lock=false;
  for(let i=0;i<fens.length;i++){if(t!=tok)return;say('Menganalisis '+(i+1)+'/'+fens.length+'…');R[i]=await ev(fens[i],'movetime '+mt.value,i<=16);if(i==0)continue;
   const m=ms[i-1],wh=m.color=='w',loss=Math.max(0,(wh?1:-1)*(K(R[i-1].c)-K(R[i].c)));tot[m.color][0]+=loss;tot[m.color][1]++;
   const lb=loss>=300?['bl','?? Blunder']:loss>=150?['mi','? Kesalahan']:loss>=75?['in','?! Kurang akurat']:['',''];
   const d=document.createElement('div');d.className='r '+lb[0];d.textContent=(wh?Math.ceil(i/2)+'. ':Math.ceil(i/2)+'... ')+m.san+'  '+fmt(R[i].c)+'  '+lb[1]+(lb[0]&&R[i-1].best?'  (terbaik: '+san(fens[i-1],R[i-1].best)+')':'');
   d.onclick=()=>{b.set(fens[i]);b.last=m;b.draw()};rs.appendChild(d)}
  const av=c=>tot[c][1]?Math.round(tot[c][0]/tot[c][1]):0;say('Selesai. Rata-rata kehilangan: Putih '+av('w')+' cp, Hitam '+av('b')+' cp. Tap langkah untuk lihat posisi.')});
 btn('Dalam d18 (posisi di papan)',async()=>{const f=b.g.fen();say('Cek cloud Lichess…');const c=await cloud(f);if(c)return say('Cloud d'+c.d+': '+fmt(c.c)+' terbaik '+san(f,c.best));
  E.onInfo=i=>say('Hitung lokal depth '+i.d+': '+fmt(wp(f,i))+' '+san(f,i.pv));const r=await E.go(f,'depth 18');E.onInfo=null;say('Selesai d'+r.d+': '+fmt(wp(f,r))+' terbaik '+san(f,r.best))});
 btn('Stop',()=>E.stop());say('Tempel PGN atau mainkan game dulu di tab Main')}

function prog(){$('#pn').innerHTML='<h3>Progres</h3><p>Puzzle benar: '+P.ok+'<br>Puzzle salah: '+P.bad+'<br>Pelajaran selesai: '+Object.keys(P.les).length+'/'+L.length+'</p>';
 btn('Reset progres',()=>{if(confirm('Hapus semua progres?')){localStorage.removeItem('cb');location.reload()}},$('#pn'))}

b=Board($('#bd'));go(0);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
