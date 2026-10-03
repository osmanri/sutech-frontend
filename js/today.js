/* Signed Telegram field dashboard. Browser visitors never see another user's data. */
(() => {
  const COPY = {
    ru: {title:'Мои поля сегодня',eyebrow:'ВАШ ЕЖЕДНЕВНЫЙ ПЛАН',refresh:'Обновить',loading:'Проверяем баланс и погоду ваших полей…',login:'Откройте приложение через Telegram, чтобы видеть свои сохранённые поля и отмечать полив.',open:'Открыть в Telegram',empty:'Добавьте своё первое поле: выберите участок на карте и выполните расчёт. Здесь появится ежедневная рекомендация.',setup:'Настроить поле',error:'Не удалось получить свежие данные. Попробуйте обновить.',expired:'Сессия Telegram истекла. Откройте приложение снова через бота.',deferred:'Сегодня полив не нужен',irrigate:'Поливать сегодня',critical:'Полив нужен · риск водного стресса',unavailable:'Данные недоступны',season_ended:'Сезон завершён',volume:'Объём по расчёту',water:'Полив выполнен',field:'Поле',ha:'га',m3:'м³',mm:'мм',reason:'Дефицит {deficit} мм, порог полива {threshold} мм. За день: потребление культуры {etc} мм, осадки {rain} мм.',done:'Баланс обновлён после полива.',seasonReason:'Проверьте дату посадки и продолжительность сезона в настройках поля.',unavailableReason:'Свежая рекомендация появится после успешного обновления данных.',dialog:'Записать полив',hint:'Укажите фактически внесённую воду. Баланс уменьшится с учётом способа полива; запись появится в журнале бота.',volumeLabel:'Фактически внесено, м³',cancel:'Отмена',save:'Подтвердить полив',saving:'Сохраняем…',conflict:'Баланс поля изменился. Обновите карточку и подтвердите новый объём.',invalid:'Введите объём воды больше нуля.',date:'Расчёт за',saved:'Полив записан. Баланс обновлён.',saveError:'Не удалось сохранить. Проверьте связь и попробуйте снова.'},
    kz: {title:'Алқаптарым бүгін',eyebrow:'КҮНДЕЛІКТІ ЖОСПАРЫҢЫЗ',refresh:'Жаңарту',loading:'Алқаптардың су балансы мен ауа райын тексерудеміз…',login:'Сақталған алқаптарды көру және суаруды тіркеу үшін қолданбаны Telegram арқылы ашыңыз.',open:'Telegram арқылы ашу',empty:'Алғашқы алқабыңызды қосыңыз: картадан учаскені таңдап, есеп жасаңыз. Мұнда күнделікті ұсыныс пайда болады.',setup:'Алқапты баптау',error:'Жаңа деректер алынбады. Қайта жаңартып көріңіз.',expired:'Telegram сессиясы аяқталды. Қолданбаны бот арқылы қайта ашыңыз.',deferred:'Бүгін суару қажет емес',irrigate:'Бүгін суару керек',critical:'Суару керек · су тапшылығы қаупі',unavailable:'Деректер қолжетімсіз',season_ended:'Маусым аяқталды',volume:'Есептелген су көлемі',water:'Суару орындалды',field:'Алқап',ha:'га',m3:'м³',mm:'мм',reason:'Тапшылық {deficit} мм, суару шегі {threshold} мм. Бір күнде: дақылдың су тұтынуы {etc} мм, жауын-шашын {rain} мм.',done:'Суарудан кейін су балансы жаңартылды.',seasonReason:'Алқап баптауларында отырғызу күні мен маусым ұзақтығын тексеріңіз.',unavailableReason:'Жаңа ұсыныс деректер сәтті жаңартылғаннан кейін көрсетіледі.',dialog:'Суаруды тіркеу',hint:'Нақты берілген су көлемін енгізіңіз. Баланс суару әдісіне қарай азаяды; жазба бот журналына сақталады.',volumeLabel:'Нақты берілген су, м³',cancel:'Бас тарту',save:'Суаруды растау',saving:'Сақталуда…',conflict:'Алқаптың су балансы өзгерді. Карточканы жаңартып, жаңа көлемді растаңыз.',invalid:'Нөлден үлкен су көлемін енгізіңіз.',date:'Есеп күні',saved:'Суару тіркелді. Баланс жаңартылды.',saveError:'Сақталмады. Байланысты тексеріп, қайта көріңіз.'},
    en: {title:'My fields today',eyebrow:'YOUR DAILY PLAN',refresh:'Refresh',loading:'Checking your field balances and weather…',login:'Open the app through Telegram to see your saved fields and record irrigation.',open:'Open in Telegram',empty:'Add your first field: select it on the map and run a calculation. Your daily recommendation will appear here.',setup:'Set up a field',error:'Could not get current data. Please refresh.',expired:'Your Telegram session expired. Reopen the app from the bot.',deferred:'No irrigation needed today',irrigate:'Irrigate today',critical:'Irrigation needed · water stress risk',unavailable:'Data unavailable',season_ended:'Season ended',volume:'Calculated water volume',water:'Irrigation completed',field:'Field',ha:'ha',m3:'m³',mm:'mm',reason:'Deficit {deficit} mm; irrigation threshold {threshold} mm. Daily crop water use: {etc} mm; rainfall: {rain} mm.',done:'Balance updated after irrigation.',seasonReason:'Check the planting date and season duration in field settings.',unavailableReason:'A fresh recommendation will appear after data updates successfully.',dialog:'Record irrigation',hint:'Enter the water actually applied. The balance is reduced according to the irrigation method; a record is saved in the bot journal.',volumeLabel:'Water actually applied, m³',cancel:'Cancel',save:'Confirm irrigation',saving:'Saving…',conflict:'The field balance changed. Refresh the card and confirm the new volume.',invalid:'Enter a water volume greater than zero.',date:'Calculated for',saved:'Irrigation recorded. Balance updated.',saveError:'Could not save. Check your connection and try again.'}
  };
  Object.assign(COPY.ru,{deficitLabel:'Дефицит влаги',etcLabel:'Расход культуры',rainLabel:'Осадки за день',reason:'Полив рекомендуется при дефиците от {threshold} мм.'});
  Object.assign(COPY.kz,{deficitLabel:'Ылғал тапшылығы',etcLabel:'Дақыл тұтынуы',rainLabel:'Күндік жауын',reason:'Тапшылық {threshold} мм-ге жеткенде суару ұсынылады.'});
  Object.assign(COPY.en,{deficitLabel:'Water deficit',etcLabel:'Crop water use',rainLabel:'Daily rainfall',reason:'Irrigation is recommended once the deficit reaches {threshold} mm.'});
  let cards=[],mode='login',loading=false,saving=false,selected=null,loadedAuth='',notice='';
  const $=id=>document.getElementById(id);
  const lang=()=>['ru','kz','en'].includes(document.documentElement.lang)?document.documentElement.lang:'ru';
  const copy=()=>COPY[lang()];
  const number=value=>new Intl.NumberFormat(lang()==='kz'?'kk-KZ':lang(),{maximumFractionDigits:2}).format(value);
  const sdk=()=>window.Telegram?.WebApp;
  function element(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!=null)el.textContent=text;return el;}
  async function api(path,body={}) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),65000);
    try {
      const response=await fetch(`https://sutech-core.onrender.com/api/fields/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({init_data:sdk()?.initData,...body}),signal:controller.signal});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){const error=new Error('request failed');error.status=response.status;throw error;}
      return result;
    } finally {clearTimeout(timeout);}
  }
  function render() {
    if(!$('todayPanel'))return;
    const t=copy();$('todayTitle').textContent=t.title;$('todayEyebrow').textContent=t.eyebrow;
    $('todayRefresh').textContent=t.refresh;$('todayRefresh').disabled=loading||saving;
    $('todayRefresh').hidden=mode==='login';$('todayPanel').setAttribute('aria-busy',String(loading));
    $('todayState').textContent=loading?t.loading:mode==='error'?t.error:mode==='expired'?t.expired:notice?t[notice]:'';
    const list=$('todayCards');list.replaceChildren();
    if(mode==='login'||mode==='empty'){
      const box=element('div','today-empty');box.append(element('p','',t[mode==='login'?'login':'empty']));
      const link=element('a','today-primary',t[mode==='login'?'open':'setup']);link.href=mode==='login'?`https://t.me/Su_Tech_bot?start=app_${lang()}`:'#block1';box.append(link);list.append(box);
    } else if(mode==='ready'){
      cards.forEach(card=>{
        const box=element('article','today-card');box.dataset.fieldId=card.id;
        const badge=element('span','today-badge',t[card.status]||t.unavailable);badge.dataset.status=card.status;box.append(badge);
        const crop=typeof I18N!=='undefined'?I18N[lang()]?.crops?.[card.crop]?.name:card.crop;
        box.append(element('h3','',card.name||`${crop||t.field} · ${t.field} ${card.id}`));
        const date=card.date?new Intl.DateTimeFormat(lang()==='kz'?'kk-KZ':lang()).format(new Date(card.date+'T12:00:00')):'';
        box.append(element('p','today-meta',`${crop||t.field} · ${number(card.area_ha)} ${t.ha}${date?' · '+t.date+' '+date:''}${card.timezone?' · '+card.timezone:''}`));
        if(['deferred','irrigate','critical'].includes(card.status)){
          box.append(element('p','today-volume',`${number(card.volume_m3)} ${t.m3}`),element('p','today-volume-label',t.volume));
          const stats=element('dl','today-stats');
          [['deficit',t.deficitLabel],['etc_mm',t.etcLabel],['rain_mm',t.rainLabel]].forEach(([key,label])=>{const item=element('div','');item.append(element('dt','',label),element('dd','',`${number(card[key])} ${t.mm}`));stats.append(item);});
          box.append(stats);
          const reason=t.reason.replace(/\{(deficit|threshold|etc|rain)\}/g,(_,key)=>number(card[{etc:'etc_mm',rain:'rain_mm'}[key]||key]));
          box.append(element('p','today-reason',reason));
          if(card.status!=='deferred'){
            const button=element('button','today-primary',t.water);button.type='button';button.disabled=loading||saving;button.addEventListener('click',()=>openWater(card));box.append(button);
          }
        } else box.append(element('p','today-reason',t[card.status==='season_ended'?'seasonReason':'unavailableReason']));
        list.append(box);
      });
    }
    $('waterDialogTitle').textContent=t.dialog;$('waterDialogHint').textContent=t.hint;
    $('waterVolumeLabel').textContent=t.volumeLabel;$('waterCancel').textContent=t.cancel;$('waterSave').textContent=t[saving?'saving':'save'];
  }
  async function load() {
    if(loading||saving)return;
    if(!sdk()?.initData){mode='login';render();return;}
    loadedAuth=sdk().initData;loading=true;notice='';if(mode!=='ready')mode='loading';render();
    try{const result=await api('today');cards=result.fields;mode=cards.length?'ready':'empty';}
    catch(error){mode=error.status===401?'expired':'error';cards=[];}
    finally{loading=false;render();}
  }
  function connect(){if(sdk()?.initData&&sdk().initData!==loadedAuth)load();}
  function openWater(card){
    selected=card;$('waterFieldName').textContent=card.name||`${copy().field} ${card.id}`;
    $('waterVolume').value=Math.max(.000001,Number(card.volume_m3.toFixed(6)));$('waterError').textContent='';
    $('waterDialog').showModal();$('waterVolume').focus();
  }
  async function save(event){
    event.preventDefault();if(saving||!selected)return;
    const volume=Number($('waterVolume').value);
    if(!Number.isFinite(volume)||volume<=0){$('waterError').textContent=copy().invalid;return;}
    saving=true;$('waterError').textContent='';$('waterCancel').disabled=true;$('waterSave').disabled=true;render();
    let conflict=false;
    try{
      const result=await api('water',{field_id:selected.id,applied_m3:volume,expected_deficit:selected.deficit});
      cards=cards.map(card=>card.id===result.field.id?result.field:card);notice='saved';$('waterDialog').close();
    }catch(error){if(error.status===409){conflict=true;$('waterDialog').close();}else $('waterError').textContent=copy().saveError;}
    finally{saving=false;$('waterCancel').disabled=false;$('waterSave').disabled=false;render();}
    if(conflict){await load();notice='conflict';render();}
  }
  window.SuToday={render,connect};
  window.addEventListener('telegram-ready',connect);
  document.addEventListener('DOMContentLoaded',()=>{
    render();connect();$('todayRefresh').addEventListener('click',load);$('waterForm').addEventListener('submit',save);
    $('waterCancel').addEventListener('click',()=>$('waterDialog').close());
    $('waterDialog').addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  });
})();
