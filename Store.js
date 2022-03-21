function getMouseCaptured(state, x, y) {
    let ret = [];
    const cp = state.symbolEdit.codePoint;
    if (cp) {
        for (let pi = 0; pi < state.font.codePoints[cp].length; ++pi) {
            const c = state.font.codePoints[cp][pi];
            for (let ci = 0; ci < c.length; ++ci) {
                const point = c[ci];
                if (point.x === x && point.y === y) {
                    ret.push({
                        element: 'curve',
                        index: pi,
                        pointIndex: ci
                    });
                }
            }
        }
    }
    if (y === state.font.baseLine + state.font.symbolOffsetY) {
        ret.push({
            element: 'baseLine',
            value: y - state.font.symbolOffsetY
        });
    }
    return ret;
}

const Store = Vuex.createStore({
    state() {
        return {
            symbolEdit: {
                mouse: {
                    x: 0,
                    y: 0,
                    curveX: 0,
                    curveY: 0,
                    isCaptured: false,
                    capturedObjects: [],
                },
                codePoint: 48,
                dataVersion: 0,
            },
            font: {
                name: 'font',
                baseLine: 100,
                symbolOffsetX: 64,
                symbolOffsetY: 64,
                symbolSizeX: 128,
                symbolSizeY: 128,
                extraLines: [],
                codePoints: {
                    48: [
                        [{
                            x: 71,
                            y: 129
                        }, {
                            x: 101,
                            y: 16
                        }, {
                            x: 93,
                            y: 65
                        }, {
                            x: 94,
                            y: 164
                        }]
                    ]
                }
            },
            symbolsBlock: {
                start: 0,
                blockWidth: 16,
                blockLength: 16
            }
        };
    },
    actions: {
        uploadFont({
            commit,
            state
        }, text) {
            try {
                let myResponse = JSON.parse(text);
                let font = {};
                for (let fk in state.font) {
                    if (fk in myResponse)
                        font[fk] = myResponse[fk];
                    else
                        return;
                }
                commit('setFont', font);
            } catch (e) {}
        },
    },
    mutations: {
        setFontName(state, name) {
            state.font.name = name;
        },
        setFont(state, font) {
            if (!(state.symbolEdit.codePoint in font.codePoints)) {
                let cs = Object.keys(font.codePoints);
                state.symbolEdit.codePoint = cs.length ? cs[0] : 48;
            }
            state.font = font;
            state.symbolEdit.dataVersion++;
        },
        setSymbolOffset(state, offsetXY) {
            state.font.symbolOffsetX = offsetXY.x;
            state.font.symbolOffsetY = offsetXY.y;
        },
        setSymbolSize(state, sizeXY) {
            state.font.symbolSizeX = sizeXY.x;
            state.font.symbolSizeY = sizeXY.y;
        },
        setSymbolMouseXY(state, xy) {
            state.symbolEdit.mouse.x = xy.x;
            state.symbolEdit.mouse.y = xy.y;
            state.symbolEdit.mouse.curveX = xy.curveX;
            state.symbolEdit.mouse.curveY = xy.curveY;
            if (state.symbolEdit.mouse.isCaptured && state.symbolEdit.mouse.capturedObjects.length) {
                const cp = state.symbolEdit.codePoint;
                const cs = state.font.codePoints[cp];
                for (const c of state.symbolEdit.mouse.capturedObjects) {
                    if (c.element === 'curve') {
                        cs[c.index][c.pointIndex].x = xy.curveX;
                        cs[c.index][c.pointIndex].y = xy.curveY;
                    } else if (c.element === 'baseLine') {
                        state.font.baseLine = xy.curveY - state.font.symbolOffsetY;
                    }
                }
                state.symbolEdit.dataVersion++;
            }
        },
        setSymbolMouseCaptured(state, capture) {
            state.symbolEdit.mouse.x = capture.x;
            state.symbolEdit.mouse.y = capture.y;
            state.symbolEdit.mouse.curveX = capture.curveX;
            state.symbolEdit.mouse.curveY = capture.curveY;
            if (!capture.isCaptured && state.symbolEdit.mouse.capturedObjects.length) {
                state.symbolEdit.mouse.capturedObjects = [];
            } else if (capture.isCaptured && !state.symbolEdit.mouse.isCaptured) {
                let co = getMouseCaptured(state, capture.curveX, capture.curveY);
                if (co.length === 0) {
                    const cp = state.symbolEdit.codePoint;
                    const cs = state.font.codePoints[cp];
                    if (cs.length && cs[cs.length - 1].length < 4) {
                        cs[cs.length - 1].push({
                            x: capture.curveX,
                            y: capture.curveY
                        });
                    } else {
                        cs.push([{
                            x: capture.curveX,
                            y: capture.curveY
                        }]);
                    }
                    co = getMouseCaptured(state, capture.curveX, capture.curveY);
                }
                state.symbolEdit.mouse.capturedObjects = co;
            }
            state.symbolEdit.mouse.isCaptured = capture.isCaptured;
            state.symbolEdit.dataVersion++;
        },
        setBaseLine(state, y) {
            state.font.baseLine = y;
            state.symbolEdit.dataVersion++;
        },
        incrementDataVersion(state) {
            state.symbolEdit.dataVersion++;
        },
        deleteCurve(state, curveIndex) {
            const cp = state.symbolEdit.codePoint;
            let cs = state.font.codePoints[cp];
            cs.splice(curveIndex, 1);
            state.symbolEdit.mouse.isCaptured = false;
            state.symbolEdit.dataVersion++;
        },
    },
    getters: {},
});