const app = Vue.createApp(SymbolEdit);
app.component('SymbolCanvas', SymbolCanvas);
app.component('SymbolImage', SymbolImage);
app.use(Store);
app.mount('#vue-app');