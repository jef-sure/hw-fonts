const SymbolEdit = {
    mounted() {
        this.setSymbolsBlock();
    },
    methods: {
        // disabled for now
        onPointFocus(event) {
            let i = event.target;
            if (i.getAttribute('curve-x') !== null && i.getAttribute('curve-x') !== '') {
                let cX = parseInt(i.getAttribute('curve-x'));
                let cY = parseInt(i.getAttribute('curve-y'));
                this.$store.commit('setSymbolMouseCaptured', {
                    isCaptured: true,
                    x: undefined,
                    y: undefined,
                    curveX: cX,
                    curveY: cY,
                });
            }
        },
        isCodepointInFont(cp) {
            return (cp in this.$store.state.font.codePoints) ? true : false;
        },
        isCurrentCodepoint(cp) {
            return (parseInt(cp) === parseInt(this.$store.state.symbolEdit.codePoint)) ? true : false;
        },
        selectCurrentSymbol(cp) {
            this.$store.commit('setCurrentCodepoint', cp);
        },
        toggleCodepoint(cp) {
            if (this.isCodepointInFont(cp)) {
                this.$store.commit('removeCodepoint', cp);
            } else {
                this.$store.commit('addCodepoint', cp);
            }
        },
        onCurveChange(event) {
            let i = event.target;
            if (false && i.getAttribute('curve-x') !== null && i.getAttribute('curve-x') !== '') {
                let cX = parseInt(i.getAttribute('curve-x'));
                let cY = parseInt(i.getAttribute('curve-y'));
                this.$store.commit('setSymbolMouseXY', {
                    x: undefined,
                    y: undefined,
                    curveX: cX,
                    curveY: cY,
                });
                this.$store.commit('setSymbolMouseXY', {
                    x: undefined,
                    y: undefined,
                    curveX: cX,
                    curveY: cY,
                });
            } else {
                this.$store.commit('incrementDataVersion');
            }
        },
        deleteCurve(curveIndex, segment) {
            this.$store.commit('deleteCurve', {
                curveIndex: curveIndex,
                segment: segment
            });
        },
        downloadFont() {
            let blob = new Blob([JSON.stringify(this.$store.state.font, null, '    ')], {
                type: 'application/json'
            });
            if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
            this.downloadUrl = URL.createObjectURL(blob);
            this.$nextTick(() => this.$refs.downloadFont.click());
        },
        uploadFont(event) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                this.$store.dispatch('uploadFont', evt.target.result);
            };
            reader.readAsText(event.target.files[0]);
        },
        setSymbolsBlock() {
            this.$store.commit('setSymbolsBlock', this.selectedBlockIndex);
        },
        isSegmentComplete(segment) {
            let curves = this.symbolCurves;
            if (curves === this.noCurves) return true;
            let sa = curves[segment];
            if (!sa.length) return true;
            let lc = sa[sa.length - 1];
            return this.ElementTypes[lc.type].len === lc.points.length;
        },
        isShownSegment(segment) {
            return this.$store.state.symbolEdit.shownSegments[segment];
        },
        setShownSegment(event, segment) {
            let change = {};
            change[segment] = !this.$store.state.symbolEdit.shownSegments[segment];
            this.$store.commit('setShownSegment', change);
        },
    },
    computed: {
        newSegmentType: {
            get() {
                return this.$store.state.symbolEdit.newSegmentType;
            },
            set(type) {
                this.$store.commit('setNewSegmentType', type);
            },
        },
        newElementType: {
            get() {
                return this.$store.state.symbolEdit.newElementType;
            },
            set(type) {
                this.$store.commit('setNewElementType', type);
            },
        },
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
        uploadErrorMessage: {
            get() {
                return this.$store.state.uploadErrorMessage;
            },
            set(m) {
                this.$store.commit('setUploadErrorMessage', m);
            },
        },
        symbolCurves() {
            const cp = this.$store.state.symbolEdit.codePoint;
            if (!cp) return this.noCurves;
            const cs = this.$store.state.font.codePoints[cp];
            return cs ? cs : this.noCurves;
        },
        fontCodePoints() {
            let cps = Object.keys(this.$store.state.font.codePoints).map(e => parseInt(e));
            cps.sort((a, b) => a - b);
            return cps;
        },
        fontSequence() {
            return this.$store.state.fontSequence;
        },
        symbolsBlockBegin() {
            return this.$store.state.symbolsBlock.begin;
        },
        symbolsBlockWidth() {
            return this.$store.state.symbolsBlock.blockWidth;
        },
        symbolsBlockLength() {
            return this.$store.state.symbolsBlock.blockLength;
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
            UnicodeRanges: UnicodeRanges,
            SegmentTypes: SegmentTypes,
            ElementTypes: ElementTypes,
            selectedBlockIndex: 0,
        };
    },
    template: `
        <div>
            <div style="display: table">
                <div style="display: table-row">
                    <div style="display: table-cell;vertical-align: top;">
                        <SymbolCanvas></SymbolCanvas>
                    </div>
                    <div style="display: table-cell;vertical-align: top;">
                        <table class="table">
                        <tbody>
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
                            <td style="width: 5em;">X:
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
                                <a style="display: none" :download="fontName+'.json'" :href="downloadUrl" ref="downloadFont"></a>
                                Download font '{{fontName}}' <button @click="downloadFont" class="btn btn-secondary">⭳</button>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2">
                                Upload font 
                                <input type="file" multiple="false" accept=".json,application/json" @change="uploadFont" :key="fontSequence" style="display: none" ref="uploadFont"/>
                                <button @click="this.$refs.uploadFont.click();" class="btn btn-secondary">Browse ...</button>
                            </td>
                            <td>
                                <span style="color: red;">{{uploadErrorMessage}}&nbsp;<button v-if="uploadErrorMessage" @click="uploadErrorMessage='';">x</button></span>
                            </td>
                        </tr>
                        </tbody>
                        </table>
                        <div style="display: table-row">
                            <div style="display: table-cell">
                                New segment type
                            </div>
                            <div style="display: table-cell">
                            <select v-model="newSegmentType">
                                <option v-for="(segmentName, segment) in SegmentTypes" :value="segment">{{segmentName}}</option>
                            </select>
                            </div>
                        </div>
                        <div style="display: table-row">
                            <div style="display: table-cell">
                                New element type
                            </div>
                            <div style="display: table-cell">
                            <select v-model="newElementType">
                                <option v-for="(es, element) in ElementTypes" :value="element">{{es.name}}</option>
                            </select>
                            </div>
                        </div>
                        <table class="table" style="width: auto;" v-for="(segmentName, segment) in SegmentTypes">
                            <tr><th colspan="7">
                                <input  type="checkbox" :checked="isShownSegment(segment)" @change="(event) => setShownSegment(event, segment)" />
                                {{segmentName}}
                            </th></tr>
                            <tr :class="{incomplete: !isSegmentComplete(segment) && ci === symbolCurves[segment].length-1 }" v-for="(curve, ci) in symbolCurves[segment]">
                            <td>{{ci}}:</td>
                            <th>{{ElementTypes[curve.type].name}}</th>
                            <td v-for="(point, index) in curve.points">
                                (<input class="coord" v-model.number="point.x" :curve-x="point.x" :curve-y="point.y" @change="onCurveChange">, 
                                <input class="coord" v-model.number="point.y" :curve-x="point.x" :curve-y="point.y" @change="onCurveChange">) <span v-if="index < curve.length - 1">-</span>
                                </td>
                                <td><button @click="deleteCurve(ci, segment)" class="btn btn-sm btn-remove">x</button></td>
                            </tr>
                        </table>
                    </div>
                    <div style="display: table-cell;vertical-align: top;">
                        <table class="table box-shadow">
                        <thead>
                        <tr><th colspan="17">Symbols
                            <label><select v-model="selectedBlockIndex" @change="setSymbolsBlock">
                                <option v-for="(range, ri) in UnicodeRanges" :value="ri">{{range["data-begin"]}} - {{range["data-end"]}}: {{range.name}}</option>
                            </select></label>
                        </th></tr>
                        <tr><td></td><th v-for="ci in symbolsBlockWidth">{{(ci-1).toString(16)}}</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="ri in symbolsBlockLength">
                                <th>{{(symbolsBlockBegin + (ri - 1) * symbolsBlockWidth).toString(16).padStart(4,0)}}</th>
                                <td v-for="ci in symbolsBlockWidth">
                                    <div class="dropdown">
                                        <button :style="{backgroundColor: (isCodepointInFont(symbolsBlockBegin + (ri - 1) * symbolsBlockWidth + ci - 1)? '#ffd9dd': null)}"
                                            @click="toggleCodepoint(symbolsBlockBegin + (ri - 1) * symbolsBlockWidth + ci - 1)">
                                            {{String.fromCodePoint(symbolsBlockBegin + (ri - 1) * symbolsBlockWidth + ci - 1)}}
                                        </button>
                                        <template v-if="!isCodepointInFont(symbolsBlockBegin + (ri - 1) * symbolsBlockWidth + ci - 1)">
                                        <div class="dropdown-content bg-primary text-white">
                                            add
                                        </div>
                                        </template>
                                        <template v-else>
                                        <div class="dropdown-content bg-danger text-white">
                                            remove
                                        </div>
                                        </template>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div style="display: table">
                <div style="display: table-row">
                    <div @click="selectCurrentSymbol(cp)" style="display: table-cell; padding: 2px; width: fit-content" v-for="cp in fontCodePoints">
                        <div style="display: table-row">U+{{Number(cp).toString(16).padStart(4,0)}}: '{{String.fromCodePoint(cp)}}'</div>
                        <div style="display: table-row">
                            <div style="padding: 2px 2px; width: fit-content;" :style="{backgroundColor: (isCurrentCodepoint(cp)? '#ff30ff' : '#0dcaf0')}">
                                <SymbolImage :code-point="cp" :scale="1"></SymbolImage>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};