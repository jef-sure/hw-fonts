const SymbolImage = {
    props: {
        codePoint: Number,
        scale: {
            type: Number,
            default: 1
        },
        // which segments to draw; editor's choice without auxilary lines is used when not given
        segments: {
            type: Object,
            default: null
        },
        // show how the symbol is written: order and direction of its elements
        penPath: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            noCurves: [],
        };
    },
    mounted() {
        let c = this.$refs.symbol;
        let ctx = c.getContext("2d");
        this.symbolCtx = ctx;
        this.deviceScaling = window.devicePixelRatio || 1;
        this.supLineWidth = 1;
        this.setCanvasSize();
        this.draw();
    },
    computed: {
        ...Pinia.mapStores(useFontStore),
        symbolOffsetX() {
            return this.fontStore.font.symbolOffsetX;
        },
        symbolOffsetY() {
            return this.fontStore.font.symbolOffsetY;
        },
        symbolSizeX() {
            return Math.round(this.fontStore.font.symbolSizeX * this.scale);
        },
        symbolSizeY() {
            return Math.round(this.fontStore.font.symbolSizeY * this.scale);
        },
        symbolCurves() {
            const cs = this.fontStore.font.codePoints[this.codePoint];
            return cs ? cs : this.noCurves;
        },
        font() {
            return this.fontStore.font;
        },
        dataVersion() {
            return this.fontStore.symbolEdit.dataVersion;
        },
        shownSegments() {
            return this.segments || Object.assign({}, this.fontStore.symbolEdit.shownSegments, {
                auxilarySegments: false
            });
        },
    },
    watch: {
        symbolOffsetX() {
            this.draw();
        },
        symbolOffsetY() {
            this.draw();
        },
        symbolSizeX() {
            this.setCanvasSize();
            this.draw();
        },
        symbolSizeY() {
            this.setCanvasSize();
            this.draw();
        },
        symbolCurves() {
            this.draw();
        },
        shownSegments: {
            handler() {
                this.draw();
            },
            deep: true
        },
        penPath() {
            this.draw();
        },
        dataVersion() {
            this.draw();
        }
    },
    methods: {
        draw() {
            this.drawSymbolBackground();
            Draw.shownSegments(this, false);
            if (this.penPath) this.drawPenPath();
        },
        // numbers the elements in the order of writing: a dot is where an element begins, an arrow is where it ends,
        // a red dot means the pen is taken off the paper before the element
        drawPenPath() {
            if (this.symbolCurves === this.noCurves) return;
            const ctx = this.symbolCtx;
            const lo = this.scale / 2;
            const toCanvas = (p) => {
                let [px, py] = this.canvas2Point(p.x, p.y);
                return [px + lo, py + lo];
            };
            let number = 0;
            let last;
            ctx.save();
            ctx.font = '11px sans-serif';
            ctx.lineWidth = 1;
            for (const skey of ['beginConnection', 'mainSegments', 'endConnection', 'postSegments']) {
                if (!this.shownSegments[skey] || !Array.isArray(this.symbolCurves[skey])) continue;
                for (const c of this.symbolCurves[skey]) {
                    if (c.points.length !== ElementTypes[c.type].len) continue;
                    ++number;
                    const first = c.points[0];
                    const end = c.points[c.points.length - 1];
                    const isLifted = !last || Math.abs(last.x - first.x) + Math.abs(last.y - first.y) > 2;
                    const color = skey === 'postSegments' ? 'darkorange' : (isLifted ? 'red' : 'blue');
                    let [sx, sy] = toCanvas(first);
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 3, 0, 2 * Math.PI);
                    ctx.fill();
                    if (c.type !== 'dot') {
                        // the arrow shows where the pen comes to
                        let before = c.points[c.points.length - 2];
                        if (c.type === 'curve') before = Curves.cubicBezierPoint(0.85, c.points);
                        if (c.type === 'curve3p') before = Curves.quadraticBezierPoint(0.85, c.points);
                        let [ex, ey] = toCanvas(end);
                        let [bx, by] = toCanvas(before);
                        const angle = Math.atan2(ey - by, ex - bx);
                        ctx.beginPath();
                        ctx.moveTo(ex, ey);
                        ctx.lineTo(ex - 8 * Math.cos(angle - 0.4), ey - 8 * Math.sin(angle - 0.4));
                        ctx.moveTo(ex, ey);
                        ctx.lineTo(ex - 8 * Math.cos(angle + 0.4), ey - 8 * Math.sin(angle + 0.4));
                        ctx.stroke();
                    }
                    let middle = first;
                    if (c.type === 'curve') middle = Curves.cubicBezierPoint(0.5, c.points);
                    if (c.type === 'curve3p') middle = Curves.quadraticBezierPoint(0.5, c.points);
                    if (c.type === 'line') middle = Curves.linearMove(0.5, first, end);
                    let [mx, my] = toCanvas(middle);
                    ctx.fillText(number, mx + 4, my - 3);
                    last = end;
                }
            }
            ctx.restore();
        },
        drawSymbolBackground() {
            let svfs = this.symbolCtx.fillStyle;
            this.symbolCtx.fillStyle = 'white';
            this.symbolCtx.fillRect(0, 0, this.symbolSizeX, this.symbolSizeY);
            this.symbolCtx.fillStyle = svfs;
        },
        setCanvasSize() {
            let c = this.$refs.symbol;
            c.height = this.symbolSizeY;
            c.width = this.symbolSizeX;
            c.style.width = c.width + 'px';
            c.style.height = c.height + 'px';
        },
        point2Canvas(x, y) {
            return [Math.floor(x / this.scale - this.symbolOffsetX), Math.floor(y / this.scale - this.symbolOffsetY)];
        },
        canvas2Point(x, y) {
            return [(x - this.symbolOffsetX) * this.scale, (y - this.symbolOffsetY) * this.scale];
        },
        drawPointCanvas(x, y, color) {
            let svfs = this.symbolCtx.fillStyle;
            this.symbolCtx.fillStyle = Number.isInteger(color) ? (color ? 'black' : 'white') : color;
            let [px, py] = this.canvas2Point(x, y);
            let lo = this.scale / 2;
            this.symbolCtx.beginPath();
            this.symbolCtx.arc(px + lo, py + lo, lo, 0, 2 * Math.PI);
            this.symbolCtx.fill();
            this.symbolCtx.fillStyle = svfs;
        },
        drawLine(x1, y1, x2, y2, color) {
            Draw.line(this, x1, y1, x2, y2, color);
        },
    },
    template: `
        <canvas ref="symbol"></canvas>
    `
};