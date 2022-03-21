const SymbolEdit = {
    mounted() {},
    methods: {
        onCurveChange() {
            this.$store.commit('incrementDataVersion');
        },
        deleteCurve(curveIndex) {
            this.$store.commit('deleteCurve', curveIndex);
        },
        downloadFont() {
            this.$refs.downloadFont.click();
        },
        uploadFont(event) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                this.$store.dispatch('uploadFont', evt.target.result);
            };
            reader.readAsText(event.target.files[0]);
        },
    },
    computed: {
        font() {
            return this.$store.state.font;
        },
        fontName: {
            get() {
                return this.$store.state.font.name;
            },
            set(name) {
                this.$store.commit('setFontName', name);
            },
        },
        symbolOffsetX: {
            get() {
                return this.$store.state.font.symbolOffsetX;
            },
            set(x) {
                this.$store.commit('setSymbolOffset', {
                    x: x,
                    y: this.$store.state.font.symbolOffsetY
                });
            },
        },
        symbolOffsetY: {
            get() {
                return this.$store.state.font.symbolOffsetY;
            },
            set(y) {
                this.$store.commit('setSymbolOffset', {
                    x: this.$store.state.font.symbolOffsetX,
                    y: y,
                });
            },
        },
        symbolSizeX: {
            get() {
                return this.$store.state.font.symbolSizeX;
            },
            set(x) {
                this.$store.commit('setSymbolSize', {
                    x: x,
                    y: this.$store.state.font.symbolSizeY
                });
            },
        },
        symbolSizeY: {
            get() {
                return this.$store.state.font.symbolSizeY;
            },
            set(y) {
                this.$store.commit('setSymbolSize', {
                    x: this.$store.state.font.symbolSizeX,
                    y: y
                });
            },
        },
        baseLine: {
            get() {
                return this.$store.state.font.baseLine;
            },
            set(y) {
                this.$store.commit('setBaseLine', y);
            },
        },
        symbolCurves() {
            const cp = this.$store.state.symbolEdit.codePoint;
            const cs = this.$store.state.font.codePoints[cp];
            return cs ? cs : this.noCurves;
        },
        downloadAfterClick() {
            let blob = new Blob([JSON.stringify(this.$store.state.font, null, '    ')], {
                type: 'application/json'
            });
            if (this.$refs.downloadFont && this.$refs.downloadFont.href) {
                URL.revokeObjectURL(this.$refs.downloadFont.href);
                this.downloadUrl = undefined;
            }
            this.downloadUrl = URL.createObjectURL(blob);
        },
    },
    watch: {
        font() {
            if (this.$refs.downloadFont && this.$refs.downloadFont.href) {
                URL.revokeObjectURL(this.$refs.downloadFont.href);
                this.downloadUrl = undefined;
                this.$refs.downloadFont.files = null;
            }
        },
    },
    data() {
        return {
            noCurves: [],
            downloadUrl: undefined,

        };
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
                            Font name
                        </td>
                        <td colspan="2">
                            <input v-model="fontName" size="50">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Active area offset
                        </td>
                        <td style="width: 60px">X:
                            <input class="coord" v-model.number="symbolOffsetX" @blur="if(!this.symbolOffsetX) this.symbolOffsetX = 0;"> 
                        </td>
                        <td>Y:
                                <input class="coord" v-model.number="symbolOffsetY" @blur="if(!this.symbolOffsetY) this.symbolOffsetY = 0;">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Active area size
                        </td>
                        <td>X: 
                            <input class="coord" v-model.number="symbolSizeX" @blur="if(!this.symbolSizeX) this.symbolSizeX = 0;"> 
                        </td>
                        <td>Y: 
                            <input class="coord" v-model.number="symbolSizeY" @blur="if(!this.symbolSizeY) this.symbolSizeY = 0;">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Base line
                        </td>
                        <td colspan="2">
                            <input class="coord" v-model.number="baseLine" @blur="if(!this.baseLine) this.baseLine = 0;">
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3">
                            <a style="display: none" :download="fontName+'.json'" :href="downloadUrl" @click="downloadAfterClick" ref="downloadFont"></a>
                            Download font '{{fontName}}' <button @click="downloadFont">⭳</button>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3">
                            Upload font <input type="file" multiple="false" accept=".json,application/json" @change="uploadFont"/>
                        </td>
                    </tr>
                    </table>
                    <table>
                        <tr><th colspan="6">Segments</th></tr>
                        <tr v-for="(curve, ci) in symbolCurves">
                            <td>{{ci}}:</td>
                            <td v-for="(point, index) in curve">
                            (<input class="coord" v-model.number="point.x" @input="onCurveChange">, <input class="coord" v-model.number="point.y" @input="onCurveChange">) <span v-if="index < curve.length - 1">-</span>
                            </td>
                            <td><button style="color: red" @click="deleteCurve(ci)">x</button></td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `
};