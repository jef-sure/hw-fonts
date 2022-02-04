const app = Vue.createApp(SymbolEdit);
app.component('SymbolCanvas', SymbolCanvas);
app.use(Store);
app.mount('#vue-app');