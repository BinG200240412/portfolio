/* Copy follows the supplied project's first eight pages. */
(() => {
  'use strict';
  const copy = {
    zh: {
      title:'心·境·声', lead:'把心率转为钟声与水纹的交互装置。',
      description:'心·境·声：把心率转为钟声与水纹的实物交互装置。',
      dateLabel:'开始时间',roleLabel:'负责事项',role:'项目负责人',stateLabel:'进度',state:'实物装置与试运转记录',
      heroCaption:'钟体与水面的意象',heroAlt:'钟体与水面涟漪的意向图',
      originTitle:'把「静」变成身体的反馈',originIntro:'从枯山水、寺庙与冥想中提取水纹、钟声和心跳，用振动将三者相连。',
      relationsLabel:'心跳、钟声与水纹',heartbeat:'心跳',bell:'钟声',ripples:'水纹',waterAlt:'水面与钟体的涟漪意象',
      mechanismTitle:'把敲击藏进钟体',mechanismIntro:'内杆随舵机转动，外管支撑结构；把敲击机构藏在钟内，保留完整的外形。',
      mechanismAlt:'钟体内部敲击结构的剖面模型',sketchAlt:'机械结构手绘草图',sectionAlt:'钟体内部机构建模',frontAlt:'钟体正面机构建模',
      mappingTitle:'从心率到转速',mappingIntro:'将心率分成三档，各自映射到固定转速，让装置的输出趋于稳定。',
      rangeLabel:'心率区间 · BPM',rangesLabel:'三个心率区间',rangeCaption:'每档对应固定舵机转速',sensor:'心率传感器',servo:'舵机',
      assemblyAlt:'装置组装与调试过程',assemblyCaption:'组装与调试记录',
      physicalTitle:'让振动抵达水面',physicalIntro:'结构调试关注钟体与水面的距离，让敲击的振动转成看得见的涟漪。',
      installationAlt:'展厅里的实物装置成品',detailAlt:'钟体与铺面材料的细节记录',topAlt:'钟体与装置的俯视记录',outputNote:'实物成品与试运转记录'
    },
    en: {
      title:'Heart · Space · Sound',lead:'An interactive installation translating heart-rate data into bell sounds and ripples.',
      description:'Heart · Space · Sound: an interactive installation translating heart-rate data into bell sounds and ripples.',
      dateLabel:'Started',roleLabel:'Role',role:'Project lead',stateLabel:'Status',state:'Physical installation and trial-run records',
      heroCaption:'Visual intent: bell and water',heroAlt:'Visual intent of a bell and ripples on water',
      originTitle:'Stillness, felt through the body',originIntro:'Ripples, bell sounds and heartbeats are drawn from gardens, temples and meditation, then connected through vibration.',
      relationsLabel:'Heartbeat, bell sounds and ripples',heartbeat:'Heartbeat',bell:'Bell sounds',ripples:'Ripples',waterAlt:'Visual intent of water ripples around a bell',
      mechanismTitle:'A hidden striking mechanism',mechanismIntro:'A rotating inner shaft drives the concealed striker; an outer tube supports the structure and keeps the bell’s silhouette intact.',
      mechanismAlt:'Cutaway model of the concealed striking mechanism',sketchAlt:'Original hand-drawn mechanical study',sectionAlt:'Early cutaway model of the bell mechanism',frontAlt:'Early front-view model of the bell mechanism',
      mappingTitle:'From pulse to motion',mappingIntro:'Three heart-rate ranges map to fixed servo speeds to keep the output steadier.',
      rangeLabel:'Heart-rate ranges · BPM',rangesLabel:'Three heart-rate ranges',rangeCaption:'A fixed servo speed for each range',sensor:'Pulse sensor',servo:'Servo',
      assemblyAlt:'Assembly and adjustment of the physical installation',assemblyCaption:'Assembly and adjustment records',
      physicalTitle:'When vibration reaches water',physicalIntro:'Adjusting the distance between bell and water allows the vibration to become visible ripples.',
      installationAlt:'The physical installation in an exhibition space',detailAlt:'Detail record of the bell and surrounding material',topAlt:'Top-view record of the bell and installation',outputNote:'Physical installation and trial-run records'
    }
  };
  function render(){
    const language=window.PortfolioI18n?.language==='en'?'en':'zh',text=copy[language];
    document.title=text.title+' — Cai Zhengyang';
    document.querySelector('[data-xjs-description]')?.setAttribute('content',text.description);
    for(const [attribute,property] of [['data-xjs','textContent'],['data-xjs-alt','alt'],['data-xjs-aria','aria-label']]){
      document.querySelectorAll('['+attribute+']').forEach(node=>{
        const value=text[node.getAttribute(attribute)];if(value===undefined)return;
        if(property==='aria-label')node.setAttribute(property,value);
        else node[property]=node.hasAttribute('data-cover-title')&&language==='en'?value.replace(/ ·/g,'\u00a0·'):value;
      });
    }
  }
  addEventListener('portfolio:language',render);render();
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.body.classList.add('has-reveal');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-inview');observer.unobserve(entry.target);}
    }),{threshold:.08});
    document.querySelectorAll('.xjs-page').forEach(page=>observer.observe(page));
    window.PortfolioLifecycle?.onDispose?.(()=>observer.disconnect());
  }
})();
