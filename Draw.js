class Draw {
    static line(object, x1, y1, x2, y2, color) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        if (dx === 0 && dy === 0) {
            object.drawPointCanvas(x1, y1, color);
            return;
        }
        if (dx === 0) {
            let sy = dy < 0 ? -1 : 1;
            for (; y1 != y2; y1 += sy)
                object.drawPointCanvas(x1, y1, color);
            return;
        }
        if (dy === 0) {
            let sx = dx < 0 ? -1 : 1;
            for (; x1 != x2; x1 += sx)
                object.drawPointCanvas(x1, y1, color);
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
                object.drawPointCanvas(x1, y1, color);
                if (x1 === x2) break;
                x1++;
                y1 += sy;
            }
            return;
        }
        /* My modification of Bresenham's line algorithm */
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
                object.drawPointCanvas(x1, y1, color);
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
                object.drawPointCanvas(x1, y1, color);
                if (y1 === y2) break;
                y1++;
                err += dx;
                if (err >= dy) {
                    err -= dy;
                    x1 += sx;
                }
            }
        }
    }

    static arrayOfSegments(object, segments, color) {
        for (const c of segments) {
            if (c.type === 'curve' && c.points.length === 4) {
                Curves.drawBezier4p(object, c.points, color);
            } else if (c.type === 'line' && c.points.length === 2) {
                object.drawLine(c.points[0].x, c.points[0].y, c.points[1].x, c.points[1].y, color);
            } else if (c.type === 'dot' && c.points.length === 1) {
                object.drawPointCanvas(c.points[0].x, c.points[0].y, color);
            } else if (c.type === 'curve3p' && c.points.length === 3) {
                Curves.drawBezier3p(object, c.points, color);
            }
        }
    }

    static shownSegments(object, with_aux_lines) {
        const curves = object.symbolCurves;
        if (curves === object.noCurves) return;
        let svss = object.symbolCtx.strokeStyle;
        let svlw = object.symbolCtx.lineWidth;
        let cs = object.symbolCellSize / 2;
        let segmentsArray = (skey) => {
            if (skey !== 'auxilarySegments') return curves[skey];
            return object.$store.state.font.auxilarySegments;
        };
        for (const segment in SegmentTypes) {
            if (object.$store.state.symbolEdit.shownSegments[segment]) {
                let sa = segmentsArray(segment);
                let color = 1;
                if (segment === 'auxilarySegments') {
                    if (!with_aux_lines) continue;
                    color = 'orange';
                }
                Draw.arrayOfSegments(object, sa, color);
                for (const c of sa) {
                    if (with_aux_lines && typeof object.canvas2Point == "function" && c.type !== 'dot' && c.points.length >= 1) {
                        const p = c.points[0];
                        object.drawPointCanvas(p.x, p.y, 'blue', 1);
                        object.symbolCtx.lineWidth = 1 / object.deviceScaling / 2;
                        object.symbolCtx.strokeStyle = 'blue';
                        for (let i = 1; i < c.points.length; ++i) {
                            const ps = c.points[i - 1];
                            const pe = c.points[i];
                            let [sx, sy] = object.canvas2Point(ps.x, ps.y);
                            let [ex, ey] = object.canvas2Point(pe.x, pe.y);
                            object.drawPointCanvas(pe.x, pe.y, 'blue', 1);
                            object.symbolCtx.beginPath();
                            object.symbolCtx.moveTo(sx + cs, sy + cs);
                            object.symbolCtx.lineTo(ex + cs, ey + cs);
                            object.symbolCtx.stroke();
                        }
                    }
                }
            }
        }
        if (with_aux_lines && typeof object.canvas2Point == "function") {
            let [sx, sy] = object.canvas2Point(0, object.font.baseLine + object.symbolOffsetY);
            let [ex, ey] = object.canvas2Point(255, object.font.baseLine + object.symbolOffsetY);
            object.symbolCtx.strokeStyle = 'red';
            object.symbolCtx.beginPath();
            object.symbolCtx.moveTo(sx + cs, sy + cs);
            object.symbolCtx.lineTo(ex + cs, ey + cs);
            object.symbolCtx.stroke();
        }
        object.symbolCtx.lineWidth = svlw;
        object.symbolCtx.strokeStyle = svss;
    }
}