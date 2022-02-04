const Store = Vuex.createStore({
    state() {
        return {
            offsetActiveAreaX: 64,
            offsetActiveAreaY: 64,
            activeAreaSizeX: 128,
            activeAreaSizeY: 128,
            
        };
    },
    actions: {

    },
    mutations: {
        setActiveAreaOffset(state, offsetXY) {
            state.offsetActiveAreaX = offsetXY.x;
            state.offsetActiveAreaY = offsetXY.y;
        },
        setActiveAreaSize(state, sizeXY) {
            state.activeAreaSizeX = sizeXY.x;
            state.activeAreaSizeY = sizeXY.y;
        },
    }
});
