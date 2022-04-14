const SymbolCanvas = {
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
        let theight = window.innerHeight / 2;
        this.symbolCellSize = Math.max(Math.ceil((theight - 255 * this.supLineWidth) / 256), 3);
        this.symbolSize = this.symbolCellSize * 256 + 255 * this.supLineWidth;
        c.height = this.symbolSize;
        c.width = this.symbolSize;
        c.style.width = c.width + 'px';
        c.style.height = c.height + 'px';
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
            return this.$store.state.font.symbolSizeX;
        },
        symbolSizeY() {
            return this.$store.state.font.symbolSizeY;
        },
        symbolCurves() {
            const cp = this.$store.state.symbolEdit.codePoint;
            if (!cp) return this.noCurves;
            const cs = this.$store.state.font.codePoints[cp];
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
            this.draw();
        },
        symbolSizeY() {
            this.draw();
        },
        dataVersion() {
            this.draw();
        }
    },
    methods: {
        draw() {
            this.drawSymbolBackground();
            Draw.shownSegments(this, true);
            if (this.symbolCurves !== this.noCurves) {
                const segments = ['mainSegments', 'postSegments'];
                let sm = new SymbolMeasure();
                for (const skey of segments) {
                    Draw.arrayOfSegments(sm, this.symbolCurves[skey], 1);
                }
                if (sm.left !== undefined) {
                    let width = sm.right - sm.left + 1;
                    let bl = this.$store.state.font.baseLine + this.symbolOffsetY;
                    let top = sm.top - bl;
                    let bottom = sm.bottom - bl;
                    if (width !== parseInt(this.symbolCurves.width) ||
                        top !== parseInt(this.symbolCurves.top) ||
                        bottom !== parseInt(this.symbolCurves.bottom)
                    ) {
                        this.$store.commit('setSymbolMeasures', {
                            codePoint: this.$store.state.symbolEdit.codePoint,
                            width: width,
                            top: top,
                            bottom: bottom
                        });
                    }
                }
            }
        },
        drawSymbolBackground() {
            let svfs = this.symbolCtx.fillStyle;
            this.symbolCtx.fillStyle = 'grey';
            this.symbolCtx.fillRect(0, 0, this.symbolSize, this.symbolSize);
            this.symbolCtx.fillStyle = 'white';
            let [rx, ry] = this.canvas2Point(this.symbolOffsetX, this.symbolOffsetY);
            let [rxe, rye] = this.canvas2Point(this.symbolOffsetX + this.symbolSizeX, this.symbolOffsetY + this.symbolSizeY);
            this.symbolCtx.fillRect(rx, ry, rxe - rx, rye - ry);
            let svss = this.symbolCtx.strokeStyle;
            this.symbolCtx.strokeStyle = 'lightgrey';
            let svlw = this.symbolCtx.lineWidth;
            this.symbolCtx.lineWidth = this.supLineWidth;
            let lo = this.supLineWidth / 2;
            let cwlw = this.symbolCellSize + this.supLineWidth;
            for (let ln = 1; ln < 256; ++ln) {
                this.symbolCtx.beginPath();
                this.symbolCtx.moveTo(ln * cwlw, 0);
                this.symbolCtx.lineTo(ln * cwlw, this.symbolSize);
                this.symbolCtx.moveTo(0, ln * cwlw);
                this.symbolCtx.lineTo(this.symbolSize, ln * cwlw);
                this.symbolCtx.stroke();
            }
            this.symbolCtx.lineWidth = svlw;
            this.symbolCtx.strokeStyle = svss;
            this.symbolCtx.fillStyle = svfs;
        },
        point2Canvas(x, y) {
            let cwlw = this.symbolCellSize + this.supLineWidth;
            return [Math.floor(x / cwlw), Math.floor(y / cwlw)];
        },
        canvas2Point(x, y) {
            let cwlw = this.symbolCellSize + this.supLineWidth;
            return [x * cwlw, y * cwlw];
        },
        drawPointCanvas(x, y, color, thick) {
            let svss = this.symbolCtx.strokeStyle;
            this.symbolCtx.strokeStyle = 'lightgrey';
            let svfs = this.symbolCtx.fillStyle;
            this.symbolCtx.fillStyle = Number.isInteger(color) ? (color ? 'black' : 'white') : color;
            let lo = this.supLineWidth / 2;
            let [px, py] = this.canvas2Point(x, y);
            if (thick) {
                this.symbolCtx.fillRect(px - lo, py - lo, this.symbolCellSize + lo * 2, this.symbolCellSize + lo * 2);
            } else {
                this.symbolCtx.fillRect(px, py, this.symbolCellSize, this.symbolCellSize);
                this.symbolCtx.beginPath();
                this.symbolCtx.rect(px - lo, py - lo, this.symbolCellSize + lo * 2, this.symbolCellSize + lo * 2);
                this.symbolCtx.stroke();
            }
            this.symbolCtx.fillStyle = svfs;
            this.symbolCtx.strokeStyle = svss;
        },
        drawLine(x1, y1, x2, y2, color) {
            Draw.line(this, x1, y1, x2, y2, color);
        },
        onmousemove(event) {
            var rect = event.target.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            let [cX, cY] = this.point2Canvas(x, y);
            this.$store.commit('setSymbolMouseXY', {
                x: x,
                y: y,
                curveX: cX,
                curveY: cY,
            });
        },
        onmousedown(event) {
            var rect = event.target.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            let [cX, cY] = this.point2Canvas(x, y);
            this.$store.commit('setSymbolMouseCaptured', {
                isCaptured: true,
                x: x,
                y: y,
                curveX: cX,
                curveY: cY,
            });
            this.$store.commit('setSymbolMouseXY', {
                x: x,
                y: y,
                curveX: cX,
                curveY: cY,
            });
        },
        onmouseup(event) {
            var rect = event.target.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            let [cX, cY] = this.point2Canvas(x, y);
            this.$store.commit('setSymbolMouseCaptured', {
                isCaptured: false,
                x: x,
                y: y,
                curveX: cX,
                curveY: cY,
            });
        },
    },
    template: `
        <canvas class="canvas-symbol" ref="symbol" @mousemove="onmousemove" @mousedown="onmousedown" @mouseup="onmouseup"></canvas>
    `
};