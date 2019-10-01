import { A as ActionType, e as css, L as LitElement, h as html, T as Theme, o as once, r as reducer } from './utils-4526794e.js';
export { T as Theme, b as defaultState, r as reducer } from './utils-4526794e.js';

const changeTheme = (theme) => ({
    type: ActionType.CHANGE_THEME,
    theme
});

const provider = (store) => {
    return {
        changeTheme(theme) {
            store.dispatch(changeTheme(theme));
        },
        getTheme() {
            return store.getState().settings.theme;
        }
    };
};

// language=CSS
const style = css `:host {
    background: var(--background-theme);
}

:host > * {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
    0 4px 4px rgba(0, 0, 0, 0.12),
    0 6px 4px rgba(0, 0, 0, 0.12);
    padding: 1em;
}

label {
    display: flex;
    justify-content: space-between;
}

label > span:first-child::after {
    content: ':';
}`;

const template = ({ onChange, theme }) => html `
<div>
    <label>
        <span>Theme</span>
        <select @change="${onChange}" name="theme">
                <option value="${Theme.LIGHT}" ?selected="${theme === Theme.LIGHT}">Light</option>
                <option value="${Theme.DARK}" ?selected="${theme === Theme.DARK}">Dark</option>
        </select>
    </label>
</div>`;
const propDef = {};
class SettingsPanel extends LitElement {
    constructor(serviceRegistry) {
        super();
        this._settings = null;
        this._settings = serviceRegistry.get('settings');
    }
    static get styles() {
        return style;
    }
    static get properties() {
        return propDef;
    }
    render() {
        const onChange = (ev) => this._settings.changeTheme(ev.target.value);
        const theme = this._settings.getTheme();
        return template({
            onChange,
            theme
        });
    }
}

const loadServices = once((registry, store) => {
    store.injectReducer('settings', reducer);
    registry.set('settings', provider(store));
});
const loadComponents = once((injector) => {
    customElements.define('citykleta-settings-panel', injector(SettingsPanel));
});
const view = () => html `<citykleta-settings-panel class="panel"></citykleta-settings-panel>`;

export { SettingsPanel, changeTheme, loadComponents, loadServices, provider, view };
//# sourceMappingURL=settings.js.map
