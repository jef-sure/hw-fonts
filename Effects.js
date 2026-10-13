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
        // the text is drawn by the pen of the dgx library, as on a display, otherwise by points of the grid
        isPen() {
            return this.effects.pen === 'hard' || this.effects.pen === 'soft';
        },
        penWidth() {
            return this.effects.penWidth >= 1 ? Math.round(this.effects.penWidth) : 1;
        },
        zoom() {
            return this.isPen && this.effects.zoom >= 1 ? Math.round(this.effects.zoom) : 1;
        },
        // room around the text for the thickness of the line
        padding() {
            return this.isPen ? this.penWidth + 1 : Math.ceil(this.thickness * this.scale);
        },
        // symbols of a fixed width font take the whole active area, otherwise each one takes its own width
        isProportional() {
            return this.effects.proportional;
        },
        tempo() {
            return this.effects.tempo > 0 ? this.effects.tempo : 1;
        },
        bend() {
            return this.effects.bend >= 0 ? this.effects.bend : 0;
        },
        // the text written by pen in the order of writing, in font units: points of the grid and strokes, the curves
        // a library drawing by its own pen gets. A stroke takes the points from `from` to `to`
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
            let strokes = [];
            const write = (segments) => {
                for (const c of segments) {
                    if (c.points.length !== ElementPoints[c.type]) continue;
                    const from = pen.points.length / 2;
                    Draw.arrayOfSegments(pen, [c], 1);
                    strokes.push({
                        type: c.type,
                        points: c.points.map(p => ({
                            x: p.x + pen.shiftX,
                            y: p.y + pen.shiftY
                        })),
                        pieces: Curves.elementPieces(c),
                        length: Curves.elementLength(c),
                        from: from,
                        to: pen.points.length / 2
                    });
                }
            };
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
                        write(p.segments);
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
                        const curve = Curves.joint(joint, first);
                        const pieces = Curves.cubicPieces(curve);
                        const from = pen.points.length / 2;
                        Curves.drawBezier4p(pen, curve, 1);
                        strokes.push({
                            type: 'curve',
                            points: curve,
                            pieces: pieces,
                            length: Curves.cubicLength(curve, pieces),
                            from: from,
                            to: pen.points.length / 2
                        });
                        pen.shiftX = shiftX;
                        pen.shiftY = shiftY;
                        write(bc.slice(1));
                    }
                    write(beginTail);
                    write(segmentsOf(glyph, 'mainSegments'));
                    joint = null;
                    if (joinedNext) {
                        const ec = segmentsOf(glyph, 'endConnection');
                        write(ec.slice(0, -1));
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
                strokes: strokes,
                missing: missing,
                width: width,
                height: y
            };
        },
        // How the pen goes through the text, as the dgx library paces it. To write a stroke takes effort: its length
        // and so much for every straight piece of it, the pieces being a measure of how bent it is. A dot and a lift
        // of the pen to the start of a stroke take the least effort, that of the hyphen of the font, and no stroke
        // takes less. A stroke is written from the effort `start` on
        pace() {
            const effortOf = (length, pieces) => length + this.bend * pieces;
            let least = 0;
            const hyphen = this.font.codePoints['-'.codePointAt(0)];
            for (const skey of ['mainSegments', 'postSegments']) {
                for (const c of hyphen && Array.isArray(hyphen[skey]) ? hyphen[skey] : []) least += effortOf(Curves.elementLength(c), Curves.elementPieces(c));
            }
            if (!(least > 0)) least = this.font.xHeight * 2 / 3;
            let passed = 0;
            let pen = null;
            const strokes = this.writing.strokes.map(s => {
                const first = s.points[0];
                const isLifted = pen !== null && (first.x !== pen.x || first.y !== pen.y);
                const start = passed + (isLifted ? least : 0);
                const effort = Math.max(effortOf(s.length, s.pieces), least);
                passed = start + effort;
                pen = s.points[s.points.length - 1];
                return {
                    start: start,
                    effort: effort
                };
            });
            return {
                strokes: strokes,
                total: passed
            };
        },
        // what the pen of dgx draws every stroke with: points of a stroke are brought to whole pixels, a curve is divided
        // into its number of pieces times the square root of the scale, a line and a dot are one piece at any size
        figures() {
            if (!this.isPen) return [];
            // dgx counts in numbers of 32 bits: a point half way between two pixels goes where it goes there
            const single = Math.fround;
            const pixel = (v) => Pen.round(single(this.padding + single(single(v) * single(this.scale))));
            const root = single(Math.sqrt(single(this.scale)));
            return this.writing.strokes.map(s => {
                const points = s.points.map(p => ({
                    x: pixel(p.x),
                    y: pixel(p.y)
                }));
                const pieces = s.type === 'line' || s.type === 'dot' ? 1 : Math.max(Math.ceil(single(s.pieces * root)), 1);
                const figures = Pen.figures(s.type, points, pieces, this.penWidth, this.effects.pen === 'soft');
                return {
                    figures: figures,
                    length: figures.reduce((sum, f) => sum + f.length, 0)
                };
            });
        },
        look() {
            return [this.scale, this.thickness, this.effects.color, this.effects.pen, this.penWidth, this.zoom].join();
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
            if (this.pen) {
                this.writeTo(Infinity);
            } else {
                this.drawPoints(0, this.writing.points.length / 2);
                this.written = this.writing.strokes.length;
            }
        },
        clear() {
            let c = this.$refs.text;
            c.width = Math.ceil(this.writing.width * this.scale) + this.padding * 2;
            c.height = Math.ceil(this.writing.height * this.scale) + this.padding * 2;
            c.style.width = c.width * this.zoom + 'px';
            c.style.height = c.height * this.zoom + 'px';
            this.textCtx.fillStyle = 'white';
            this.textCtx.fillRect(0, 0, c.width, c.height);
            this.written = 0;
            this.passed = 0;
            this.pen = this.isPen ? new Pen(c.width, c.height, this.penWidth, this.effects.pen === 'soft') : null;
        },
        // The pen goes on to the effort it has spent from the start of the text: `written` strokes are drawn whole,
        // the next one as far as the pen has come, `passed` of its way. Only what is new is drawn
        writeTo(effort) {
            const pace = this.pace.strokes;
            while (this.written < pace.length) {
                const p = pace[this.written];
                const isWhole = effort >= p.start + p.effort;
                if (!isWhole && !(effort > p.start)) break;
                this.drawStroke(this.written, isWhole ? 1 : (effort - p.start) / p.effort);
                if (!isWhole) break;
                ++this.written;
                this.passed = 0;
            }
            if (this.pen) this.showInk();
        },
        // a stroke up to the share t of its way: the pen which is led by an even t goes at an even speed
        drawStroke(index, t) {
            const stroke = this.writing.strokes[index];
            if (!this.pen) {
                const to = t >= 1 ? stroke.to : stroke.from + Math.floor(t * (stroke.to - stroke.from));
                this.drawPoints(stroke.from + this.passed, to);
                this.passed = to - stroke.from;
                return;
            }
            const curve = this.figures[index];
            const way = t >= 1 ? Infinity : t * curve.length;
            // a dot is put when its effort is spent
            if (t < 1 && !(way > this.passed)) return;
            let before = 0;
            for (const figure of curve.figures) {
                const end = before + figure.length;
                if (before > way) break;
                if (end >= this.passed) this.pen.draw(figure, Math.max(this.passed - before, 0), Math.min(way - before, figure.length));
                before = end;
            }
            this.passed = Math.min(way, curve.length);
        },
        // the ink the pen has left since it was shown last: an amount of ink is a colour between the paper and the ink
        showInk() {
            const t = this.pen.touched;
            if (!t) return;
            this.pen.touched = null;
            const width = t.right - t.left + 1, height = t.bottom - t.top + 1;
            const colour = parseInt(this.effects.color.slice(1), 16);
            const rgb = [colour >> 16 & 255, colour >> 8 & 255, colour & 255];
            let image = this.textCtx.createImageData(width, height);
            for (let y = 0; y < height; ++y) {
                for (let x = 0; x < width; ++x) {
                    const ink = this.pen.ink[(t.top + y) * this.pen.width + t.left + x];
                    const i = (y * width + x) * 4;
                    for (let n = 0; n < 3; ++n) image.data[i + n] = 255 + Math.round((rgb[n] - 255) * ink / 255);
                    image.data[i + 3] = 255;
                }
            }
            this.textCtx.putImageData(image, t.left, t.top);
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
        },
        // draws the text stroke by stroke as it is written by hand, at the tempo of the pen
        startWriting() {
            this.stopWriting();
            this.clear();
            this.isWriting = true;
            this.startTime = null;
            this.frameRequest = window.requestAnimationFrame(this.writeMore);
        },
        writeMore(time) {
            if (this.startTime === null) this.startTime = time;
            this.writeTo(this.tempo * (time - this.startTime) / 1000);
            if (this.written < this.writing.strokes.length) {
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
                <label title="By points of the grid the editor draws itself; by a pen the text is drawn as the dgx library draws it on a display. A soft pen leaves in a pixel the share of it the line covers">Drawn by
                    <select v-model="effects.pen">
                        <option value="points">points of the grid</option>
                        <option value="hard">hard pen of dgx</option>
                        <option value="soft">soft pen of dgx</option>
                    </select>
                </label>
                <label v-if="!isPen">Line thickness
                    <input type="range" min="1" max="12" step="0.5" v-model.number="effects.thickness"> {{thickness}}
                </label>
                <label v-if="isPen" title="Thickness of the pen in pixels of a display, whatever the scale is">Pen width
                    <input type="range" min="1" max="12" step="1" v-model.number="effects.penWidth"> {{penWidth}} px
                </label>
                <label v-if="isPen" title="A pixel of a display is shown this many times larger">Zoom
                    <input type="range" min="1" max="8" step="1" v-model.number="effects.zoom"> {{zoom}}x
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
                <label title="Effort the pen spends a second, as the dgx library paces the writing. To write a stroke takes its length in points of the grid and the bend effort for every straight piece of it; a dot and a lift of the pen take as much as a hyphen">Tempo
                    <input type="range" min="100" max="6000" step="100" v-model.number="effects.tempo"> {{tempo}}
                </label>
                <label title="Effort of one straight piece of a curve: the more a stroke is bent, the slower it is written. With 0 the pen goes at an even speed">Bend effort
                    <input type="range" min="0" max="12" step="1" v-model.number="effects.bend"> {{bend}}
                </label>
                <span v-if="writing.strokes.length" title="Effort of the whole text and the time to write it at this tempo">{{Math.round(pace.total)}} of effort, {{(pace.total / tempo).toFixed(1)}} s</span>
                <span v-if="writing.missing.length" class="effects-missing">Not in the font: {{writing.missing.join(' ')}}</span>
            </div>
            <div class="effects-text" v-show="effects.text">
                <canvas ref="text" :class="{'effects-pixels': isPen}"></canvas>
            </div>
        </div>
    `
};
