const SymbolEdit = {
    mounted() {},
    methods: {},
    computed: {
        offsetActiveAreaX: {
            get() {
                return this.$store.state.offsetActiveAreaX;
            },
            set(x) {
                this.$store.commit('setActiveAreaOffset', {
                    x: x,
                    y: this.$store.state.offsetActiveAreaY
                });
            },
        },
        offsetActiveAreaY: {
            get() {
                return this.$store.state.offsetActiveAreaY;
            },
            set(y) {
                this.$store.commit('setActiveAreaOffset', {
                    x: this.$store.state.offsetActiveAreaX,
                    y: y,
                });
            },
        },
        activeAreaSizeX: {
            get() {
                return this.$store.state.activeAreaSizeX;
            },
            set(x) {
                this.$store.commit('setActiveAreaSize', {
                    x: x,
                    y: this.$store.state.activeAreaSizeY
                });
            },
        },
        activeAreaSizeY: {
            get() {
                return this.$store.state.activeAreaSizeY;
            },
            set(y) {
                this.$store.commit('setActiveAreaSize', {
                    x: this.$store.state.activeAreaSizeX,
                    y: y
                });
            },
        },
    },
    data() {
        return {};
    },
    template: `
        <div>
            <div style="display: table-row">
                <div style="display: table-cell;vertical-align: top;">
                    <SymbolCanvas></SymbolCanvas>
                </div>
                <div style="display: table-cell;vertical-align: top;">
                    <table>
                    <tr>
                        <td>
                            <label>Active area offset: </label>
                            <input v-model.number="offsetActiveAreaX" @blur="if(!this.offsetActiveAreaX) this.offsetActiveAreaX = 0;"> 
                            <input v-model.number="offsetActiveAreaY" @blur="if(!this.offsetActiveAreaY) this.offsetActiveAreaY = 0;">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label>Active area size: </label>
                            <input v-model.number="activeAreaSizeX" @blur="if(!this.activeAreaSizeX) this.activeAreaSizeX = 0;"> 
                            <input v-model.number="activeAreaSizeY" @blur="if(!this.activeAreaSizeY) this.activeAreaSizeY = 0;">
                        </td>
                    </tr>
                    </table>
                </div>
            </div>
        </div>
    `
};