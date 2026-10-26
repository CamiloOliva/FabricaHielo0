/* Datos y cálculos. Los pedidos se crean siempre sin información predefinida. */
(function (root) {
  'use strict';
  const MAX_QUANTITY = 99999;
  const MAX_DESTINATIONS = 20;
  function today(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && today(date) === value && +value.slice(0,4) >= 1900 && +value.slice(0,4) <= 9999;
  }
  function quantity(value) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 && n <= MAX_QUANTITY ? n : null;
  }
  function clean(value, max = 100) { return String(value ?? '').replace(/[\r\n\t]+/g,' ').trim().slice(0,max); }
  function freshDatabase() { return { version:2, orders:{} }; }
  function createOrder(date) {
    if (!validDate(date)) throw new Error('Fecha no válida.');
    return { date, destinations:[{id:'place-1',name:''}], vehicle:'', driver:'', customers:[] };
  }
  function totals(order) {
    return order.customers.reduce((sum,c) => ({ bultos:sum.bultos+c.bultos, bolsas:sum.bolsas+c.bolsas, reviewed:sum.reviewed+(c.status !== 'pending' ? 1:0) }),{bultos:0,bolsas:0,reviewed:0});
  }
  function longDate(date) {
    if (!validDate(date)) throw new Error('Fecha no válida.');
    const d = new Date(`${date}T12:00:00`);
    return `${new Intl.DateTimeFormat('es-CO',{weekday:'long'}).format(d)} ${d.getDate()} de ${new Intl.DateTimeFormat('es-CO',{month:'long'}).format(d)} de ${d.getFullYear()}`;
  }
  function groupByDestination(order) {
    const groups = order.destinations.map(place => {
      const customers = order.customers.filter(c => c.destinationId === place.id);
      return {...place,customers,totals:totals({customers})};
    });
    const customers = order.customers.filter(c => !order.destinations.some(p => p.id === c.destinationId));
    if (customers.length) groups.push({id:'',name:'Sin lugar asignado',customers,totals:totals({customers})});
    return groups;
  }
  function validateDatabase(raw) {
    const bad = () => { throw new Error('La copia no tiene un formato válido de Monte Azul.'); };
    const text = (s,max,required=false) => typeof s === 'string' && s.length <= max && (!required || clean(s).length > 0) && !/[\r\n\t]/.test(s);
    if (!raw || ![1,2].includes(raw.version) || !raw.orders || typeof raw.orders !== 'object' || Array.isArray(raw.orders)) bad();
    const legacy = raw.version === 1;
    if (legacy && (!raw.preferences || !Array.isArray(raw.preferences.customers))) bad();
    const entries = Object.entries(raw.orders);
    if (entries.length > 10000) bad();
    const orders = entries.map(([date,o]) => {
      if (!validDate(date) || !o || o.date !== date || !text(o.vehicle,30) || !text(o.driver,80)) bad();
      if (legacy && !text(o.destination,100)) bad();
      const destinations = legacy ? [{id:'place-1',name:o.destination}] : o.destinations;
      if (!Array.isArray(destinations) || !destinations.length || destinations.length > MAX_DESTINATIONS) bad();
      const placeIds = new Set();
      for (const p of destinations) {
        if (!p || !text(p.id,100,true) || placeIds.has(p.id) || !text(p.name,100)) bad();
        placeIds.add(p.id);
      }
      if (!Array.isArray(o.customers) || o.customers.length > 200) bad();
      const ids = new Set();
      const customers = o.customers.map(c => {
        if (!c || !text(c.id,100,true) || ids.has(c.id) || !text(c.name,60,true) || typeof c.bultos !== 'number' || typeof c.bolsas !== 'number' || quantity(c.bultos) === null || quantity(c.bolsas) === null || !text(c.note,240) || !['pending','ordered','none'].includes(c.status) || ((c.bultos > 0 || c.bolsas > 0) !== (c.status === 'ordered'))) bad();
        ids.add(c.id);
        const destinationId = legacy ? 'place-1' : c.destinationId;
        if (!text(destinationId,100) || (destinationId && !placeIds.has(destinationId))) bad();
        return {id:c.id,name:c.name,bultos:c.bultos,bolsas:c.bolsas,note:c.note,status:c.status,destinationId};
      });
      // Only the untouched template from the first version is removed.
      const originalNames = ['Yazmin','Fernando','Concho','Dario','Zaira ardila','Edwin','Hermes','Heriberto','Maritza'];
      const unusedExample = legacy && customers.length === 9 && customers.every((c,i) => c.id === `client-${i+1}` && c.name === originalNames[i] && !c.bultos && !c.bolsas && !c.note && c.status === 'pending');
      const untouchedDelivery = legacy && (unusedExample || !customers.length) && o.destination === 'centro abastos' && o.vehicle === 'CCK 379' && o.driver.toLocaleLowerCase('es') === 'yunior';
      return [date,{date,destinations:destinations.map(p => ({id:p.id,name:untouchedDelivery ? '':p.name})),vehicle:untouchedDelivery ? '':o.vehicle,driver:untouchedDelivery ? '':o.driver,customers:unusedExample ? []:customers}];
    });
    return {version:2,orders:Object.fromEntries(orders)};
  }
  root.IceCore = {MAX_QUANTITY,MAX_DESTINATIONS,today,validDate,quantity,clean,freshDatabase,createOrder,totals,longDate,groupByDestination,validateDatabase};
})(typeof globalThis !== 'undefined' ? globalThis : this);
