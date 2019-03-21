import {html, css, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import {ToolType} from '../tools/interfaces';

const selectedToolToHeader = (selectedTool: ToolType): string => {
    switch (selectedTool) {
        case ToolType.SETTINGS:
            return 'Settings';
        case ToolType.SEARCH:
            return 'Search';
        case ToolType.ITINERARY:
            return 'Itinerary';
        default:
            return '';
    }
};

export const template = ({isOpen, selectedTool}) => html`
        <div id="tool-container">
            <h2>${selectedToolToHeader(selectedTool)}</h2>
            <div id="tool-content">
                <slot name="upper-control"></slot>
                <slot name="lower-control"></slot>
            </div>
        </div>
        <citykleta-navigation-bar selected-tool="${selectedTool}"></citykleta-navigation-bar>`;

export const propDef = {
    selectedTool: {
        type: String
    }
};

export class AppDrawer extends LitElement {

    static get styles() {
        return css`
        :host{
           border-right: 1px solid var(--background-3);
           box-shadow: 1px 0 2px 0 var(--background-3);
           display: flex;
           height: 100%;
           position: absolute;
           transition: transform 0.4s;
           width: var(--toolbox-container-width, 400px); 
        }
        
        #tool-container{
            background: var(--background);
            border-right: 1px solid var(--background-2);
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }
        
        h2{
            background: var(--background-1);
            border-bottom: 1px solid var(--background-2);
            margin:0;
            padding: 0.5em;
        }
        
        #tool-content {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            justify-content: space-between;
            padding: 0 0.5em;
        }
        `;
    }

    static get properties() {
        return propDef;
    }

    private registry: ServiceRegistry;

    selectedTool: ToolType = null;

    constructor(registry: ServiceRegistry) {
        super();
        this.registry = registry;
    }

    render() {
        const props = {
            isOpen: this.selectedTool !== null,
            selectedTool: this.selectedTool
        };
        return template(props);
    }
}

