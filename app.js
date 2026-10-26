/* Monte Azul. Toda la información se conserva únicamente en este navegador. */
(() => {
  'use strict';
  const C = window.IceCore, KEY = 'mi-hielo-v1';
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uniqueId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  let database = C.freshDatabase(), date = C.today(), blockedStorage = false, toastTimer, focusReturn;
  try { const saved = localStorage.getItem(KEY); if (saved) database = C.validateDatabase(JSON.parse(saved)); }
  catch { blockedStorage = true; storageWarning('No pudimos leer los pedidos guardados. No los sobrescribiremos. Descarga una copia de lo que anotes antes de cerrar, o recupera una copia anterior desde Ayuda.'); }
  function order() { return database.orders[date]; }
  function storageWarning(message) { $('storage-warning').textContent = message; $('storage-warning').hidden = false; }
  function save() {
    if (blockedStorage) { $('save-state').textContent = '⚠ Sin guardar: descarga una copia'; return; }
    try { localStorage.setItem(KEY,JSON.stringify(database)); $('save-state').innerHTML = '<span aria-hidden="true">✓</span> Guardado en este celular'; $('storage-warning').hidden = true; }
    catch { $('save-state').textContent = '⚠ No se pudo guardar'; storageWarning('No se pudo guardar en este navegador. Descarga una copia de seguridad antes de cerrar para conservar lo que anotaste.'); }
  }
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; },5000); }
  function placeName(id) {
    const index = order().destinations.findIndex(p => p.id === id);
    return index < 0 ? 'Sin lugar asignado' : order().destinations[index].name || `Lugar ${index+1} por completar`;
  }
  function openDate(nextDate) {
    if (!C.validDate(nextDate)) { $('order-date').value = date; toast('Elige una fecha válida.'); return; }
    date = nextDate;
    if (!Object.hasOwn(database.orders,date)) database.orders[date] = C.createOrder(date);
    $('order-date').value = date;
    $('summary-heading').textContent = date === C.today() ? 'El total de hoy' : 'El total del pedido';
    for (const field of ['vehicle','driver']) $(field).value = order()[field];
    $('day-notice').hidden = date === C.today();
    renderDestinations(); renderCustomers(); updateSummary(); save();
  }
  function renderDestinations() {
    const places = order().destinations;
    $('destination-count').textContent = `${places.length} ${places.length === 1 ? 'lugar':'lugares'}`;
    $('add-destination').disabled = places.length >= C.MAX_DESTINATIONS;
    $('destinations').innerHTML = places.map((p,i) => `<div class="destination-row" data-place-id="${escape(p.id)}"><span class="stop-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><label for="destination-${escape(p.id)}">Lugar de entrega ${i+1}<input id="destination-${escape(p.id)}" data-place-input maxlength="100" autocomplete="off" placeholder="Escribe el lugar de entrega" value="${escape(p.name)}"></label><button type="button" class="icon-button remove-place" data-remove-place aria-label="Quitar lugar de entrega ${i+1}" ${places.length === 1 ? 'disabled':''}>×</button></div>`).join('');
  }
  $('destinations').addEventListener('input',event => {
    if (!event.target.matches('[data-place-input]')) return;
    const place = order().destinations.find(p => p.id === event.target.closest('[data-place-id]').dataset.placeId);
    place.name = C.clean(event.target.value,100); renderCustomers(); updateSummary(); save();
  });
  $('add-destination').addEventListener('click',() => {
    if (order().destinations.length >= C.MAX_DESTINATIONS) return;
    const id = uniqueId('place'); order().destinations.push({id,name:''});
    renderDestinations(); renderCustomers(); updateSummary(); save();
    const rows = $('destinations').querySelectorAll('[data-place-input]'); rows[rows.length-1].focus();
  });
  $('destinations').addEventListener('click',event => {
    const button = event.target.closest('[data-remove-place]');
    if (!button || order().destinations.length === 1) return;
    const id = button.closest('[data-place-id]').dataset.placeId;
    const assigned = order().customers.filter(c => c.destinationId === id).length;
    const remove = () => {
      order().destinations = order().destinations.filter(p => p.id !== id);
      order().customers.forEach(c => { if (c.destinationId === id) c.destinationId = ''; });
      renderDestinations(); renderCustomers(); updateSummary(); save();
      toast(assigned ? 'Lugar quitado. Asigna un nuevo lugar a sus clientes antes de crear el PDF.':'Lugar de entrega quitado.');
    };
    if (assigned) confirmAction('¿Quitar este lugar?',`${placeName(id)} tiene ${assigned} ${assigned === 1 ? 'cliente asignado':'clientes asignados'}. Sus pedidos se conservan, pero deberás elegirles otro lugar de entrega.`,'Sí, quitar lugar',remove);
    else remove();
  });
  function statusText(c) { return c.status === 'ordered' ? 'Pedido anotado' : c.status === 'none' ? 'Hoy no lleva':'Por confirmar'; }
  function cardHTML(c) {
    const initials = c.name.split(/\s+/).slice(0,2).map(n => n[0]).join('').toUpperCase();
    const qty = field => `<div class="quantity-field"><label for="${escape(c.id)}-${field}">${field === 'bultos' ? 'Bultos':'Bolsas'}</label><div class="stepper"><button type="button" data-action="minus" data-field="${field}" aria-label="Restar un ${field === 'bultos' ? 'bulto':'bolsa'} a ${escape(c.name)}" ${c[field] === 0 ? 'disabled':''}>−</button><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" id="${escape(c.id)}-${field}" data-field="${field}" value="${c[field]}" aria-label="${field} de ${escape(c.name)}"><button type="button" data-action="plus" data-field="${field}" aria-label="Sumar un ${field === 'bultos' ? 'bulto':'bolsa'} a ${escape(c.name)}" ${c[field] === C.MAX_QUANTITY ? 'disabled':''}>+</button></div></div>`;
    return `<article class="customer-card is-${c.status}" data-id="${escape(c.id)}"><div class="customer-top"><span class="avatar" aria-hidden="true">${escape(initials)}</span><div class="customer-title"><h3>${escape(c.name)}</h3><span class="customer-status">${statusText(c)}</span></div><button type="button" class="icon-button" data-action="edit" aria-label="Editar pedido de ${escape(c.name)}">⋯</button></div><button type="button" class="place-chip ${c.destinationId ? '':'unassigned'}" data-action="edit" aria-label="Cambiar lugar de entrega de ${escape(c.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${escape(placeName(c.destinationId))}<span aria-hidden="true">⌄</span></button><div class="quantity-grid">${qty('bultos')}${qty('bolsas')}</div><div class="customer-tools"><button type="button" class="text-button" data-action="note" aria-expanded="${Boolean(c.note)}" aria-controls="${escape(c.id)}-note-field">${c.note ? 'Editar nota':'+ Agregar nota'}</button><button type="button" class="no-order" data-action="none" aria-pressed="${c.status === 'none'}">${c.status === 'none' ? '✓ Sin pedido':'Sin pedido'}</button></div><div class="note-field" id="${escape(c.id)}-note-field" ${c.note ? '':'hidden'}><label for="${escape(c.id)}-note">Nota para ${escape(c.name)}</label><textarea id="${escape(c.id)}-note" maxlength="240" placeholder="Ej.: entregar temprano" rows="2">${escape(c.note)}</textarea></div></article>`;
  }
  function renderCustomers() {
    const count = order().customers.length;
    $('customers').innerHTML = count ? order().customers.map(cardHTML).join('') : '<div class="empty-customers"><div class="empty-illustration" aria-hidden="true"><span class="empty-person"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg></span><span class="empty-plus">＋</span></div><span class="mini-label">TODO EMPIEZA CON UNA LLAMADA</span><h3>Tu primer cliente<br>está a una llamada.</h3><p>Agrega su nombre y lo que te pida.<br>Nosotros nos encargamos de sumar.</p></div>';
    $('customer-count').textContent = `${count} ${count === 1 ? 'cliente':'clientes'}`;
    $('add-customer').innerHTML = `<span aria-hidden="true">＋</span> ${count ? 'Agregar otro cliente':'Agregar el primer cliente'}`;
  }
  function refreshCard(card,c) {
    card.className = `customer-card is-${c.status}`; card.querySelector('.customer-status').textContent = statusText(c);
    const button = card.querySelector('[data-action="none"]'); button.setAttribute('aria-pressed',String(c.status === 'none')); button.textContent = c.status === 'none' ? '✓ Sin pedido':'Sin pedido';
    for (const field of ['bultos','bolsas']) { card.querySelector(`[data-action="minus"][data-field="${field}"]`).disabled = c[field] === 0; card.querySelector(`[data-action="plus"][data-field="${field}"]`).disabled = c[field] === C.MAX_QUANTITY; }
  }
  function updateSummary() {
    const current = order(), t = C.totals(current), count = current.customers.length, pending = count-t.reviewed;
    const groups = C.groupByDestination(current), unassigned = groups.find(g => !g.id)?.customers.length || 0;
    $('total-bultos').textContent = t.bultos; $('total-bolsas').textContent = t.bolsas;
    $('share-pdf-button').disabled = !count; $('download-pdf-button').disabled = !count;
    $('progress-label').textContent = count ? (pending ? 'Clientes confirmados':'Todos los clientes revisados'):'Listos para empezar';
    $('progress-fraction').textContent = `${t.reviewed}/${count}`; $('progress').max = count || 1; $('progress').value = t.reviewed;
    $('pending-hint').textContent = unassigned ? `${unassigned} ${unassigned === 1 ? 'cliente sin lugar asignado':'clientes sin lugar asignado'}. Edita su pedido para elegir uno.` : pending ? `${pending} ${pending === 1 ? 'cliente pendiente de confirmar':'clientes pendientes de confirmar'}. Se indicará en el PDF.` : count ? 'Las notas y los viajes no cambian estos totales.':'Agrega a la primera persona para empezar.';
    $('pending-hint').classList.toggle('needs-attention',Boolean(unassigned));
    $('destination-totals').innerHTML = groups.filter(g => g.name || g.customers.length).map(g => `<div class="place-total"><span><i aria-hidden="true"></i>${escape(g.name || placeName(g.id))}</span><strong>${g.totals.bultos}<small> bult.</small> <b>·</b> ${g.totals.bolsas}<small> bols.</small></strong></div>`).join('');
    $('pdf-preview').innerHTML = `<div class="preview-brand">MONTE AZUL <span>Pedido de hielo</span></div><p class="pdf-preview-meta">${escape(C.longDate(date))}</p>${groups.map(g => `<h4 class="preview-place">${escape(g.name || placeName(g.id))}</h4><table class="pdf-preview-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Bultos</th><th scope="col">Bolsas</th></tr></thead><tbody>${g.customers.map(c => `<tr><th scope="row">${escape(c.name)}${c.status !== 'ordered' || c.note ? `<small>${escape([c.status === 'pending' ? 'Pendiente de confirmar':c.status === 'none' ? 'Sin pedido':'',c.note].filter(Boolean).join(' · '))}</small>`:''}</th><td>${c.bultos}</td><td>${c.bolsas}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Subtotal</th><td>${g.totals.bultos}</td><td>${g.totals.bolsas}</td></tr></tfoot></table>`).join('')}<p class="preview-grand-total">TOTAL: ${t.bultos} bultos · ${t.bolsas} bolsas</p><p class="pdf-preview-meta">Vehículo: ${escape(current.vehicle) || 'Por completar'}<br>Conductor: ${escape(current.driver) || 'Por completar'}</p>`;
    $('dock-total').textContent = `${t.bultos} bultos · ${t.bolsas} bolsas`;
    $('dock-pending').textContent = !count ? 'Agrega el primer cliente':unassigned ? `${unassigned} sin lugar asignado`:pending ? `${pending} por confirmar`:'✓ Todo en orden';
    $('review-button').innerHTML = count ? 'Ver resumen <span aria-hidden="true">↑</span>':'Agregar cliente <span aria-hidden="true">＋</span>';
  }
  function changed(card,c) { refreshCard(card,c); updateSummary(); save(); }
  $('customers').addEventListener('input',event => {
    const card = event.target.closest('[data-id]'); if (!card) return;
    const c = order().customers.find(c => c.id === card.dataset.id);
    if (event.target.matches('textarea')) { c.note = C.clean(event.target.value,240); card.querySelector('[data-action="note"]').textContent = c.note ? 'Editar nota':'+ Agregar nota'; }
    else if (event.target.matches('input[data-field]')) {
      const input = event.target, field = input.dataset.field;
      if (!/^\d{0,5}$/.test(input.value) || C.quantity(input.value) === null) { input.value = c[field]; toast('Escribe una cantidad entera entre 0 y 99999.'); return; }
      c[field] = C.quantity(input.value); c.status = c.bultos || c.bolsas ? 'ordered':'pending';
    } else return;
    changed(card,c);
  });
  $('customers').addEventListener('focusin',event => { if (event.target.matches('input[data-field]')) event.target.select(); });
  $('customers').addEventListener('focusout',event => {
    if (!event.target.matches('input[data-field]')) return;
    const c = order().customers.find(c => c.id === event.target.closest('[data-id]').dataset.id); event.target.value = c[event.target.dataset.field];
  });
  $('customers').addEventListener('click',event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const card = button.closest('[data-id]'), c = order().customers.find(c => c.id === card.dataset.id), action = button.dataset.action;
    if (action === 'edit') { editCustomer(c); return; }
    if (action === 'note') { const field = card.querySelector('.note-field'); field.hidden = !field.hidden; button.setAttribute('aria-expanded',String(!field.hidden)); if (!field.hidden) field.querySelector('textarea').focus(); return; }
    if (action === 'none') {
      const apply = () => { c.status = c.status === 'none' ? 'pending':'none'; c.bultos = 0; c.bolsas = 0; card.querySelectorAll('input[data-field]').forEach(input => { input.value = '0'; }); changed(card,c); };
      if (c.bultos || c.bolsas) confirmAction('¿Marcar sin pedido?',`Se pondrán en cero los ${c.bultos} bultos y ${c.bolsas} bolsas de ${c.name}. Su nota se conserva.`,'Sí, sin pedido',apply); else apply();
      return;
    }
    const field = button.dataset.field; c[field] = Math.max(0,Math.min(C.MAX_QUANTITY,c[field]+(action === 'plus' ? 1:-1))); c.status = c.bultos || c.bolsas ? 'ordered':'pending'; card.querySelector(`input[data-field="${field}"]`).value = c[field]; changed(card,c);
  });
  function dialog(title,html) { focusReturn = document.activeElement; $('dialog-title').textContent = title; $('dialog-content').innerHTML = html; if (!$('app-dialog').open) $('app-dialog').showModal(); }
  function closeDialog() { $('app-dialog').close(); }
  $('close-dialog').addEventListener('click',closeDialog);
  $('app-dialog').addEventListener('close',() => { if (focusReturn?.isConnected) focusReturn.focus(); });
  function confirmAction(title,description,label,callback) {
    dialog(title,`<div class="dialog-body"><p>${escape(description)}</p><div class="dialog-actions"><button class="button secondary" id="cancel-action" type="button">Cancelar</button><button class="button primary" id="confirm-action" type="button">${escape(label)}</button></div></div>`);
    $('cancel-action').addEventListener('click',closeDialog); $('confirm-action').addEventListener('click',() => { closeDialog(); callback(); });
  }
  function editCustomer(c = null) {
    if (!c && order().customers.length >= 200) { toast('Puedes tener hasta 200 clientes por pedido.'); return; }
    const selected = c?.destinationId ?? (order().destinations.length === 1 ? order().destinations[0].id:'');
    const options = order().destinations.map(p => `<option value="${escape(p.id)}" ${p.id === selected ? 'selected':''}>${escape(placeName(p.id))}</option>`).join('');
    dialog(c ? 'Editar pedido del cliente':'Una llamada, un nuevo pedido',`<form class="dialog-form" id="customer-form"><p class="form-intro">Anota lo que te pidió. Las cuentas se actualizan solas.</p><label>Nombre del cliente<input id="customer-name" maxlength="60" required autocomplete="off" placeholder="¿Con quién hablaste?" value="${escape(c?.name || '')}"></label><label>Lugar de entrega<select id="customer-destination" required><option value="" ${selected ? '':'selected'}>Elige un lugar de entrega</option>${options}</select></label><div class="customer-form-quantities"><label>Bultos<input id="customer-bultos" type="text" inputmode="numeric" pattern="[0-9]{1,5}" maxlength="5" required value="${c?.bultos ?? 0}"></label><label>Bolsas<input id="customer-bolsas" type="text" inputmode="numeric" pattern="[0-9]{1,5}" maxlength="5" required value="${c?.bolsas ?? 0}"></label></div><label>Nota <span class="optional">(opcional)</span><input id="customer-note" maxlength="240" placeholder="Ej.: entregar temprano" value="${escape(c?.note || '')}"></label><div class="dialog-actions">${c ? '<button type="button" class="button secondary danger" id="remove-customer">Quitar cliente</button>':''}<button type="submit" class="button primary">${c ? 'Guardar cambios':'Agregar al pedido'} <span aria-hidden="true">✓</span></button></div></form>`);
    $('customer-name').focus();
    for (const field of ['customer-bultos','customer-bolsas']) $(field).addEventListener('focus',() => $(field).select());
    $('customer-form').addEventListener('submit',event => {
      event.preventDefault(); const name = C.clean($('customer-name').value,60), destinationId = $('customer-destination').value;
      if (!name) { $('customer-name').setCustomValidity('Escribe el nombre del cliente.'); $('customer-name').reportValidity(); return; }
      if (order().customers.some(other => other.id !== c?.id && other.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es') && other.destinationId === destinationId)) { $('customer-name').setCustomValidity('Este cliente ya está en este lugar. Puedes editar su pedido.'); $('customer-name').reportValidity(); return; }
      if (!order().destinations.some(p => p.id === destinationId)) { toast('Elige un lugar de entrega de este pedido.'); return; }
      const bultos = C.quantity($('customer-bultos').value), bolsas = C.quantity($('customer-bolsas').value), note = C.clean($('customer-note').value,240);
      if (bultos === null || bolsas === null) { toast('Escribe cantidades enteras entre 0 y 99999.'); return; }
      const status = bultos || bolsas ? 'ordered':c?.status === 'none' ? 'none':'pending';
      const values = {name,bultos,bolsas,note,status,destinationId};
      if (c) Object.assign(c,values); else order().customers.push({id:uniqueId('client'),...values});
      renderCustomers(); updateSummary(); save(); closeDialog(); toast(c ? 'Pedido actualizado.':'Listo, cliente y pedido agregados.');
    });
    $('customer-name').addEventListener('input',() => $('customer-name').setCustomValidity(''));
    $('customer-destination').addEventListener('change',() => $('customer-name').setCustomValidity(''));
    if (c) $('remove-customer').addEventListener('click',() => confirmAction('¿Quitar este cliente?',`Se quitará a ${c.name} de este pedido. Los otros días no cambian.`,'Sí, quitar',() => { order().customers = order().customers.filter(other => other.id !== c.id); renderCustomers(); updateSummary(); save(); toast('Cliente quitado.'); }));
  }
  $('add-customer').addEventListener('click',() => editCustomer());
  for (const field of ['vehicle','driver']) $(field).addEventListener('input',() => { order()[field] = C.clean($(field).value,field === 'vehicle' ? 30:80); updateSummary(); save(); });
  $('order-date').addEventListener('change',() => openDate($('order-date').value));
  $('today-button').addEventListener('click',() => openDate(C.today())); $('open-today').addEventListener('click',() => openDate(C.today()));
  $('review-button').addEventListener('click',() => { if (!order().customers.length) { editCustomer(); return; } $('summary-section').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto':'smooth'}); });
  function checkDelivery() {
    for (const p of order().destinations) {
      if (!C.clean(p.name)) { toast('Escribe el nombre de cada lugar de entrega antes de crear el PDF.'); const row = [...$('destinations').children].find(row => row.dataset.placeId === p.id); row.querySelector('input').focus(); return false; }
    }
    const names = order().destinations.map(p => C.clean(p.name).toLocaleLowerCase('es'));
    if (new Set(names).size !== names.length) { toast('Hay lugares con el mismo nombre. Revisa las paradas de entrega.'); $('destinations').querySelector('input').focus(); return false; }
    for (const [id,label] of [['vehicle','la placa del vehículo'],['driver','el nombre del conductor']]) if (!C.clean(order()[id])) { toast(`Completa ${label} antes de crear el PDF.`); $(id).focus(); return false; }
    if (order().customers.some(c => !order().destinations.some(p => p.id === c.destinationId))) { toast('Asigna un lugar de entrega a cada cliente antes de crear el PDF.'); const c = order().customers.find(c => !c.destinationId); if (c) editCustomer(c); return false; }
    if (!order().customers.length) { toast('Agrega al menos un cliente antes de crear el PDF.'); return false; }
    return true;
  }
  function createPdf() { if (!checkDelivery()) return null; try { return window.IcePdf.create(order()); } catch { toast('No se pudo crear el PDF. Vuelve a abrir la página e inténtalo de nuevo.'); return null; } }
  function downloadPdf(pdf) { const url = URL.createObjectURL(pdf.blob), link = document.createElement('a'); link.href = url; link.download = pdf.filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000); }
  $('download-pdf-button').addEventListener('click',() => { const pdf = createPdf(); if (pdf) { downloadPdf(pdf); toast('PDF preparado. Guárdalo para compartirlo cuando quieras.'); } });
  $('share-pdf-button').addEventListener('click',async () => {
    const pdf = createPdf(); if (!pdf) return;
    try { const file = new File([pdf.blob],pdf.filename,{type:'application/pdf'}); if (navigator.share && navigator.canShare?.({files:[file]})) { await navigator.share({files:[file],title:`Monte Azul · Pedido ${date}`}); return; } } catch (error) { if (error.name === 'AbortError') return; }
    downloadPdf(pdf); toast('PDF preparado para descargar. Puedes adjuntarlo desde Archivos o Descargas.');
  });
  $('history-button').addEventListener('click',() => {
    const dates = Object.keys(database.orders).sort().reverse();
    dialog('Tus pedidos guardados',`<div class="dialog-body"><p>Elige un día para revisarlo o corregirlo. Para una fecha nueva, usa el calendario.</p><div class="history-list">${dates.map(d => { const o = database.orders[d], t = C.totals(o); return `<button class="history-item" type="button" data-date="${d}"><strong>${escape(C.longDate(d))}</strong><span>${t.bultos} bultos · ${t.bolsas} bolsas · ${o.destinations.length} ${o.destinations.length === 1 ? 'lugar':'lugares'}</span></button>`; }).join('')}</div></div>`);
    $('dialog-content').querySelectorAll('[data-date]').forEach(button => button.addEventListener('click',() => { openDate(button.dataset.date); closeDialog(); toast('Pedido abierto. Los cambios se guardan en este día.'); }));
  });
  function downloadBackup() { const blob = new Blob([JSON.stringify(database,null,2)],{type:'application/json'}), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `monte-azul-copia-${C.today()}.json`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000); toast('Copia preparada. Guárdala en Archivos.'); }
  $('backup-button').addEventListener('click',downloadBackup);
  $('help-button').addEventListener('click',() => {
    dialog('Un pedido, paso a paso',`<div class="dialog-body"><ol><li><strong>Prepara la entrega.</strong> Escribe el lugar, la placa y el conductor. Toca “Agregar otro lugar de entrega” si hay más paradas. Cada día empieza en blanco.</li><li><strong>Anota cada llamada.</strong> Agrega nombre, bultos, bolsas, lugar y una nota opcional. Toca el lugar de un cliente para cambiarlo. Si no lleva, usa “Sin pedido”.</li><li><strong>Revisa las cuentas.</strong> Verás el total general y los subtotales por lugar. Las notas y los viajes no se suman.</li><li><strong>Comparte el PDF.</strong> Incluye los clientes agrupados por lugar de entrega. Descárgalo o elige WhatsApp, correo u otra aplicación para compartir.</li></ol><h3>En la pantalla del iPhone</h3><p>Abre el enlace en Safari y elige Compartir → Agregar a pantalla de inicio. Activa “Abrir como app web” si aparece. Después de una primera carga completa puedes anotar y crear PDF sin conexión. Enviarlos necesita internet.</p><h3>Tus pedidos quedan en este dispositivo</h3><p>No se sincronizan entre celulares. Borrar los datos del sitio puede borrar el historial. Guarda una copia de vez en cuando; la navegación privada puede conservar los datos solo temporalmente.</p><button id="help-export" type="button" class="button secondary wide">Descargar copia de seguridad</button><label class="button secondary wide" for="backup-file">Recuperar una copia</label><input id="backup-file" type="file" accept=".json,application/json" hidden><p>Recuperar una copia reemplaza los pedidos locales. Las copias de versiones anteriores también se pueden recuperar.</p></div>`);
    $('help-export').addEventListener('click',downloadBackup);
    $('backup-file').addEventListener('change',async event => {
      const file = event.target.files[0]; if (!file) return;
      try { if (file.size > 10000000) throw new Error('La copia es demasiado grande. El máximo es 10 MB.'); const restored = C.validateDatabase(JSON.parse(await file.text())); confirmAction('¿Recuperar esta copia?',`Se reemplazarán los pedidos de este navegador por los ${Object.keys(restored.orders).length} pedidos de la copia.`,'Sí, recuperar',() => { database = restored; blockedStorage = false; openDate(C.today()); toast('Copia recuperada.'); }); }
      catch (error) { toast(error instanceof SyntaxError ? 'Este archivo no es una copia válida.':error.message); }
    });
  });
  document.addEventListener('visibilitychange',() => { if (!document.hidden) $('day-notice').hidden = date === C.today(); });
  window.addEventListener('storage',event => {
    if (event.key !== KEY) return;
    try { if (!event.newValue) { blockedStorage = true; $('save-state').textContent = '⚠ Sin guardar'; storageWarning('Se borraron los datos desde otra pestaña. Descarga una copia antes de cerrar.'); return; } database = C.validateDatabase(JSON.parse(event.newValue)); if ($('app-dialog').open) closeDialog(); openDate(date); toast('Pedido actualizado desde otra pestaña.'); }
    catch { storageWarning('No se pudo leer un cambio de otra pestaña. Guarda una copia antes de cerrar.'); }
  });
  openDate(date);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load',() => { navigator.serviceWorker.register('./sw.js').catch(() => storageWarning('El guardado funciona, pero no se pudo preparar el modo sin conexión. Vuelve a abrir la página con internet.')); });
})();
