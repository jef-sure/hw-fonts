const SymbolCanvas = {
    mounted() {
        let c = document.getElementById("cnv-symbol");
        let ctx = c.getContext("2d");
        this.symbolCtx = ctx;
        this.symbolCanvas = c;
        this.deviceScaling = window.devicePixelRatio || 1;
        this.supLineWidth = 1;
        let theight = window.innerHeight / 2;
        this.symbolCellSize = Math.max(Math.ceil((theight - 255 * this.supLineWidth) / 256), 3);
        this.symbolSize = this.symbolCellSize * 256 + 255 * this.supLineWidth;
        c.height = this.symbolSize;
        c.width = this.symbolSize;
        c.style.width = c.width + 'px';
        c.style.height = c.height + 'px';
        // ctx.scale(this.deviceScaling, this.deviceScaling);
        this.drawSymbolBackground();
    },
    computed: {
        offsetActiveAreaX() {
            return this.$store.state.offsetActiveAreaX;
        },
        offsetActiveAreaY() {
            return this.$store.state.offsetActiveAreaY;
        },
        activeAreaSizeX() {
            return this.$store.state.activeAreaSizeX;
        },
        activeAreaSizeY() {
            return this.$store.state.activeAreaSizeY;
        }
    },
    watch: {
        offsetActiveAreaX() {
            this.drawSymbolBackground();
        },
        offsetActiveAreaY() {
            this.drawSymbolBackground();
        },
        activeAreaSizeX() {
            this.drawSymbolBackground();
        },
        activeAreaSizeY() {
            this.drawSymbolBackground();
        },
    },
    methods: {
        drawSymbolBackground() {
            let svfs = this.symbolCtx.fillStyle;
            this.symbolCtx.fillStyle = 'grey';
            this.symbolCtx.fillRect(0, 0, this.symbolSize, this.symbolSize);
            this.symbolCtx.fillStyle = 'white';
            let [rx, ry] = this.canvas2Point(this.offsetActiveAreaX, this.offsetActiveAreaY);
            let [rxe, rye] = this.canvas2Point(this.offsetActiveAreaX + this.activeAreaSizeX, this.offsetActiveAreaY + this.activeAreaSizeY);
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
        drawPointCanvas(x, y, color) {
            let svss = this.symbolCtx.strokeStyle;
            this.symbolCtx.strokeStyle = 'lightgrey';
            let svfs = this.symbolCtx.fillStyle;
            this.symbolCtx.fillStyle = color ? 'black' : 'white';
            let lo = this.supLineWidth / 2;
            let [px, py] = this.canvas2Point(x, y);
            this.symbolCtx.fillRect(px, py, this.symbolCellSize, this.symbolCellSize);
            this.symbolCtx.beginPath();
            this.symbolCtx.rect(px - lo, py - lo, this.symbolCellSize + lo * 2, this.symbolCellSize + lo * 2);
            this.symbolCtx.stroke();
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

        onclick(event) {
            console.log('canvas click: ', event);
            var rect = event.target.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            var msg = `point: ${x} ${y}`;
            console.log(msg);
            let [px, py] = this.point2Canvas(x, y);
            this.drawPointCanvas(px, py, 1);
        }
    },
    data() {
        return {
            message: 'Hello Vue!!'
        };
    },
    template: `
        <canvas id="cnv-symbol" @click="onclick"></canvas>
    `
};