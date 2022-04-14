const SegmentTypes = {
    mainSegments: "Main segments",
    postSegments: "Postponed segments",
    beginConnection: "Begin connection",
    endConnection: "End connection",
    auxilarySegments: "Auxilary font segments"
};

function getMouseCaptured(state, x, y) {
    let ret = [];
    const cp = state.symbolEdit.codePoint;
    if (cp) {
        let segmentsArray = (skey) => {
            if (skey !== 'auxilarySegments') return state.font.codePoints[cp][skey];
            return state.font.auxilarySegments;
        };
        for (const fk in SegmentTypes) {
            let sa = segmentsArray(fk);
            if (!Array.isArray(sa)) continue;
            for (let pi = 0; pi < sa.length; ++pi) {
                const cs = sa[pi];
                const c = cs.points;
                for (let ci = 0; ci < c.length; ++ci) {
                    const point = c[ci];
                    if (point.x === x && point.y === y) {
                        ret.push({
                            element: cs.type, // curve, dot, line, curve3p 
                            segment: fk, // mainSegments, postSegments, beginConnection, endConnection
                            index: pi, // index inside segments
                            pointIndex: ci // index inside element points
                        });
                    }
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

const ElementTypes = {
    dot: {
        len: 1,
        name: "Dot"
    },
    line: {
        len: 2,
        name: "Line"
    },
    curve3p: {
        len: 3,
        name: "Curve 3p"
    },
    curve: {
        len: 4,
        name: "Curve"
    },
};

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
                newSegmentType: 'mainSegments', // postSegments, beginConnection, endConnection
                newElementType: 'curve', // , dot, line, curve3p
                codePoint: 48,
                dataVersion: 0,
                shownSegments: {
                    mainSegments: true,
                    postSegments: false,
                    beginConnection: false,
                    endConnection: false,
                    auxilarySegments: false
                },
            },
            uploadErrorMessage: '',
            fontSequence: 0,
            font: {
                name: 'font',
                baseLine: 100,
                symbolOffsetX: 64,
                symbolOffsetY: 64,
                symbolSizeX: 128,
                symbolSizeY: 128,
                widthType: 'fixed', // proportional
                auxilarySegments: [],
                codePoints: {
                    48: {
                        "mainSegments": [{
                                "type": "curve",
                                "points": [{
                                        "x": 87,
                                        "y": 101
                                    },
                                    {
                                        "x": 121,
                                        "y": 55
                                    },
                                    {
                                        "x": 189,
                                        "y": 122
                                    },
                                    {
                                        "x": 136,
                                        "y": 199
                                    }
                                ]
                            },
                            {
                                "type": "curve",
                                "points": [{
                                        "x": 136,
                                        "y": 199
                                    },
                                    {
                                        "x": 100,
                                        "y": 236
                                    },
                                    {
                                        "x": 46,
                                        "y": 162
                                    },
                                    {
                                        "x": 87,
                                        "y": 101
                                    }
                                ]
                            }
                        ],
                        "postSegments": [{
                            "type": "line",
                            "points": [{
                                    "x": 140,
                                    "y": 100
                                },
                                {
                                    "x": 85,
                                    "y": 193
                                }
                            ]
                        }],
                        beginConnection: [],
                        endConnection: [],
                        width: 0
                    }
                }
            },
            symbolsBlock: {
                begin: 0,
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
                let absent = [];
                for (let fk in state.font) {
                    if (fk in myResponse)
                        font[fk] = myResponse[fk];
                    else
                        absent.push(fk);
                }
                if (absent.length) {
                    commit('setUploadErrorMessage', 'Bad font format. Absent keys: ' + absent.join(", "));
                } else {
                    commit('setFont', font);
                }
            } catch (e) {}
        },
    },
    mutations: {
        setCurrentCodepoint(state, codePoint) {
            state.symbolEdit.codePoint = codePoint;
            state.symbolEdit.dataVersion++;
        },
        addCodepoint(state, codePoint) {
            state.font.codePoints[codePoint] = {
                mainSegments: [],
                postSegments: [],
                beginConnection: [],
                endConnection: [],
                width: 0,
                top: 0,
                bottom: 0
            };
            state.symbolEdit.codePoint = codePoint;
            state.symbolEdit.dataVersion++;
        },
        removeCodepoint(state, codePoint) {
            let cps = Object.keys(state.font.codePoints);
            cps.sort((a, b) => a - b);
            codePoint = parseInt(codePoint);
            if (cps.length > 1) {
                delete state.font.codePoints[codePoint];
                let fi = cps.findIndex(e => parseInt(e) === codePoint);
                if (fi === 0) ++fi;
                else --fi;
                state.symbolEdit.codePoint = cps[fi];
                state.symbolEdit.dataVersion++;
            }
        },
        setShownSegment(state, segments) {
            for (const segment in segments) {
                if (segment in state.symbolEdit.shownSegments)
                    state.symbolEdit.shownSegments[segment] = segments[segment] ? true : false;
            }
            state.symbolEdit.dataVersion++;
        },
        setSymbolsBlock(state, uindex) {
            let begin = parseInt(UnicodeRanges[uindex]['data-begin'], 16);
            let end = parseInt(UnicodeRanges[uindex]['data-end'], 16);
            state.symbolsBlock.begin = begin;
            state.symbolsBlock.blockLength = parseInt((end + 16 - begin) / 16);
        },
        setNewElementType(state, type) {
            state.symbolEdit.newElementType = type;
        },
        setNewSegmentType(state, type) {
            state.symbolEdit.newSegmentType = type;
        },
        setFontName(state, name) {
            state.font.name = name;
        },
        setUploadErrorMessage(state, message) {
            state.uploadErrorMessage = message;
        },
        setFont(state, font) {
            if (!(state.symbolEdit.codePoint in font.codePoints)) {
                let cs = Object.keys(font.codePoints);
                state.symbolEdit.codePoint = cs.length ? cs[0] : 48;
            }
            state.font = font;
            state.fontSequence++;
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
            const cp = state.symbolEdit.codePoint;
            let segmentsArray = (skey) => {
                if (skey !== 'auxilarySegments') return state.font.codePoints[cp][skey];
                return state.font.auxilarySegments;
            };
            if (state.symbolEdit.mouse.isCaptured && state.symbolEdit.mouse.capturedObjects.length) {
                const cs = state.font.codePoints[cp];
                for (const c of state.symbolEdit.mouse.capturedObjects) {
                    if ('segment' in c) {
                        let sa = segmentsArray(c.segment);
                        sa[c.index].points[c.pointIndex].x = xy.curveX;
                        sa[c.index].points[c.pointIndex].y = xy.curveY;
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
                /*
                                        [{
                                            element: type, // curve, dot, line, curve3p, baseLine
                                            segment: fk, // mainSegments, postSegments, beginConnection, endConnection
                                            index: pi, // index inside segments
                                            pointIndex: ci // index inside element points
                                        }, ...]
                */
                if (co.length === 0) {
                    const cp = state.symbolEdit.codePoint;
                    const cs = state.font.codePoints[cp];
                    let isIncompleteSegment = (segments) => {
                        if (segments.length && segments[segments.length - 1].points.length < ElementTypes[segments[segments.length - 1].type].len) return true;
                        return false;
                    };
                    let segmentsArray = (skey) => {
                        if (skey !== 'auxilarySegments') return cs[skey];
                        return state.font.auxilarySegments;
                    };
                    let foundIncomplete = false;
                    for (const segment in SegmentTypes) {
                        let sa = segmentsArray(segment);
                        foundIncomplete = isIncompleteSegment(sa);
                        if (foundIncomplete) {
                            sa[sa.length - 1].points.push({
                                x: capture.curveX,
                                y: capture.curveY
                            });
                            break;
                        }
                    }
                    if (!foundIncomplete) {
                        let sa = segmentsArray(state.symbolEdit.newSegmentType);
                        sa.push({
                            type: state.symbolEdit.newElementType,
                            points: [{
                                x: capture.curveX,
                                y: capture.curveY
                            }]
                        });
                        if (!state.symbolEdit.shownSegments[state.symbolEdit.newSegmentType])
                            state.symbolEdit.shownSegments[state.symbolEdit.newSegmentType] = true;
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
        deleteCurve(state, {
            curveIndex,
            segment
        }) {
            const cp = state.symbolEdit.codePoint;
            let segmentsArray = (skey) => {
                if (skey !== 'auxilarySegments') return state.font.codePoints[cp][skey];
                return state.font.auxilarySegments;
            };
            let cs = segmentsArray(segment);
            cs.splice(curveIndex, 1);
            state.symbolEdit.mouse.isCaptured = false;
            state.symbolEdit.dataVersion++;
        },
        setSymbolMeasures(state, {
            codePoint,
            width,
            top,
            bottom
        }) {
            state.font.codePoints[codePoint].width = width;
            state.font.codePoints[codePoint].top = top;
            state.font.codePoints[codePoint].bottom = bottom;
        }
    },
    getters: {},
});