import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./app.js',import.meta.url),'utf8');
const jokes=await readFile(new URL('./jokes.js',import.meta.url),'utf8');
function app() {
  const elements=new Map(), storage=new Map();
  const element=id=>{if(!elements.has(id)) elements.set(id,{textContent:'',innerHTML:'',hidden:false,addEventListener(){},setAttribute(){},focus(){}});return elements.get(id);};
  const context=vm.createContext({console,Date,URL,AbortSignal,setTimeout,clearTimeout,navigator:{},location:{protocol:'file:'},
    document:{getElementById:element,querySelector:()=>({setAttribute(){}}),documentElement:{style:{setProperty(){}}},addEventListener(){}},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},addEventListener(){},
    fetch:async()=>{throw Error('offline');}});
  vm.runInContext(jokes,context);vm.runInContext(source,context);
  return {run:code=>vm.runInContext(code,context),context,element,storage};
}
function forecast() {
  const days=['2026-11-20','2026-11-21','2026-11-22'];
  const times=days.flatMap(d=>Array.from({length:24},(_,i)=>`${d}T${String(i).padStart(2,'0')}:00`));
  return {current:{time:'2026-11-21T10:15',temperature_2m:12,apparent_temperature:11,weather_code:51,is_day:1,wind_speed_10m:10,wind_direction_10m:90,relative_humidity_2m:70,surface_pressure:1012,cloud_cover:50},
    hourly:{time:times,temperature_2m:times.map(()=>12),apparent_temperature:times.map(()=>11),precipitation_probability:times.map(()=>0),precipitation:times.map(()=>.01),weather_code:times.map(()=>51),wind_speed_10m:times.map(()=>10),uv_index:times.map(()=>1)},
    daily:{time:days,temperature_2m_min:[8,8,8],temperature_2m_max:[15,15,15],weather_code:[51,51,51],precipitation_probability_max:[0,0,0],precipitation_sum:[.1,.1,.1],wind_speed_10m_max:[10,10,10],uv_index_max:[1,1,1],daylight_duration:[36000,36000,36000],sunrise:days.map(d=>d+'T07:00'),sunset:days.map(d=>d+'T17:00')}};
}
test('drizzle at 0% stays honest, explains the mismatch and still recommends wet-weather items',()=> {
  const a=app();a.context.w=forecast();a.run('render(w,null)');
  const html=a.element('app').innerHTML;
  assert.match(html,/0%/);assert.match(html,/Drizzle is forecast despite the 0%/);
  assert.match(html,/Drizzle is indicated around now/);
  assert.doesNotMatch(html,/No rain expected|Dry until/);
  assert.match(html,/Umbrella/);assert.match(html,/Hooded waterproof/);
  assert.doesNotMatch(html,/0% rain chance\./);
  assert.match(html,/more than 0.1 mm/);
});
test('missing probability is unavailable; genuine zero stays zero; daily fallback uses hourly data',()=> {
  const a=app();a.context.w=forecast();
  a.context.w.daily.precipitation_probability_max[1]=null;
  a.context.w.hourly.precipitation_probability=a.context.w.hourly.time.map(()=>null);
  assert.equal(a.run('dayProbability(w,1)'),null);
  a.run('render(w,null)');assert.match(a.element('app').innerHTML,/Unavailable/);
  a.context.w.hourly.precipitation_probability[34]=20;
  assert.equal(a.run('dayProbability(w,1)'),20);
  a.context.w.daily.precipitation_probability_max[1]=0;
  assert.equal(a.run('dayProbability(w,1)'),0);
});
test('recommendations distinguish now, later and future daylight; units agree',()=> {
  const a=app();const w=forecast();a.context.w=w;
  w.current.weather_code=0;w.hourly.weather_code.fill(0);w.hourly.precipitation.fill(0);
  w.hourly.apparent_temperature=w.hourly.time.map(time=>time.endsWith('T16:00')?5:20);
  w.current.apparent_temperature=20;
  assert.equal(a.run('periodItems(w,1,"now").find(i=>i.id==="coat").needed'),false);
  assert.equal(a.run('periodItems(w,1,"later").find(i=>i.id==="coat").needed'),true);
  w.hourly.apparent_temperature=w.hourly.time.map(time=>time.endsWith('T02:00')?-5:20);
  assert.equal(a.run('periodItems(w,2).find(i=>i.id==="coat").needed'),false,'overnight low does not dictate daytime clothing');
  const metric=a.run('JSON.stringify(periodItems(w,1,"now").filter(i=>i.needed).map(i=>i.id))');
  for(const key of ['temperature_2m','apparent_temperature']) {w.current[key]=w.current[key]*1.8+32;w.hourly[key]=w.hourly[key].map(v=>v*1.8+32);}
  for(const key of ['temperature_2m_min','temperature_2m_max']) w.daily[key]=w.daily[key].map(v=>v*1.8+32);
  w.current.wind_speed_10m/=1.609344;w.hourly.wind_speed_10m=w.hourly.wind_speed_10m.map(v=>v/1.609344);w.daily.wind_speed_10m_max=w.daily.wind_speed_10m_max.map(v=>v/1.609344);
  a.run('metric=false');
  assert.equal(a.run('JSON.stringify(periodItems(w,1,"now").filter(i=>i.needed).map(i=>i.id))'),metric);
});
test('incomplete forecasts fail cleanly and stale fallback is identified',async()=> {
  const a=app();a.context.w=forecast();
  a.context.w.hourly.temperature_2m=[];
  assert.throws(()=>a.run('validateForecast(w)'),/incomplete/);
  a.storage.set('cache',JSON.stringify({w:forecast(),air:null,p:{lat:51,lon:0},metric:true,at:Date.now()-5*3600000}));
  await a.run('load({lat:51,lon:0,label:"London"})');
  assert.match(a.element('offline-note').textContent,/stale/);
  await a.run('load({lat:52,lon:0,label:"Different town"})');
  assert.match(a.element('app').innerHTML,/Couldn't get the weather/);
});
