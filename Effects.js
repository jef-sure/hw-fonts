// collects points of everything drawn in the order of writing
class PenPath {
    constructor() {
        this.points = []; // x0, y0, x1, y1, ...
        this.shiftX = 0;
        this.shiftY = 0;
    }
    drawPointCanvas(x, y) {
        this.points.push(x + this.shiftX, y + this.shiftY);
    }
    drawLine(x1, y1, x2, y2) {
        Draw.line(this, x1, y1, x2, y2);
    }
}

const Effects = {
    data() {
        return {
            isWriting: false,
        };
    },
    mounted() {
        this.textCtx = this.$refs.text.getContext("2d");
        this.written = 0;
        this.draw();
    },
    unmounted() {
        this.stopWriting();
    },
    computed: {
        ...Pinia.mapStores(useFontStore),
        effects() {
            return this.fontStore.effects;
        },
        font() {
            return this.fontStore.font;
        },
        scale() {
            return this.effects.scale > 0 ? this.effects.scale : 1;
        },
        thickness() {
            return this.effects.thickness > 0 ? this.effects.thickness : 1;
        },
        // symbols of a fixed width font take the whole active area, otherwise each one takes its own width
        isProportional() {
            return this.effects.proportional;
        },
        // the text written by pen: points in font units in the order of writing
        writing() {
            const font = this.font;
            const segmentsOf = (glyph, skey) => {
                const sa = font.codePoints[glyph.codePoint][skey];
                return Array.isArray(sa) ? sa : [];
            };
            const hasSegments = (glyph, skey) => glyph && glyph.inFont && segmentsOf(glyph, skey).length ? true : false;
            // two symbols are joined only when the first has an end connection and the second has a begin connection:
            // digits have none and are written apart, capital letters have only the end one to continue a word
            const isJoined = (glyph, next) => this.effects.joined && hasSegments(glyph, 'endConnection') && hasSegments(next, 'beginConnection');
            let pen = new PenPath();
            let missing = [];
            let width = 0;
            let y = 0;
            for (const line of this.effects.text.split('\n')) {
                const glyphs = Array.from(line).map(c => {
                    const cp = c.codePointAt(0);
                    return {
                        char: c,
                        codePoint: cp,
                        inFont: cp in font.codePoints
                    };
                });
                let x = 0;
                // where the part of the line above lowercase letters is taken up to with the space after it,
                // null while nothing is written there
                let upX = null;
                // the last segment of the previous symbol's end connection as a cubic curve in the line:
                // it is joined with the first segment of the next symbol's begin connection
                let joint = null;
                // postponed segments are written when the pen is taken off the paper: after the last joined letter
                let postponed = [];
                const writePostponed = () => {
                    for (const p of postponed) {
                        pen.shiftX = p.shiftX;
                        pen.shiftY = p.shiftY;
                        Draw.arrayOfSegments(pen, p.segments, 1);
                    }
                    postponed = [];
                };
                glyphs.forEach((glyph, i) => {
                    if (!glyph.inFont) {
                        writePostponed();
                        if (glyph.char.trim() && !missing.includes(glyph.char)) missing.push(glyph.char);
                        // a space has its own width, a symbol which is not in the font takes the whole active area
                        x += this.isProportional && !glyph.char.trim() ? font.spaceWidth : font.symbolSizeX;
                        upX = null;
                        joint = null;
                        return;
                    }
                    const joinedPrev = isJoined(glyphs[i - 1], glyph);
                    const joinedNext = isJoined(glyph, glyphs[i + 1]);
                    // connections are written only to join two symbols: one which joins nothing is not written at all,
                    // so a symbol always takes the same place in the line. The only exception is a letter after a letter
                    // of joined writing which has no end connection: the pen cannot come out of that one, so the next
                    // letter is begun with its whole begin connection, within the space between them
                    const prev = glyphs[i - 1];
                    const afterDeadEnd = this.effects.joined && hasSegments(prev, 'beginConnection') && !hasSegments(prev, 'endConnection');
                    const beginTail = afterDeadEnd ? segmentsOf(glyph, 'beginConnection') : [];
                    const box = SymbolMeasure.ofSymbol(font, glyph.codePoint, ['mainSegments', 'postSegments']);
                    const spaces = SymbolMeasure.spaces(font, font.codePoints[glyph.codePoint]);
                    if (!joinedPrev) writePostponed();
                    pen.shiftX = x - font.symbolOffsetX;
                    pen.shiftY = y - font.symbolOffsetY;
                    if (this.isProportional && box) {
                        // a symbol begins where the advance of the previous one ends, after its own space before it,
                        // the first one in the line is written whole and without that space,
                        // two tall symbols are also kept apart by their parts above the line of lowercase letters
                        pen.shiftX = x - font.symbolOffsetX - (x > 0 ? box.lineLeft - spaces.before : box.left);
                        if (upX !== null && box.upLeft !== null) pen.shiftX = Math.max(pen.shiftX, upX - font.symbolOffsetX - box.upLeft + spaces.before);
                    }
                    const inLine = (point) => ({
                        x: point.x + pen.shiftX,
                        y: point.y + pen.shiftY
                    });
                    if (joinedPrev && joint) {
                        // two symbols are joined by one curve made of the last segment of the first one
                        // and the first segment of the second one, whatever these segments are
                        const bc = segmentsOf(glyph, 'beginConnection');
                        const first = Curves.cubicPoints(bc[0]).map(inLine);
                        const shiftX = pen.shiftX;
                        const shiftY = pen.shiftY;
                        pen.shiftX = 0;
                        pen.shiftY = 0;
                        Curves.drawBezier4p(pen, Curves.joint(joint, first), 1);
                        pen.shiftX = shiftX;
                        pen.shiftY = shiftY;
                        Draw.arrayOfSegments(pen, bc.slice(1), 1);
                    }
                    Draw.arrayOfSegments(pen, beginTail, 1);
                    Draw.arrayOfSegments(pen, segmentsOf(glyph, 'mainSegments'), 1);
                    joint = null;
                    if (joinedNext) {
                        const ec = segmentsOf(glyph, 'endConnection');
                        Draw.arrayOfSegments(pen, ec.slice(0, -1), 1);
                        joint = Curves.cubicPoints(ec[ec.length - 1]).map(inLine);
                    }
                    postponed.push({
                        segments: segmentsOf(glyph, 'postSegments'),
                        shiftX: pen.shiftX,
                        shiftY: pen.shiftY
                    });
                    if (this.isProportional && box) {
                        // the advance is the writing width with the space after the symbol, this space is also the room
                        // for the curve joining two symbols
                        x = box.lineLeft + font.symbolOffsetX + pen.shiftX + box.lineWidth + spaces.after;
                        if (box.upRight !== null) upX = Math.max(upX === null ? 0 : upX, box.upRight + font.symbolOffsetX + pen.shiftX + 1 + spaces.after);
                        const right = box.right + font.symbolOffsetX + pen.shiftX + 1;
                        if (right > width) width = right;
                    } else {
                        x += font.symbolSizeX;
                    }
                });
                writePostponed();
                if (x > width) width = x;
                y += font.symbolSizeY;
            }
            return {
                points: pen.points,
                missing: missing,
                width: width,
                height: y
            };
        },
        look() {
            return [this.scale, this.thickness, this.effects.color].join();
        },
    },
    watch: {
        writing() {
            this.draw();
        },
        look() {
            this.draw();
        },
    },
    methods: {
        // draws the whole text at once
        draw() {
            this.stopWriting();
            this.clear();
            this.drawPoints(0, this.writing.points.length / 2);
        },
        clear() {
            let c = this.$refs.text;
            this.padding = Math.ceil(this.thickness * this.scale);
            c.width = Math.ceil(this.writing.width * this.scale) + this.padding * 2;
            c.height = Math.ceil(this.writing.height * this.scale) + this.padding * 2;
            c.style.width = c.width + 'px';
            c.style.height = c.height + 'px';
            this.textCtx.fillStyle = 'white';
            this.textCtx.fillRect(0, 0, c.width, c.height);
            this.written = 0;
        },
        drawPoints(from, to) {
            const points = this.writing.points;
            const radius = this.thickness * this.scale / 2;
            this.textCtx.fillStyle = this.effects.color;
            this.textCtx.beginPath();
            for (let i = from; i < to; ++i) {
                const px = (points[i * 2] + 0.5) * this.scale + this.padding;
                const py = (points[i * 2 + 1] + 0.5) * this.scale + this.padding;
                this.textCtx.moveTo(px + radius, py);
                this.textCtx.arc(px, py, radius, 0, 2 * Math.PI);
            }
            this.textCtx.fill();
            this.written = to;
        },
        // draws the text point by point as it is written by hand
        startWriting() {
            this.stopWriting();
            this.clear();
            this.isWriting = true;
            this.writeMore();
        },
        writeMore() {
            const total = this.writing.points.length / 2;
            const speed = this.effects.speed > 0 ? this.effects.speed : 1;
            this.drawPoints(this.written, Math.min(this.written + speed, total));
            if (this.written < total) {
                this.frameRequest = window.requestAnimationFrame(this.writeMore);
            } else {
                this.isWriting = false;
            }
        },
        stopWriting() {
            if (this.frameRequest) window.cancelAnimationFrame(this.frameRequest);
            this.frameRequest = undefined;
            this.isWriting = false;
        },
        showAllSymbols() {
            this.effects.text = this.fontStore.fontCodePoints.map(cp => String.fromCodePoint(cp)).join('');
        },
    },
    template: `
        <div class="symbol-view">
            <div class="view-toolbar">
                <label>Text
                    <textarea v-model="effects.text" rows="3" cols="60" placeholder="Type text to see it written with the font"></textarea>
                </label>
                <button @click="showAllSymbols" class="btn btn-sm btn-secondary">All symbols</button>
                <button v-if="effects.text" @click="effects.text = ''" class="btn btn-sm btn-secondary">Clear</button>
            </div>
            <div class="view-toolbar">
                <label>Scale
                    <input type="range" min="0.1" max="3" step="0.05" v-model.number="effects.scale"> {{scale}}x
                </label>
                <label>Line thickness
                    <input type="range" min="1" max="12" step="0.5" v-model.number="effects.thickness"> {{thickness}}
                </label>
                <label>Colour
                    <input type="color" v-model="effects.color">
                </label>
                <label title="Join a symbol having an end connection with the next one having a begin connection, without taking the pen off">
                    <input type="checkbox" v-model="effects.joined" /> Joined letters
                </label>
                <label v-if="isProportional" title="Space after a symbol which has no own one, kept in the font. It is also the room for the curve joining two symbols">Space between symbols
                    <input class="coord" v-model.number="font.symbolSpace">
                </label>
                <label v-if="isProportional" title="Advance of the space character, kept in the font">Space width
                    <input class="coord" v-model.number="font.spaceWidth">
                </label>
                <label title="Each symbol takes its own width instead of the whole active area">
                    <input type="checkbox" v-model="effects.proportional" /> Proportional width
                </label>
            </div>
            <div class="view-toolbar">
                <button v-if="!isWriting" @click="startWriting" class="btn btn-sm btn-primary" :disabled="!writing.points.length">Write</button>
                <button v-else @click="draw" class="btn btn-sm btn-secondary">Stop</button>
                <label>Speed
                    <input type="range" min="1" max="200" step="1" v-model.number="effects.speed">
                </label>
                <span v-if="writing.missing.length" class="effects-missing">Not in the font: {{writing.missing.join(' ')}}</span>
            </div>
            <div class="effects-text" v-show="effects.text">
                <canvas ref="text"></canvas>
            </div>
        </div>
    `
};
