import {html, LitElement} from 'lit-element';
import {ToolType} from '../tools/interfaces';
import {Theme} from '../reducers/settings';

export const propDef = {
    selectedTool: {type: String, attribute: false}
};

const findPanel = (tool: ToolType) => {
    switch (tool) {
        case ToolType.SEARCH:
            return html`<citykleta-search-panel class="panel"></citykleta-search-panel>`;
        case ToolType.SETTINGS:
            return html`<citykleta-settings-panel class="panel"></citykleta-settings-panel>`;
        case ToolType.ITINERARY:
            return html`<citykleta-itinerary-panel class="panel"></citykleta-itinerary-panel>`;
        default:
            return html`Unknown route !`;
    }
};

export const template = ({selectedTool}) => {
    return html`
<link rel="stylesheet" href="app.css">
<citykleta-navigation-bar .selectedTool="${selectedTool}"></citykleta-navigation-bar>
${findPanel(selectedTool)}`;
};

export class App extends LitElement {

    static get properties() {
        return propDef;
    }

    private _theme: Theme = Theme.LIGHT;

    private get theme(){
        return this._theme;
    }

    private set theme(val){
        this._theme = val;
        this.classList.toggle('dark', this._theme === Theme.DARK);
    }

    private selectedTool: ToolType = null;

    render() {
        return template({selectedTool: this.selectedTool});
    }
}
