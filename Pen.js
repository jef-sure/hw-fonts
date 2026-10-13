// The pen of the dgx library as it draws a text on a display. A pixel is an amount of ink: 0 is paper, 255 is all
// the ink. A hard pen takes a pixel whole or leaves it. A soft one, DGX_PEN_SOFT there, leaves in a pixel the share
// of it the line covers, and where lines meet the larger amount stays. Centres of pixels are whole numbers
class Pen {
    constructor(width, height, thickness, soft) {
        this.width = width;
        this.height = height;
        this.thickness = thickness;
        this.soft = soft;
        this.ink = new Uint8Array(width * height);
        this.touched = null;
    }

    // a whole pixel as dgx finds it: a half goes away from 0
    static round(v) {
        return Math.trunc(v + (v < 0 ? -0.5 : 0.5));
    }

    // Figures of one stroke in the order the pen makes them. Points of the stroke are whole pixels, a curve is
    // divided into equal parts of its parameter. A hard line goes through whole pixels: the first figure is the disc
    // of its start, every piece is a rectangle with the disc of its end, and the axis of an even pen runs half a pixel
    // to the right of the way, (ex, ey) half pixels from the points. A soft line runs where the curve does, only the
    // ends of the curve are whole, and an even pen runs half a pixel to the right and down of them, between pixels
    static figures(type, points, pieces, thickness, soft) {
        const p = points;
        const last = p[p.length - 1];
        let at = null;
        if (type === 'curve') {
            const cx = 3 * (p[1].x - p[0].x), bx = 3 * (p[2].x - p[1].x) - cx, ax = p[3].x - p[0].x - cx - bx;
            const cy = 3 * (p[1].y - p[0].y), by = 3 * (p[2].y - p[1].y) - cy, ay = p[3].y - p[0].y - cy - by;
            at = (t) => [((ax * t + bx) * t + cx) * t + p[0].x, ((ay * t + by) * t + cy) * t + p[0].y];
        } else if (type === 'curve3p') {
            const bx = p[0].x - 2 * p[1].x + p[2].x, cx = 2 * (p[1].x - p[0].x);
            const by = p[0].y - 2 * p[1].y + p[2].y, cy = 2 * (p[1].y - p[0].y);
            at = (t) => [(bx * t + cx) * t + p[0].x, (by * t + cy) * t + p[0].y];
        }
        let ends = [[p[0].x, p[0].y]];
        for (let i = 1; at && i < pieces; i++) ends.push(at(i / pieces));
        if (p.length > 1) ends.push([last.x, last.y]);
        const even = thickness % 2 === 0;
        let figures = [];
        if (soft) {
            const half = even ? 0.5 : 0;
            let [x, y] = ends[0];
            for (const [bx, by] of ends.slice(1)) {
                const length = Math.hypot(bx - x, by - y);
                // too short to have a direction: the next one starts where this one does
                if (!(length > 0.01)) continue;
                figures.push({x0: x + half, y0: y + half, x1: bx + half, y1: by + half, length: length});
                [x, y] = [bx, by];
            }
            if (!figures.length) figures.push({x0: x + half, y0: y + half, x1: x + half, y1: y + half, length: 0});
            return figures;
        }
        let x = Pen.round(ends[0][0]);
        let y = Pen.round(ends[0][1]);
        let ex = 0, ey = 0;
        const start = () => {
            if (even && !ex) ex = 1;
            if (even && !ey) ey = 1;
            figures.push({x0: x, y0: y, x1: x, y1: y, length: 0, ex: ex, ey: ey});
        };
        for (const end of ends.slice(1)) {
            const bx = Pen.round(end[0]), by = Pen.round(end[1]);
            const dx = bx - x, dy = by - y;
            if (dx === 0 && dy === 0) continue;
            if (even) {
                if (dx) ey = dx > 0 ? 1 : -1;
                if (dy) ex = dy > 0 ? -1 : 1;
            }
            if (!figures.length) start();
            figures.push({x0: x, y0: y, x1: bx, y1: by, length: Math.hypot(dx, dy), ex: ex, ey: ey});
            [x, y] = [bx, by];
        }
        // all the points of the stroke are one: a dot
        if (!figures.length) start();
        return figures;
    }

