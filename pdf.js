/* PDF A4 local, organizado por lugar de entrega. */
(() => {
  'use strict';
  const BLUE=[7,90,245], NAVY=[18,46,98], MUTED=[96,119,150], CYAN=[0,145,189];
  function create(input) {
    if (!window.jspdf?.jsPDF) throw new Error('No se pudo cargar el generador de PDF.');
    const C=window.IceCore;
    if (!C.validDate(input.date)) throw new Error('Fecha no válida.');
    const order=C.validateDatabase({version:2,orders:{[input.date]:input}}).orders[input.date];
    if (!order.customers.length || !C.clean(order.vehicle) || !C.clean(order.driver) || order.destinations.some(p=>!C.clean(p.name)) || order.customers.some(c=>!c.destinationId)) throw new Error('Completa los clientes y los datos de entrega.');
    const names=order.destinations.map(p=>C.clean(p.name).toLocaleLowerCase('es'));
    if (new Set(names).size!==names.length) throw new Error('Los lugares de entrega deben tener nombres distintos.');
    const doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const margin=16,width=178,bottom=277,total=C.totals(order),groups=C.groupByDestination(order);
    let y=0;
    doc.setProperties({title:`Monte Azul · Pedido ${order.date}`,subject:'Pedido de hielo por lugar de entrega',author:'Monte Azul',creator:'Monte Azul'});
    function text(value,x,top,size=10,bold=false,color=NAVY,options={}) { doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(value,x,top,options); }
    function wrap(value,maxWidth,size=10,bold=false) { doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);return doc.splitTextToSize(C.clean(value,500),maxWidth); }
    function heading() {
      doc.setFillColor(...BLUE);doc.roundedRect(margin,16,width,30,3,3,'F');
      text('MONTE AZUL',23,27,9,true,[188,236,255]);text('Pedido de hielo',23,39,22,true,[255,255,255]);
      doc.setDrawColor(195,241,255);doc.setLineWidth(.7);doc.lines([[5,-7],[4,5],[5,-10],[7,12]],163,34);doc.line(164,39,185,39);
      const dateLines=wrap(C.longDate(order.date),width,11);
      text(dateLines,margin,54,11,false,MUTED,{lineHeightFactor:1.3});
      y=54+dateLines.length*5;
      text(`${order.destinations.length} ${order.destinations.length===1?'lugar de entrega':'lugares de entrega'}  |  ${order.customers.length} ${order.customers.length===1?'cliente':'clientes'}`,margin,y+3,9,false,MUTED);
      y+=8;
    }
    function nextPage() { doc.addPage();heading(); }
    function placeHeader(group,continued=false) {
      const lines=wrap(group.name+(continued?' (continuación)':''),width-12,11,true);
      const height=lines.length*4.8+7;
      doc.setFillColor(234,245,255);doc.roundedRect(margin,y,width,height,2,2,'F');
      doc.setFillColor(...BLUE);doc.roundedRect(margin,y,1.3,height,.5,.5,'F');
      text(lines,22,y+7,11,true,BLUE,{lineHeightFactor:1.3});y+=height+3;
    }
    function tableHeader() {
      text('CLIENTE',19,y+5.5,8,true,MUTED);text('BULTOS',99,y+5.5,8,true,MUTED,{align:'right'});text('BOLSAS',122,y+5.5,8,true,MUTED,{align:'right'});text('NOTAS / ESTADO',131,y+5.5,8,true,MUTED);
      doc.setDrawColor(211,228,249);doc.line(margin,y+8,margin+width,y+8);y+=9;
    }
    heading();
    for (const group of groups) {
      const placeHeight=wrap(group.name,width-12,11,true).length*5+12;
      const first=group.customers[0];
      const firstObservation=first?[first.status==='pending'?'Pendiente de confirmar':first.status==='none'?'Sin pedido':'',first.note].filter(Boolean).join('. '):'';
      const firstHeight=first?Math.max(14,Math.max(wrap(first.name,56,10,true).length*4.6,wrap(firstObservation,60,9).length*4.2)+8):14;
      if (y+placeHeight+10+firstHeight+13>bottom) nextPage();
      placeHeader(group);tableHeader();
      if (!group.customers.length) { text('Sin clientes registrados en este lugar.',19,y+7,9,false,MUTED);y+=15; }
      group.customers.forEach((c,index)=>{
        const state=c.status==='pending'?'Pendiente de confirmar':c.status==='none'?'Sin pedido':'';
        const observation=[state,C.clean(c.note,240)].filter(Boolean).join('. ');
        const nameLines=wrap(c.name,56,10,true),noteLines=wrap(observation,60,9);
        const height=Math.max(12,Math.max(nameLines.length*4.6,noteLines.length*4.2)+7);
        if (y+height>bottom) { nextPage();placeHeader(group,true);tableHeader(); }
        if(index%2===1){doc.setFillColor(246,250,255);doc.rect(margin,y,width,height,'F');}
        text(nameLines,19,y+6,10,true,NAVY,{lineHeightFactor:1.3});text(String(c.bultos),99,y+6,11,true,BLUE,{align:'right'});text(String(c.bolsas),122,y+6,11,true,CYAN,{align:'right'});
        if(observation)text(noteLines,131,y+6,9,false,MUTED,{lineHeightFactor:1.3});
        doc.setDrawColor(225,235,249);doc.setLineWidth(.2);doc.line(margin,y+height,margin+width,y+height);y+=height;
      });
      if(y+12>bottom){nextPage();placeHeader(group,true);}
      doc.setFillColor(239,246,255);doc.rect(margin,y,width,11,'F');text('Subtotal del lugar',19,y+7,9,true,NAVY);text(String(group.totals.bultos),99,y+7,11,true,BLUE,{align:'right'});text(String(group.totals.bolsas),122,y+7,11,true,CYAN,{align:'right'});y+=18;
    }
    const vehicleLines=wrap(`Vehículo: ${order.vehicle}`,width,11,true),driverLines=wrap(`Conductor: ${order.driver}`,width,11,true);
    const pending=order.customers.length-total.reviewed,summaryHeight=50+(vehicleLines.length+driverLines.length)*5+(pending?8:0);
    if(y+summaryHeight>bottom)nextPage();
    doc.setFillColor(...BLUE);doc.roundedRect(margin,y,width,29,3,3,'F');
    text('TOTAL BULTOS',23,y+9,9,true,[205,234,255]);text(String(total.bultos),23,y+23,25,true,[255,255,255]);text('TOTAL BOLSAS',110,y+9,9,true,[205,234,255]);text(String(total.bolsas),110,y+23,25,true,[177,239,255]);y+=41;
    text(vehicleLines,margin,y,11,true,NAVY,{lineHeightFactor:1.3});y+=vehicleLines.length*5+2;
    text(driverLines,margin,y,11,true,NAVY,{lineHeightFactor:1.3});y+=driverLines.length*5+4;
    text('Las notas y los viajes no se suman a las cantidades.',margin,y,9,false,MUTED);y+=7;
    if(pending)text(`${pending} ${pending===1?'cliente pendiente de confirmar.':'clientes pendientes de confirmar.'}`,margin,y,10,true,[154,100,29]);
    const pageCount=doc.getNumberOfPages();
    for(let page=1;page<=pageCount;page++){doc.setPage(page);doc.setDrawColor(215,231,250);doc.line(margin,283,margin+width,283);text('MONTE AZUL · '+order.date,margin,289,8,true,MUTED);text(`Página ${page} de ${pageCount}`,margin+width,289,8,false,MUTED,{align:'right'});}
    return {blob:doc.output('blob'),filename:`pedido-hielo-${order.date}.pdf`,pageCount};
  }
  window.IcePdf={create};
})();
