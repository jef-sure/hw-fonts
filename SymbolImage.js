const SymbolImage = {
    props: {
        codePoint: Number,
        scale: {
            type: Number,
            default: 1
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
        symbolOffsetX() {
            return this.$store.state.font.symbolOffsetX;
        },
        symbolOffsetY() {
            return this.$store.state.font.symbolOffsetY;
        },
        symbolSizeX() {
            if (this.$store.state.font.widthType === 'fixed') {
                return Math.round(this.$store.state.font.symbolSizeX * this.scale);
            } else {
                return Math.round(this.$store.state.font.codePoints[this.codePoint].width * this.scale);
            }
        },
        symbolSizeY() {
            return Math.round(this.$store.state.font.symbolSizeY * this.scale);
        },
        symbolCurves() {
            const cs = this.$store.state.font.codePoints[this.codePoint];
            return cs ? cs : this.noCurves;
        },
        font() {
            return this.$store.state.font;
        },
        dataVersion() {
            return this.$store.state.symbolEdit.dataVersion;
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
        dataVersion() {
            this.draw();
        }
    },
    methods: {
        draw() {
            this.drawSymbolBackground();
            SymbolCurves.drawShownSegments(this, false);
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
            SymbolCurves.drawLine(this, x1, y1, x2, y2, color);
        },
    },
    template: `
        <canvas ref="symbol"></canvas>
    `
};