import { A as ActionType } from './utils-e7d8eaa2.js';

var Theme;
(function (Theme) {
    Theme["LIGHT"] = "LIGHT";
    Theme["DARK"] = "DARK";
})(Theme || (Theme = {}));
const defaultState = () => ({
    theme: Theme.LIGHT
});
const reducer = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.CHANGE_THEME:
            return Object.assign({}, previousState, {
                theme: action.theme
            });
        default:
            return previousState;
    }
};

export { Theme as T, defaultState as d, reducer as r };
//# sourceMappingURL=reducer-8296f5a1.js.map
