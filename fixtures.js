/* Datos inventados para pruebas; nunca se cargan en la aplicación. */
window.IceFixtures={order(date='2026-09-26'){
  const order=IceCore.createOrder(date);
  Object.assign(order,{destinations:[{id:'north',name:'Mercado Norte'},{id:'south',name:'Bodega Sur'}],vehicle:'ABC 123',driver:'Pedro'});
  order.customers=[{id:'rosa',name:'Rosa',bultos:5,bolsas:0,note:'Entregar temprano',status:'ordered',destinationId:'north'},{id:'luis',name:'Don Luis',bultos:30,bolsas:20,note:'',status:'ordered',destinationId:'north'},{id:'marta',name:'Marta',bultos:16,bolsas:70,note:'Posible 1 viaje',status:'ordered',destinationId:'south'}];
  return order;
}};
