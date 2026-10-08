// what a saved font file is: a converter reads these two keys to know whether it can convert the file.
// The version is increased when a file of the new format cannot be read as one of the old format
const FontFormat = {
    name: 'hw-font',
    version: 1
};
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
        let capture = (shown) => {
            for (const fk in SegmentTypes) {
                if ((state.symbolEdit.shownSegments[fk] ? true : false) !== shown) continue;
                // hidden lines of the font are not parts of the symbol, they stay where they are
                if (!shown && fk === 'auxilarySegments') continue;
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
        };
        capture(true);
        // points of hidden segments of the symbol standing at the same place are moved together with the shown one:
        // a connection stays joined to the symbol when its segments are not shown
        if (ret.length) capture(false);
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

function findSegmentWithIncompleteCurve(state) {
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
    for (const segment in SegmentTypes) {
        let sa = segmentsArray(segment);
        if (isIncompleteSegment(sa)) {
            return sa;
        }
    }
    return null;
}



const useFontStore = Pinia.defineStore('font', {
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
                format: FontFormat.name,
                formatVersion: FontFormat.version,
                name: 'font',
                baseLine: 100,
                xHeight: 58, // height of lowercase letters above the base line
                symbolSpace: 16, // space after a symbol in the line unless the symbol has its own spaceAfter, it is a part of the symbol's advance
                spaceWidth: 84, // advance of the space character when symbols take their own width
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
            },
            symbolView: {
                codePoint: null,
                scale: 1,
                penPath: false,
                filter: '',
                shownSegments: {
                    mainSegments: true,
                    postSegments: true,
                    beginConnection: false,
                    endConnection: false,
                    auxilarySegments: false
                },
            },
            effects: {
                text: '',
                scale: 1,
                thickness: 1,
                color: '#000000',
                joined: true,
                proportional: false,
                speed: 20,
            }
        };
    },
    actions: {
        uploadFont(text) {
            try {
                let myResponse = JSON.parse(text);
                let font = {};
                let absent = [];
                if ('format' in myResponse && myResponse.format !== FontFormat.name) {
                    this.setUploadErrorMessage('Not a font of this editor, its format is ' + myResponse.format);
                    return;
                }
                if (myResponse.formatVersion > FontFormat.version) {
                    this.setUploadErrorMessage('The font is of format version ' + myResponse.formatVersion + ', this editor knows versions up to ' + FontFormat.version);
                    return;
                }
                // keys added to the format later, fonts saved before have no such keys
                const defaults = {
                    format: FontFormat.name,
                    formatVersion: FontFormat.version,
                    xHeight: 58,
                    symbolSpace: 16
                };
                // a space used to take the whole active area
                if ('symbolSizeX' in myResponse) defaults.spaceWidth = myResponse.symbolSizeX - ('symbolSpace' in myResponse ? myResponse.symbolSpace : defaults.symbolSpace);
                for (let fk in this.font) {
                    if (fk in myResponse)
                        font[fk] = myResponse[fk];
                    else if (fk in defaults)
                        font[fk] = defaults[fk];
                    else
                        absent.push(fk);
                }
                if (absent.length) {
                    this.setUploadErrorMessage('Bad font format. Absent keys: ' + absent.join(", "));
                } else {
                    // the editor saves a font in its own version of the format
                    font.formatVersion = FontFormat.version;
                    this.setFont(font);
                }
            } catch (e) {}
        },
        setCurrentCodepoint(codePoint) {
            this.symbolEdit.codePoint = codePoint;
            this.symbolEdit.dataVersion++;
        },
        addCodepoint(codePoint) {
            this.font.codePoints[codePoint] = {
                mainSegments: [],
                postSegments: [],
                beginConnection: [],
                endConnection: [],
                width: 0,
                top: 0,
                bottom: 0
            };
            this.symbolEdit.codePoint = codePoint;
            this.symbolEdit.dataVersion++;
        },
        removeCodepoint(codePoint) {
            let cps = Object.keys(this.font.codePoints);
            cps.sort((a, b) => a - b);
            codePoint = parseInt(codePoint);
            if (cps.length > 1) {
                delete this.font.codePoints[codePoint];
                let fi = cps.findIndex(e => parseInt(e) === codePoint);
                if (fi === 0) ++fi;
                else --fi;
                this.symbolEdit.codePoint = cps[fi];
                this.symbolEdit.dataVersion++;
            }
        },
        setShownSegment(segments) {
            for (const segment in segments) {
                if (segment in this.symbolEdit.shownSegments)
                    this.symbolEdit.shownSegments[segment] = segments[segment] ? true : false;
            }
            this.symbolEdit.dataVersion++;
        },
        setSymbolsBlock(uindex) {
            let begin = parseInt(UnicodeRanges[uindex]['data-begin'], 16);
            let end = parseInt(UnicodeRanges[uindex]['data-end'], 16);
            this.symbolsBlock.begin = begin;
            this.symbolsBlock.blockLength = parseInt((end + 16 - begin) / 16);
        },
        setNewElementType(type) {
            this.symbolEdit.newElementType = type;
        },
        setNewSegmentType(type) {
            this.symbolEdit.newSegmentType = type;
        },
        setFontName(name) {
            this.font.name = name;
        },
        setUploadErrorMessage(message) {
            this.uploadErrorMessage = message;
        },
        setFont(font) {
            if (!(this.symbolEdit.codePoint in font.codePoints)) {
                let cs = Object.keys(font.codePoints);
                this.symbolEdit.codePoint = cs.length ? cs[0] : 48;
            }
            this.font = font;
            this.fontSequence++;
            this.symbolEdit.dataVersion++;
        },
        setSymbolOffset(offsetXY) {
            this.font.symbolOffsetX = offsetXY.x;
            this.font.symbolOffsetY = offsetXY.y;
        },
        setSymbolSize(sizeXY) {
            this.font.symbolSizeX = sizeXY.x;
            this.font.symbolSizeY = sizeXY.y;
        },
        setSymbolMouseXY(xy) {
            this.symbolEdit.mouse.x = xy.x;
            this.symbolEdit.mouse.y = xy.y;
            this.symbolEdit.mouse.curveX = xy.curveX;
            this.symbolEdit.mouse.curveY = xy.curveY;
            const cp = this.symbolEdit.codePoint;
            let segmentsArray = (skey) => {
                if (skey !== 'auxilarySegments') return this.font.codePoints[cp][skey];
                return this.font.auxilarySegments;
            };
            if (this.symbolEdit.mouse.isCaptured && this.symbolEdit.mouse.capturedObjects.length) {
                const cs = this.font.codePoints[cp];
                for (const c of this.symbolEdit.mouse.capturedObjects) {
                    if ('segment' in c) {
                        let sa = segmentsArray(c.segment);
                        sa[c.index].points[c.pointIndex].x = xy.curveX;
                        sa[c.index].points[c.pointIndex].y = xy.curveY;
                    } else if (c.element === 'baseLine') {
                        this.font.baseLine = xy.curveY - this.font.symbolOffsetY;
                    }
                }
                this.symbolEdit.dataVersion++;
            }
        },
        setSymbolMouseCaptured(capture) {
            this.symbolEdit.mouse.x = capture.x;
            this.symbolEdit.mouse.y = capture.y;
            this.symbolEdit.mouse.curveX = capture.curveX;
            this.symbolEdit.mouse.curveY = capture.curveY;
            if (!capture.isCaptured && this.symbolEdit.mouse.capturedObjects.length) {
                this.symbolEdit.mouse.capturedObjects = [];
            } else if (capture.isCaptured && !this.symbolEdit.mouse.isCaptured) {
                let co = getMouseCaptured(this, capture.curveX, capture.curveY);
                /*
                                        [{
                                            element: type, // curve, dot, line, curve3p, baseLine
                                            segment: fk, // mainSegments, postSegments, beginConnection, endConnection
                                            index: pi, // index inside segments
                                            pointIndex: ci // index inside element points
                                        }, ...]
                */
                if (co.length === 0) {
                    let sa = findSegmentWithIncompleteCurve(this);
                    if (sa) {
                        sa[sa.length - 1].points.push({
                            x: capture.curveX,
                            y: capture.curveY
                        });
                    } else {
                        const cp = this.symbolEdit.codePoint;
                        const cs = this.font.codePoints[cp];
                        let sa = this.symbolEdit.newSegmentType !== 'auxilarySegments' ? cs[this.symbolEdit.newSegmentType] : this.font.auxilarySegments;
                        sa.push({
                            type: this.symbolEdit.newElementType,
                            points: [{
                                x: capture.curveX,
                                y: capture.curveY
                            }]
                        });
                        if (!this.symbolEdit.shownSegments[this.symbolEdit.newSegmentType])
                            this.symbolEdit.shownSegments[this.symbolEdit.newSegmentType] = true;
                    }
                    co = getMouseCaptured(this, capture.curveX, capture.curveY);
                }
                this.symbolEdit.mouse.capturedObjects = co;
            }
            this.symbolEdit.mouse.isCaptured = capture.isCaptured;
            this.symbolEdit.dataVersion++;
        },
        cancelLastIncompleteCurve() {
            let sa = findSegmentWithIncompleteCurve(this);
            if (sa) {
                sa.pop();
                this.symbolEdit.mouse.isCaptured = false;
                this.symbolEdit.dataVersion++;
            }
        },
        setXHeight(height) {
            this.font.xHeight = height;
        },
        setSpaceWidth(width) {
            this.font.spaceWidth = width;
        },
        setSymbolSpace(space) {
            this.font.symbolSpace = space;
            this.symbolEdit.dataVersion++;
        },
        // own space of the edited symbol, key is spaceBefore or spaceAfter, an empty value takes it away
        setOwnSpace(key, space) {
            const symbol = this.font.codePoints[this.symbolEdit.codePoint];
            if (!symbol) return;
            if (Number.isFinite(space) && space >= 0) symbol[key] = space;
            else delete symbol[key];
            this.symbolEdit.dataVersion++;
        },
        setBaseLine(y) {
            this.font.baseLine = y;
            this.symbolEdit.dataVersion++;
        },
        incrementDataVersion() {
            this.symbolEdit.dataVersion++;
        },
        deleteCurve({
            curveIndex,
            segment
        }) {
            const cp = this.symbolEdit.codePoint;
            let segmentsArray = (skey) => {
                if (skey !== 'auxilarySegments') return this.font.codePoints[cp][skey];
                return this.font.auxilarySegments;
            };
            let cs = segmentsArray(segment);
            cs.splice(curveIndex, 1);
            this.symbolEdit.mouse.isCaptured = false;
            this.symbolEdit.dataVersion++;
        },
        setViewCodepoint(codePoint) {
            this.symbolView.codePoint = codePoint;
        },
        setViewShownSegment(segment, shown) {
            this.symbolView.shownSegments[segment] = shown ? true : false;
        },
        // measures of all symbols, the editor itself renews them only for the symbol being edited
        setAllSymbolMeasures() {
            for (const cp in this.font.codePoints) {
                const m = SymbolMeasure.ofSymbol(this.font, cp, ['mainSegments', 'postSegments']);
                if (!m) continue;
                for (const key of SymbolMeasure.keys()) {
                    this.font.codePoints[cp][key] = m[key];
                }
            }
        },
        // lengths of all elements, numbers of pieces to draw them with and numbers of points they take on the grid
        // are kept in the font for drawing it by other programs
        setElementLengths() {
            let segments = [this.font.auxilarySegments];
            for (const cp in this.font.codePoints) {
                for (const skey in SegmentTypes) {
                    if (skey !== 'auxilarySegments') segments.push(this.font.codePoints[cp][skey]);
                }
            }
            for (const sa of segments) {
                if (!Array.isArray(sa)) continue;
                for (const c of sa) {
                    c.length = Curves.elementLength(c);
                    c.pieces = Curves.elementPieces(c);
                    c.pixels = Curves.elementPixels(c);
                }
            }
        },
        setSymbolMeasures(measures) {
            for (const key of SymbolMeasure.keys()) {
                this.font.codePoints[measures.codePoint][key] = measures[key];
            }
        }
    },
    getters: {
        // sorted by code, but the Russian letters go alphabetically: Ё after Е
        fontCodePoints(state) {
            const order = (cp) => cp === 0x401 ? 0x415 + 0.5 : (cp === 0x451 ? 0x435 + 0.5 : cp);
            let cps = Object.keys(state.font.codePoints).map(e => parseInt(e));
            cps.sort((a, b) => order(a) - order(b));
            return cps;
        },
    },
});