    // draws a figure from `from` to `to` pixels of its length, whole when `to` is its length. Drawn part by part,
    // a figure is the same as drawn at once
    draw(figure, from, to) {
        const f = figure;
        const whole = to >= f.length;
        if (this.soft) {
            const k0 = f.length > 0 ? from / f.length : 0, k1 = whole || !(f.length > 0) ? 1 : to / f.length;
            this.softLine(f.x0 + (f.x1 - f.x0) * k0, f.y0 + (f.y1 - f.y0) * k0, f.x0 + (f.x1 - f.x0) * k1, f.y0 + (f.y1 - f.y0) * k1);
        } else if (this.thickness === 1) {
            this.thinLine(f, from, whole ? f.length : to);
        } else if (whole) {
            this.hardFigure(f, from, f.length, f.x1, f.y1, this.thickness);
        } else {
            // where the pen has stopped the line ends with a disc two pixels smaller, it stays within the piece
            const cx = f.x0 + Pen.round((f.x1 - f.x0) * to / f.length);
            const cy = f.y0 + Pen.round((f.y1 - f.y0) * to / f.length);
            this.hardFigure(f, from, to, cx, cy, this.thickness - 2);
        }
    }

    touch(left, right, top, bottom) {
        const t = this.touched;
        this.touched = t ? {
            left: Math.min(t.left, left),
            right: Math.max(t.right, right),
            top: Math.min(t.top, top),
            bottom: Math.max(t.bottom, bottom)
        } : {
            left: left,
            right: right,
            top: top,
            bottom: bottom
        };
    }

