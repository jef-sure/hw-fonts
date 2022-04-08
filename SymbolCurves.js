class SymbolCurves {
    static drawShownSegments(object, with_aux_lines) {
        const curves = object.symbolCurves;
        if (curves === object.noCurves) return;
        let svss = object.symbolCtx.strokeStyle;
        let svlw = object.symbolCtx.lineWidth;
        let cs = object.symbolCellSize / 2;
        let drawSegments = (segments) => {
            for (const c of segments) {
                if (c.type === 'curve' && c.points.length === 4) {
                    Curves.drawBezier4p(object, c.points, 1);
                } else if (c.type === 'line' && c.points.length === 2) {
                    object.drawLine(c.points[0].x, c.points[0].y, c.points[1].x, c.points[1].y, 1);
                } else if (c.type === 'dot' && c.points.length === 1) {
                    object.drawPointCanvas(c.points[0].x, c.points[0].y, 1);
                } else if (c.type === 'curve3p' && c.points.length === 3) {
                    Curves.drawBezier3p(object, c.points, 1);
                }
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
        };
        for (const segment in SegmentTypes) {
            if (object.$store.state.symbolEdit.shownSegments[segment])
                drawSegments(curves[segment]);
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