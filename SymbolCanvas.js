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
            if (curves === this.noCurves) return;
            let svss = this.symbolCtx.strokeStyle;
            let svlw = this.symbolCtx.lineWidth;
            let cs = this.symbolCellSize / 2;
            let drawSegments = (segments) => {
                for (const c of segments) {
                    if (c.type === 'curve' && c.points.length === 4) {
                        Curves.drawBezier4p(this, c.points, 1);
                    } else if (c.type === 'line' && c.points.length === 2) {
                        this.drawLine(c.points[0].x, c.points[0].y, c.points[1].x, c.points[1].y, 1);
                    } else if (c.type === 'dot' && c.points.length === 1) {
                        this.drawPointCanvas(c.points[0].x, c.points[0].y, 1);
                    } else if (c.type === 'curve3p' && c.points.length === 3) {
                        Curves.drawBezier3p(this, c.points, 1);
                    }
                    if (c.type !== 'dot' && c.points.length >= 1) {
                        const p = c.points[0];
                        this.drawPointCanvas(p.x, p.y, 'blue', 1);
                        this.symbolCtx.lineWidth = 1 / this.deviceScaling / 2;
                        this.symbolCtx.strokeStyle = 'blue';
                        for (let i = 1; i < c.points.length; ++i) {
                            const ps = c.points[i - 1];
                            const pe = c.points[i];
                            let [sx, sy] = this.canvas2Point(ps.x, ps.y);
                            let [ex, ey] = this.canvas2Point(pe.x, pe.y);
                            this.drawPointCanvas(pe.x, pe.y, 'blue', 1);
                            this.symbolCtx.beginPath();
                            this.symbolCtx.moveTo(sx + cs, sy + cs);
                            this.symbolCtx.lineTo(ex + cs, ey + cs);
                            this.symbolCtx.stroke();
                        }
                    }
                }
            };
            for (const segment in SegmentTypes) {
                if (this.$store.state.symbolEdit.shownSegments[segment])
                    drawSegments(curves[segment]);
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
            /* My modification of Bresenham's line algorithm 
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
            */
            let err;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) {
                    [x1, y1, x2, y2] = [x2, y2, x1, y1];
                    dx = -dx;
                    dy = -dy;
                }
                let sy = dy < 0 ? -1 : 1;
                if (dy < 0) dy = -dy;
                err = dx / 2;
                let sp = x1;
                do {
                    err += dy;
                    if (err >= dx || x1 == x2) {
                        for (let i = sp; i < x1 + 1; ++i)
                            this.drawPointCanvas(i, y1, color);
                        sp = x1 + 1;
                        y1 += sy;
                        err -= dx;
                    }
                } while (x1++ != x2);
            } else {
                if (dy < 0) {
                    [x1, y1, x2, y2] = [x2, y2, x1, y1];
                    dx = -dx;
                    dy = -dy;
                }
                let sx = dx < 0 ? -1 : 1;
                err = dy / 2;
                if (dx < 0) dx = -dx;
                let sp = y1;
                do {
                    err += dx;
                    if (err >= dy || y1 == y2) {
                        for (let i = 0; i < y1 - sp + 1; ++i)
                            this.drawPointCanvas(x1, sp + i, color);
                        sp = y1 + 1;
                        x1 += sx;
                        err -= dy;
                    }
                } while (y1++ != y2);
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
        <canvas class="canvas-symbol" ref="symbol" @mousemove="onmousemove" @mousedown="onmousedown" @mouseup="onmouseup"></canvas>
    `
};