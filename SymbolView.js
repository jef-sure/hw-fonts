const SymbolView = {
    data() {
        return {
            SegmentTypes: SegmentTypes,
            ElementTypes: ElementTypes,
        };
    },
    mounted() {
        window.addEventListener('keydown', this.onkeydown);
    },
    unmounted() {
        window.removeEventListener('keydown', this.onkeydown);
    },
    computed: {
        ...Pinia.mapStores(useFontStore),
        view() {
            return this.fontStore.symbolView;
        },
        font() {
            return this.fontStore.font;
        },
        scale() {
            return this.view.scale > 0 ? this.view.scale : 1;
        },
        // segments which belong to a symbol: auxilary ones are common for the whole font
        symbolSegmentTypes() {
            let types = {};
            for (const segment in SegmentTypes) {
                if (segment !== 'auxilarySegments') types[segment] = SegmentTypes[segment];
            }
            return types;
        },
        // bounding boxes of drawn symbols, calculated here because stored ones appear only after editing
        measures() {
            let measures = {};
            for (const cp of this.fontStore.fontCodePoints) {
                const m = SymbolMeasure.ofSymbol(this.font, cp, ['mainSegments', 'postSegments']);
                if (m) measures[cp] = m;
            }
            return measures;
        },
        emptyCount() {
            return this.fontStore.fontCodePoints.filter(cp => !(cp in this.measures)).length;
        },
        visibleCodePoints() {
            const filter = this.view.filter.trim();
            if (!filter) return this.fontStore.fontCodePoints;
            let wanted = new Set(Array.from(filter).map(c => c.codePointAt(0)));
            const hex = filter.match(/^(?:u\+|0x)?([0-9a-f]{2,6})$/i);
            if (hex) wanted.add(parseInt(hex[1], 16));
            return this.fontStore.fontCodePoints.filter(cp => wanted.has(cp));
        },
        groups() {
            let groups = [];
            for (const cp of this.visibleCodePoints) {
                const name = this.blockName(cp);
                if (!groups.length || groups[groups.length - 1].name !== name) {
                    groups.push({
                        name: name,
                        codePoints: []
                    });
                }
                groups[groups.length - 1].codePoints.push(cp);
            }
            return groups;
        },
        current() {
            const cps = this.fontStore.fontCodePoints;
            for (const cp of [this.view.codePoint, this.fontStore.symbolEdit.codePoint]) {
                if (cp !== null && cps.includes(parseInt(cp))) return parseInt(cp);
            }
            return cps.length ? cps[0] : null;
        },
        currentElements() {
            const cs = this.font.codePoints[this.current];
            let elements = [];
            for (const segment in this.symbolSegmentTypes) {
                const sa = Array.isArray(cs[segment]) ? cs[segment] : [];
                let counts = {};
                for (const c of sa) counts[c.type] = (counts[c.type] || 0) + 1;
                elements.push({
                    name: SegmentTypes[segment],
                    count: sa.length,
                    details: Object.keys(counts).map(type => counts[type] + ' × ' + ElementTypes[type].name).join(', ')
                });
            }
            return elements;
        },
    },
    methods: {
        blockName(cp) {
            for (const range of UnicodeRanges) {
                if (cp >= parseInt(range['data-begin'], 16) && cp <= parseInt(range['data-end'], 16)) return range.name;
            }
            return 'Unknown block';
        },
        label(cp) {
            return 'U+' + Number(cp).toString(16).padStart(4, 0);
        },
        select(cp) {
            this.fontStore.setViewCodepoint(cp);
        },
        edit(cp) {
            this.fontStore.setCurrentCodepoint(cp);
            window.location.hash = '#/';
        },
        step(delta) {
            const cps = this.visibleCodePoints;
            if (!cps.length) return;
            let i = cps.indexOf(this.current);
            i = i < 0 ? 0 : Math.min(Math.max(i + delta, 0), cps.length - 1);
            this.select(cps[i]);
        },
        onkeydown(event) {
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
            if (event.key === 'ArrowLeft') this.step(-1);
            else if (event.key === 'ArrowRight') this.step(1);
            else if (event.key === 'Home') this.step(-Infinity);
            else if (event.key === 'End') this.step(Infinity);
            else if (event.key === 'Enter' && this.current !== null) this.edit(this.current);
            else return;
            event.preventDefault();
        },
    },
    template: `
        <div class="symbol-view">
            <div class="view-toolbar">
                <label>Find
                    <input v-model="view.filter" size="12" placeholder="abc or U+0041">
                </label>
                <label>Scale
                    <input type="range" min="0.25" max="3" step="0.25" v-model.number="view.scale"> {{scale}}x
                </label>
                <label v-for="(segmentName, segment) in SegmentTypes">
                    <input type="checkbox" :checked="view.shownSegments[segment]" @change="fontStore.setViewShownSegment(segment, $event.target.checked)" />
                    {{segmentName}}
                </label>
                <label title="Order and direction of elements: a dot is the beginning, an arrow is the end, a red dot - the pen is taken off before, orange - postponed">
                    <input type="checkbox" v-model="view.penPath" /> Pen path
                </label>
                <span class="text-muted">
                    Font '{{font.name}}': {{fontStore.fontCodePoints.length}} symbols<template v-if="emptyCount">, <span class="view-empty">{{emptyCount}} empty</span></template><template v-if="view.filter.trim()">, {{visibleCodePoints.length}} found</template>
                </span>
            </div>
            <div class="view-body">
                <div class="view-main">
                    <div v-for="group in groups" :key="group.name">
                        <h6 class="view-group">{{group.name}} <span class="text-muted">({{group.codePoints.length}})</span></h6>
                        <div style="display: flex; flex-wrap: wrap;">
                            <div class="view-cell" :class="{'view-current': cp === current}" v-for="cp in group.codePoints" :key="cp" @click="select(cp)" @dblclick="edit(cp)">
                                <div :class="{'view-empty': !(cp in measures)}">{{label(cp)}}: '{{String.fromCodePoint(cp)}}'</div>
                                <SymbolImage :code-point="cp" :scale="scale" :segments="view.shownSegments" :pen-path="view.penPath"></SymbolImage>
                            </div>
                        </div>
                    </div>
                    <div v-if="!visibleCodePoints.length" class="text-muted">No symbols found</div>
                </div>
                <div class="view-details box-shadow" v-if="current !== null">
                    <div class="view-toolbar">
                        <button @click="step(-1)" class="btn btn-sm btn-secondary" title="Previous symbol (←)">←</button>
                        <b>{{label(current)}}: '{{String.fromCodePoint(current)}}'</b>
                        <button @click="step(1)" class="btn btn-sm btn-secondary" title="Next symbol (→)">→</button>
                        <button @click="edit(current)" class="btn btn-sm btn-primary" title="Open in font editor (Enter)">Edit</button>
                    </div>
                    <div class="view-cell view-current" style="cursor: default;">
                        <SymbolImage :code-point="current" :scale="2" :segments="view.shownSegments" :pen-path="view.penPath"></SymbolImage>
                    </div>
                    <table class="table table-sm">
                        <tbody>
                            <tr><td>Block</td><td>{{blockName(current)}}</td></tr>
                            <tr><td>Code</td><td>{{current}}</td></tr>
                            <template v-if="measures[current]">
                                <tr><td>Size</td><td>{{measures[current].width}} × {{measures[current].height}}</td></tr>
                                <tr><td>Left, right</td><td>{{measures[current].left}}, {{measures[current].right}}</td></tr>
                                <tr><td>Top, bottom from base line</td><td>{{measures[current].top}}, {{measures[current].bottom}}</td></tr>
                                <tr><td title="Of the part within the line of lowercase letters, symbols are placed by it">Left, right in the line</td><td>{{measures[current].lineLeft}}, {{measures[current].lineRight}}</td></tr>
                                <tr><td title="The place of the symbol in the line: its width in the line with the spaces before and after it">Advance</td><td>{{measures[current].advance}}</td></tr>
                                <tr v-if="measures[current].upLeft !== null"><td title="Of the part above the line of lowercase letters, it keeps two tall symbols apart">Left, right above the line</td><td>{{measures[current].upLeft}}, {{measures[current].upRight}}</td></tr>
                            </template>
                            <tr v-else><td colspan="2" class="view-empty">Nothing is drawn yet</td></tr>
                            <tr v-for="e in currentElements">
                                <td>{{e.name}}</td>
                                <td>{{e.count}}<span v-if="e.details" class="text-muted"> ({{e.details}})</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
};
