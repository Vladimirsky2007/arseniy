const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static("public"));
app.get("/health", (_req,res)=>res.status(200).type("text").send("OK"));
app.get("/api/status", (_req,res)=>res.json({ok:true,rooms:rooms.size,players:io.engine.clientsCount}));
app.get("/", (_req,res)=>res.sendFile(require("path").join(__dirname,"public","index.html")));

const rooms = new Map();
const MAX_PLAYERS = 4;
const weapons = {
  pistol:{name:"Пистолет",cost:0,damage:1,rate:420,ammo:Infinity},
  shotgun:{name:"Дробовик",cost:180,damage:4,rate:850,ammo:24},
  rifle:{name:"Автомат",cost:320,damage:2,rate:135,ammo:90},
  blaster:{name:"Мем-пушка",cost:550,damage:7,rate:700,ammo:12}
};
const structures = {
  barricade:{name:"Баррикада",cost:100,hp:180},
  turret:{name:"Турель",cost:350,hp:100},
  mine:{name:"Мина",cost:90,hp:1}
};
function code(){return crypto.randomBytes(3).toString("hex").toUpperCase();}
function publicRoom(r){
  return {code:r.code,host:r.host,started:r.started,wave:r.wave,
    players:[...r.players.values()].map(p=>({id:p.id,name:p.name,skin:p.skin,money:p.money,hp:p.hp,kills:p.kills,weapon:p.weapon}))};
}
function emitRoom(r){io.to(r.code).emit("room_update",publicRoom(r));}
function addPlayer(socket,r,data){
  const p={id:socket.id,name:String(data.name||"Игрок").slice(0,18),skin:data.skin===2?2:1,
    x:Math.random()*100-50,y:Math.random()*100-50,hp:100,money:150,kills:0,
    weapon:"pistol",ammo:Infinity,lastShot:0,input:{x:0,y:0,aim:0,fire:false},lastBuild:0};
  r.players.set(socket.id,p);socket.join(r.code);socket.data.room=r.code;
  socket.emit("joined",{room:publicRoom(r),you:socket.id});emitRoom(r);
}
io.on("connection",socket=>{
  socket.on("create_room",(data={})=>{
    if(socket.data.room) leaveRoom(socket);
    let c=code();while(rooms.has(c))c=code();
    const r={code:c,host:socket.id,players:new Map(),zombies:[],bullets:[],buildings:[],
      started:false,wave:1,nextWave:Date.now()+12000,nextSpawn:0,nextId:1};
    rooms.set(c,r);addPlayer(socket,r,data);
  });
  socket.on("join_room",(data={})=>{
    const c=String(data.code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
    const r=rooms.get(c);
    if(!r)return socket.emit("error_message","Комната не найдена. Проверь код.");
    if(r.started)return socket.emit("error_message","Игра уже началась.");
    if(r.players.size>=MAX_PLAYERS)return socket.emit("error_message","Комната заполнена (максимум 4 игрока).");
    if(socket.data.room)leaveRoom(socket);
    addPlayer(socket,r,data);
  });
  socket.on("start_game",()=>{
    const r=rooms.get(socket.data.room);if(!r||r.host!==socket.id)return;
    r.started=true;r.nextWave=Date.now()+5000;emitRoom(r);io.to(r.code).emit("game_started");
  });
  socket.on("input",v=>{
    const r=rooms.get(socket.data.room),p=r?.players.get(socket.id);if(!p||!r.started)return;
    p.input={x:Math.max(-1,Math.min(1,Number(v.x)||0)),y:Math.max(-1,Math.min(1,Number(v.y)||0)),
      aim:Number(v.aim)||0,fire:!!v.fire};
  });
  socket.on("buy",key=>{
    const r=rooms.get(socket.data.room),p=r?.players.get(socket.id),w=weapons[key];
    if(!p||!w||p.money<w.cost)return;
    if(p.weapon===key){p.ammo=key==="pistol"?Infinity:w.ammo;return socket.emit("notice","Боезапас пополнен!");}
    p.money-=w.cost;p.weapon=key;p.ammo=w.ammo;socket.emit("notice",`Куплено: ${w.name}`);
  });
  socket.on("build",key=>{
    const r=rooms.get(socket.data.room),p=r?.players.get(socket.id),b=structures[key];
    if(!r||!p||!b||p.money<b.cost||Date.now()-p.lastBuild<700)return;
    p.money-=b.cost;p.lastBuild=Date.now();
    const x=p.x+Math.cos(p.input.aim)*65,y=p.y+Math.sin(p.input.aim)*65;
    r.buildings.push({id:r.nextId++,type:key,x,y,hp:b.hp,owner:p.id,lastFire:0});
    socket.emit("notice",`${b.name} построена!`);
  });
  socket.on("disconnect",()=>leaveRoom(socket));
});
function leaveRoom(socket){
  const c=socket.data.room,r=rooms.get(c);if(!r)return;
  r.players.delete(socket.id);socket.leave(c);delete socket.data.room;
  if(!r.players.size){rooms.delete(c);return;}
  if(r.host===socket.id)r.host=r.players.keys().next().value;
  emitRoom(r);
}
function spawnZombie(r){
  const a=Math.random()*Math.PI*2,dist=540+Math.random()*180;
  r.zombies.push({id:r.nextId++,x:Math.cos(a)*dist,y:Math.sin(a)*dist,hp:2+Math.floor(r.wave/2),
    speed:34+Math.random()*14+r.wave*2,attack:0});
}
let previous=Date.now();
setInterval(()=>{
  const now=Date.now(),dt=Math.min((now-previous)/1000,.05);previous=now;
  for(const r of rooms.values()){
    if(!r.started||!r.players.size)continue;
    const alive=[...r.players.values()].filter(p=>p.hp>0);
    if(!alive.length){
      r.started=false;io.to(r.code).emit("game_over",{wave:r.wave});continue;
    }
    if(now>=r.nextWave&&r.zombies.length===0){
      r.wave++;r.nextWave=now+5000;io.to(r.code).emit("notice",`ВОЛНА ${r.wave}! Держитесь, герои.`);
    }
    if(now>=r.nextSpawn&&r.zombies.length<Math.min(45,5+r.wave*3)){
      spawnZombie(r);r.nextSpawn=now/1+Math.max(220,1050-r.wave*55);
    }
    for(const p of r.players.values()){
      if(p.hp<=0)continue;
      const l=Math.hypot(p.input.x,p.input.y)||1;
      p.x+=p.input.x/l*190*dt;p.y+=p.input.y/l*190*dt;
      const w=weapons[p.weapon];
      if(p.input.fire&&now-p.lastShot>=w.rate&&p.ammo>0){
        p.lastShot=now;if(p.ammo!==Infinity)p.ammo--;
        r.bullets.push({id:r.nextId++,owner:p.id,x:p.x,y:p.y,vx:Math.cos(p.input.aim)*570,vy:Math.sin(p.input.aim)*570,
          damage:w.damage,life:1.15,weapon:p.weapon});
      }
    }
    for(const b of r.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
    for(const z of r.zombies){
      let target=null,bd=Infinity;
      for(const p of alive){const d=Math.hypot(p.x-z.x,p.y-z.y);if(d<bd){bd=d;target=p;}}
      if(target){
        const a=Math.atan2(target.y-z.y,target.x-z.x);
        let blocked=false;
        for(const wall of r.buildings){if(wall.hp>0&&Math.hypot(wall.x-z.x,wall.y-z.y)<31){blocked=true;wall.hp-=12*dt;break;}}
        if(!blocked){z.x+=Math.cos(a)*z.speed*dt;z.y+=Math.sin(a)*z.speed*dt;}
        if(bd<31){target.hp-=14*dt;}
      }
    }
    for(const b of r.bullets){
      if(b.life<=0)continue;
      for(const z of r.zombies){
        if(z.hp>0&&Math.hypot(z.x-b.x,z.y-b.y)<22){z.hp-=b.damage;b.life=0;
          if(z.hp<=0){const p=r.players.get(b.owner);if(p){p.kills++;p.money+=20;}}
          break;
        }
      }
    }
    for(const s of r.buildings){
      if(s.hp<=0)continue;
      if(s.type==="turret"&&now-s.lastFire>550){
        let target=null,bd=280;
        for(const z of r.zombies){const d=Math.hypot(z.x-s.x,z.y-s.y);if(d<bd){bd=d;target=z;}}
        if(target){target.hp-=1;s.lastFire=now;if(target.hp<=0){const p=r.players.get(s.owner);if(p){p.kills++;p.money+=20;}}}
      }
      if(s.type==="mine"){
        const z=r.zombies.find(z=>Math.hypot(z.x-s.x,z.y-s.y)<42);
        if(z){z.hp-=20;s.hp=0;if(z.hp<=0){const p=r.players.get(s.owner);if(p){p.kills++;p.money+=20;}}}
      }
    }
    r.zombies=r.zombies.filter(z=>z.hp>0);
    r.bullets=r.bullets.filter(b=>b.life>0);
    r.buildings=r.buildings.filter(s=>s.hp>0);
    io.to(r.code).emit("state",{players:[...r.players.values()].map(p=>({id:p.id,name:p.name,skin:p.skin,x:p.x,y:p.y,hp:Math.max(0,p.hp),money:p.money,kills:p.kills,weapon:p.weapon,ammo:p.ammo===Infinity?-1:p.ammo})),
      zombies:r.zombies,bullets:r.bullets,buildings:r.buildings,wave:r.wave});
  }
},50);
const PORT=process.env.PORT||3000;server.listen(PORT,"0.0.0.0",()=>console.log("ARSENIY SKYSHOK 1.0 listening on "+PORT));
