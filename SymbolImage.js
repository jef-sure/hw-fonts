const SymbolImage = {
    props: {
        codePoint: Number,
    },
    data() {
        return {
            noCurves: [],
        };
    },
    mounted() {
        let c = this.$refs.canvas;
        let ctx = c.getContext("2d");
        this.symbolCtx = ctx;
        this.symbolCanvas = c;
        this.deviceScaling = window.devicePixelRatio || 1;
        this.supLineWidth = 1 / this.deviceScaling;
        c.height = this.symbolSizeY;
        c.width = this.symbolSizeX;
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
            const curves = this.symbolCurves;
            let svss = this.symbolCtx.strokeStyle;
            let svlw = this.symbolCtx.lineWidth;
            let cs = this.symbolCellSize / 2;
            for (const c of curves) {
                if (c.length === 4) {
                    Curves.drawBezier4p(this, c, 1);
                }
                if (c.length >= 1) {
                    const p = c[0];
                    this.drawPointCanvas(p.x, p.y, 'blue', 1);
                }
                this.symbolCtx.lineWidth = 1 / this.deviceScaling / 2;
                this.symbolCtx.strokeStyle = 'blue';
                for (let i = 1; i < c.length; ++i) {
                    const ps = c[i - 1];
                    const pe = c[i];
                    let [sx, sy] = this.canvas2Point(ps.x, ps.y);
                    let [ex, ey] = this.canvas2Point(pe.x, pe.y);
                    this.drawPointCanvas(pe.x, pe.y, 1, 1);
                    this.symbolCtx.beginPath();
                    this.symbolCtx.moveTo(sx + cs, sy + cs);
                    this.symbolCtx.lineTo(ex + cs, ey + cs);
                    this.symbolCtx.stroke();
                }
            }
            let [sx, sy] = this.canvas2Point(0, this.font.baseLine + this.symbolOffsetY);
            let [ex, ey] = this.canvas2Point(255, this.font.baseLine + this.symbolOffsetY);
            this.symbolCtx.strokeStyle = 'red';
            this.symbolCtx.beginPath();
            this.symbolCtx.moveTo(sx + cs, sy + cs);
            this.symbolCtx.lineTo(ex + cs, ey + cs);
            this.symbolCtx.stroke();
            this.symbolCtx.lineWidth = svlw;
            this.symbolCtx.strokeStyle = svss;
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
            let dx = x2 - x1;
            let dy = y2 - y1;
            if (dx === 0 && dy === 0) {
                this.drawPointCanvas(x1, y1, color);
                return;
            }
            if (dx === 0) {
                let sy = dy < 0 ? -1 : 1;
                for (; y1 != y2; y1 += sy)
                    this.drawPointCanvas(x1, y1, color);
                return;
            }
            if (dy === 0) {
                let sx = dx < 0 ? -1 : 1;
                for (; x1 != x2; x1 += sx)
                    this.drawPointCanvas(x1, y1, color);
                return;
            }
            if (Math.abs(dx) === Math.abs(dy)) {
                if (dx < 0) {
                    [x1, y1, x2, y2] = [x2, y2, x1, y1];
                    dx = -dx;
                    dy = -dy;
                }
                let sy = dy < 0 ? -1 : 1;
                while (true) {
                    this.drawPointCanvas(x1, y1, color);
                    if (x1 === x2) break;
                    x1++;
                    y1 += sy;
                }
                return;
            }
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) {
                    [x1, y1, x2, y2] = [x2, y2, x1, y1];
                    dx = -dx;
                    dy = -dy;
                }
                let sy = dy < 0 ? -1 : 1;
                if (dy < 0) dy = -dy;
                let err = 0;
                ++dx;
                ++dy;
                while (true) {
                    this.drawPointCanvas(x1, y1, color);
                    if (x1 === x2) break;
                    x1++;
                    err += dy;
                    if (err >= dx) {
                        err -= dx;
                        y1 += sy;
                    }
                }
            } else {
                if (dy < 0) {
                    [x1, y1, x2, y2] = [x2, y2, x1, y1];
                    dx = -dx;
                    dy = -dy;
                }
                let sx = dx < 0 ? -1 : 1;
                if (dx < 0) dx = -dx;
                let err = 0;
                ++dx;
                ++dy;
                while (true) {
                    this.drawPointCanvas(x1, y1, color);
                    if (y1 === y2) break;
                    y1++;
                    err += dx;
                    if (err >= dy) {
                        err -= dy;
                        x1 += sx;
                    }
                }
            }
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
        <canvas ref="canvas"></canvas>
    `
};