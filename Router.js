const Router = {
    data() {
        return {
            currentPath: window.location.hash.replace(/^#/, '')
        };
    },
    computed: {
        isClass() {
            if (this.currentPath) {
                if (this.currentPath === 'effects') return "Effects";
            }
            return "SymbolEdit";
        }
    },
    mounted() {
        window.addEventListener('hashchange', () => {
            this.currentPath = window.location.hash.replace(/^#/, '');
        });
    },
    template: `
    <component :is="isClass"></component>
    `
};