    // A piece of a soft line with both its ends round. The share of a pixel is 0.5 + how deep its centre is inside
    // the line, within 0 .. 1: half a pixel either way from the edge. In dgx a piece is a bar with straight ends, and
    // a joint where the line turns little is a corner and not a disc: the difference is under 1/16 of the ink of a pixel
    softLine(x0, y0, x1, y1) {
        const reach = this.thickness / 2 + 0.5;
        const dx = x1 - x0, dy = y1 - y0, square = dx * dx + dy * dy;
        const left = Math.max(Math.ceil(Math.min(x0, x1) - reach), 0), right = Math.min(Math.floor(Math.max(x0, x1) + reach), this.width - 1);
        const top = Math.max(Math.ceil(Math.min(y0, y1) - reach), 0), bottom = Math.min(Math.floor(Math.max(y0, y1) + reach), this.height - 1);
        if (left > right || top > bottom) return;
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                let k = square > 0 ? ((x - x0) * dx + (y - y0) * dy) / square : 0;
                k = Math.min(Math.max(k, 0), 1);
                const share = reach - Math.hypot(x - x0 - k * dx, y - y0 - k * dy);
                if (share <= 0) continue;
                const ink = share >= 1 ? 255 : Math.round(share * 255);
                const i = y * this.width + x;
                if (ink > this.ink[i]) this.ink[i] = ink;
            }
        }
        this.touch(left, right, top, bottom);
    }

    // A piece of a hard line is one convex figure, every row of it is one interval: the rectangle from `from` to `to`
    // of its length, if to > from, and a disc of diameter d around (cx, cy), if d > 0. The disc of the piece before
    // lies around the start, so it closes the joint whatever the turn is. The disc of a pen stopped on its way is cut
    // by the start of its piece: the axis of an even pen runs half a pixel beside the way, and past a turn that disc
    // might stick a pixel out of the disc of the piece before
    hardFigure(f, from, to, cx, cy, d) {
        const dx = f.x1 - f.x0, dy = f.y1 - f.y0, len = f.length;
        const slop = 0.01, far = 1e6;
        let ctop = 1, cbottom = 0; // rows of the disc
        let rtop = 1, rbottom = 0; // rows of the rectangle
        // its ends are x = elo + y * ke and x = ehi + y * ke, its sides x = side + y * ks -+ half
        let ke = 0, elo = -far, ehi = far, ks = 0, side = 0, half = far;
        // the cut of the disc is x = tipX + y * ke, the side of it that stays, or the rows that stay
        let tip = false, tipSide = 0, tipFirst = -far, tipLast = far, tipX = 0;
        if (d > 0) {
            ctop = cy + (f.ey - (d - 1)) / 2;
            cbottom = ctop + d - 1;
        }
        if (to > from) {
            const r = this.thickness / 2;
            const ax = f.x0 + f.ex / 2, ay = f.y0 + f.ey / 2;
            let p0x = ax, p0y = ay, p1x = f.x1 + f.ex / 2, p1y = f.y1 + f.ey / 2;
            if (from > 0) [p0x, p0y] = [ax + dx * from / len, ay + dy * from / len];
            if (to < len) [p1x, p1y] = [ax + dx * to / len, ay + dy * to / len];
            let reach; // of the ends up and down from the axis
            if (dx === 0) {
                [side, half, reach] = [ax, r, 0];
            } else if (dy === 0) {
                [elo, ehi, reach] = [Math.min(p0x, p1x), Math.max(p0x, p1x), r];
            } else {
                ke = -dy / dx;
                ks = dx / dy;
                elo = (dx > 0 ? p0x : p1x) - (dx > 0 ? p0y : p1y) * ke;
                ehi = (dx > 0 ? p1x : p0x) - (dx > 0 ? p1y : p0y) * ke;
                side = ax - ay * ks;
                half = r * len / Math.abs(dy);
                reach = r * Math.abs(dx) / len;
            }
            rtop = Math.ceil(Math.min(p0y, p1y) - reach - slop);
            rbottom = Math.floor(Math.max(p0y, p1y) + reach + slop);
            if (d > 0 && to < len) {
                tip = true;
                if (dx) {
                    tipSide = dx > 0 ? 1 : -1;
                    tipX = ax - ay * ke;
                } else if (dy > 0) {
                    tipFirst = Math.ceil(ay - slop);
                } else {
                    tipLast = Math.floor(ay + slop);
                }
            }
        }
        let top = ctop, bottom = cbottom;
        if (rtop <= rbottom) {
            if (top > bottom || rtop < top) top = rtop;
            if (top > bottom || rbottom > bottom) bottom = rbottom;
        }
        top = Math.max(top, 0);
        bottom = Math.min(bottom, this.height - 1);
        for (let row = top; row <= bottom; row++) {
            let left = 1, right = 0;
            if (row >= rtop && row <= rbottom) {
                const c = side + row * ks;
                left = Math.ceil(Math.max(elo + row * ke, c - half) - slop);
                right = Math.floor(Math.min(ehi + row * ke, c + half) + slop);
            }
            if (row >= ctop && row <= cbottom) {
                // the chord of the disc in half pixels: odd for an even disc
                const q = 2 * (row - cy) - f.ey;
                let chord = Math.floor(Math.sqrt(d * d - q * q));
                if ((chord + d) % 2 === 0) chord--;
                let cl = cx + (f.ex - chord) / 2, cr = cx + (f.ex + chord) / 2;
                if (tip && tipSide > 0) cl = Math.max(cl, Math.ceil(tipX + row * ke - slop));
                if (tip && tipSide < 0) cr = Math.min(cr, Math.floor(tipX + row * ke + slop));
                if (tip && !tipSide && (row < tipFirst || row > tipLast)) [cl, cr] = [1, 0];
                if (cl > cr) {
                    // nothing of the disc is left in this row
                } else if (left > right) {
                    [left, right] = [cl, cr];
                } else {
                    left = Math.min(left, cl);
                    right = Math.max(right, cr);
                }
            }
            left = Math.max(left, 0);
            right = Math.min(right, this.width - 1);
            if (left > right) continue;
            this.ink.fill(255, row * this.width + left, row * this.width + right + 1);
            this.touch(left, right, row, row);
        }
    }

    // A line one pixel wide: the pixels of a piece from `from` to `to` of its length. The pixel number k of n is
    // k * dx / n and k * dy / n from the start, each brought to the nearest whole number
    thinLine(f, from, to) {
        const dx = f.x1 - f.x0, dy = f.y1 - f.y0;
        const n = Math.max(Math.abs(dx), Math.abs(dy));
        const first = n ? Math.floor(from * n / f.length) : 0, last = to >= f.length ? n : Math.floor(to * n / f.length);
        for (let k = first; k <= last; k++) {
            const x = f.x0 + (n ? Pen.round(k * dx / n) : 0), y = f.y0 + (n ? Pen.round(k * dy / n) : 0);
            if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
            this.ink[y * this.width + x] = 255;
            this.touch(x, x, y, y);
        }
    }
}
