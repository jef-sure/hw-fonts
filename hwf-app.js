var app = Vue.createApp({
    template: `
    <div>
        <div style="display: table">
            <div style="display: table-row">
                <div style="display: table-cell">
                    <a href="#/">Font editor</a>
                </div>
                <div style="display: table-cell">
                    <a href="#effects">Effects</a>
                </div>
            </div>
        </div>
        <Router></Router>
    </div>
`
});
app.component('SymbolEdit', SymbolEdit);
app.component('SymbolCanvas', SymbolCanvas);
app.component('SymbolImage', SymbolImage);
app.component('Router', Router);
app.use(Store);
app.mount('#vue-app');