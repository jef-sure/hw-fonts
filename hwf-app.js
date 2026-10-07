var app = VueDemi.createApp({
    template: `
    <div>
        <div style="display: table">
            <div style="display: table-row">
                <div style="display: table-cell">
                    <a href="#/">Font editor</a>
                </div>
                <div style="display: table-cell; padding-left: 1em;">
                    <a href="#symbols">Symbols</a>
                </div>
                <div style="display: table-cell; padding-left: 1em;">
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
app.component('SymbolView', SymbolView);
app.component('Effects', Effects);
app.component('Router', Router);
app.use(Pinia.createPinia());
app.mount('#vue-app');